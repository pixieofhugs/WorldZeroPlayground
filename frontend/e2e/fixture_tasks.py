#!/usr/bin/env python
"""E2E-only task fixture: the six distinct tasks the collaboration suite needs.

Run by ``run-e2e.sh`` immediately after ``seed.py``, against the e2e database
only — it reads ``DATABASE_URL``, which that script has already pointed at
``worldzero_e2e``. ``.github/workflows/e2e.yml`` invokes the same script, so the
nightly gets this step without a second copy of the fixture living in the
workflow.

**Why this is here and not in backend/seed.py** (#2483): ``start.sh`` runs
``seed.py`` on EVERY production deploy, so anything it or the era config names
is restored the next deploy after an admin deletes it (#1398). ``ERA_1_TASKS``
is ``()`` for exactly that reason. These six titles are Playwright scaffolding,
not game content, and must never enter that path — so the fixture lives beside
the suite that needs it, and ``seed.py`` stays ignorant that a test suite exists.

**What needs them**: ``collaboration.spec.ts`` C4 proves that past FIVE pending
invites the oldest is still reachable (the requests inbox fetches at most 5), so
it raises six invites on six different tasks. Its ``pickTasks`` helper dedupes on
**title** and skips anything above ``level_required`` 8 — so six rows are only
six usable tasks when all six titles differ. A plain ``seed.py`` run leaves the
e2e database holding two tasks: the level-0 onboarding task and the duel fixture.

Level 0 stays reserved for the onboarding task (#904 — faction roster content
lives at levels 1-7), and ``pickOpenTask`` takes the *first* level-0 task, so
these sit at levels 1-6 and leave that choice untouched.

Idempotent and title-guarded, like every phase of ``seed.py``: the nightly runs
against a freshly reset database, but a local run may not.
"""

import asyncio
import os
import sys
from pathlib import Path

# The fixture lives with the suite; the models it writes live in the backend.
BACKEND_DIR = Path(__file__).resolve().parents[2] / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import distinct, func, select  # noqa: E402
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine  # noqa: E402

from faction_slugs import CROSS_FACTION_SLUG  # noqa: E402
from models.character import Character  # noqa: E402
from models.task import Task, TaskStatus, TaskType  # noqa: E402

# Six distinct titles at distinct levels, all <= 8 so the level-8 C4 inviter can
# attempt every one of them. Cross-faction like the onboarding task, and that is
# load-bearing: ``duel.helpers.ts::pickDuelTask`` takes the first task at or
# below the duel level that belongs to *some* faction, so wearing
# ``CROSS_FACTION_SLUG`` is exactly what keeps these from shadowing the duel
# fixture task. It used to be safe for a weaker reason — the duel helper matched
# the literal ``'ua'`` — which broke the moment an era stopped carrying UA
# (#2710); the sentinel these already wear is structurally required of every
# era, so the arrangement now holds for a reason that cannot expire.
FIXTURE_TASKS: tuple[tuple[str, str, int], ...] = (
    ("E2E fixture: Refill Something", "Fixture task for the e2e suite.", 1),
    ("E2E fixture: Walk a New Street", "Fixture task for the e2e suite.", 2),
    ("E2E fixture: Write One Postcard", "Fixture task for the e2e suite.", 3),
    ("E2E fixture: Mend a Small Thing", "Fixture task for the e2e suite.", 4),
    ("E2E fixture: Learn a Bird's Name", "Fixture task for the e2e suite.", 5),
    ("E2E fixture: Cook Without a Recipe", "Fixture task for the e2e suite.", 6),
)

# What C4's ``pickTasks`` demands of the database before the test can mean
# anything: this many distinct titles at or below this level.
REQUIRED_DISTINCT_TASKS = 6
MAX_LEVEL_REQUIRED = 8


async def main() -> None:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        sys.exit("ERROR: DATABASE_URL is not set — run this via frontend/e2e/run-e2e.sh.")

    engine = create_async_engine(database_url)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with session_factory() as session:
            # seed.py's Pixie is the lowest-id character; ``created_by`` is a
            # non-nullable FK and the fixture has no opinion about the author.
            created_by_id = (
                await session.execute(select(Character.id).order_by(Character.id).limit(1))
            ).scalars().first()
            if created_by_id is None:
                sys.exit("ERROR: no character in the e2e database — did seed.py run?")

            existing_titles = set(
                (await session.execute(select(Task.title))).scalars().all()
            )
            added = 0
            for title, description, level_required in FIXTURE_TASKS:
                if title in existing_titles:
                    continue
                session.add(Task(
                    title=title,
                    description=description,
                    point_value=10,
                    level_required=level_required,
                    status=TaskStatus.active,
                    task_type=TaskType.standard,
                    created_by=created_by_id,
                    primary_faction_slug=CROSS_FACTION_SLUG,
                ))
                added += 1
            await session.commit()

            # Fail here, at the fixture step, rather than 400 lines into a serial
            # spec file: C4's premise is a property of the database, so the
            # database step is where a missing premise should be reported.
            usable = (
                await session.execute(
                    select(func.count(distinct(Task.title))).where(
                        Task.status == TaskStatus.active,
                        Task.task_type == TaskType.standard,
                        Task.level_required <= MAX_LEVEL_REQUIRED,
                    )
                )
            ).scalar_one()
            if usable < REQUIRED_DISTINCT_TASKS:
                sys.exit(
                    f"ERROR: e2e fixture left {usable} distinct task title(s) at level "
                    f"<= {MAX_LEVEL_REQUIRED}; collaboration.spec.ts C4 needs "
                    f"{REQUIRED_DISTINCT_TASKS}."
                )

            print(f"==> e2e task fixture: +{added} added, {usable} usable distinct titles")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())

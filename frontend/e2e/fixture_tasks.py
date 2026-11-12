#!/usr/bin/env python
"""E2E-only fixture: six distinct tasks for collaboration.spec.ts C4.

Run by ``run-e2e.sh`` after ``seed.py``, against the e2e DB (``DATABASE_URL``).
Not in seed.py (#2483): that runs on every prod deploy and would restore these.
C4 dedupes on title and skips level > 8, so titles must differ. Levels 1-6:
level 0 is reserved for the onboarding task, which ``pickOpenTask`` takes.
Idempotent, title-guarded.
"""

import asyncio
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2] / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import distinct, func, select  # noqa: E402
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine  # noqa: E402

from faction_slugs import CROSS_FACTION_SLUG  # noqa: E402
from models.character import Character  # noqa: E402
from models.task import Task, TaskStatus, TaskType  # noqa: E402

# Cross-faction is load-bearing: the duel task picker takes the first
# faction-owned task, so these must not shadow the duel fixture (#2710).
FIXTURE_TASKS: tuple[tuple[str, str, int], ...] = (
    ("E2E fixture: Refill Something", "Fixture task for the e2e suite.", 1),
    ("E2E fixture: Walk a New Street", "Fixture task for the e2e suite.", 2),
    ("E2E fixture: Write One Postcard", "Fixture task for the e2e suite.", 3),
    ("E2E fixture: Mend a Small Thing", "Fixture task for the e2e suite.", 4),
    ("E2E fixture: Learn a Bird's Name", "Fixture task for the e2e suite.", 5),
    ("E2E fixture: Cook Without a Recipe", "Fixture task for the e2e suite.", 6),
)

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
            # ``created_by`` is a non-nullable FK; any character will do.
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

            # Fail here rather than deep in the serial spec.
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

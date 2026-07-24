"""
Seed script for World Zero — production bootstrap.

Prerequisites: run `alembic upgrade head` first.
Migrations handle schema. This script adds:
  - Factions (from the era config)
  - Era row
  - Pixie admin account + character + admin role
  - All live tasks (from the era config)

Run from /backend:
    python seed.py               # dev (default)
    python seed.py --env prod --yes
"""

import argparse
import asyncio
import sys

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from sqlalchemy import func, select, text

from game_config import CURRENT_ERA
from script_utils import add_env_argument, get_settings
from models.account import Account, OAuthProvider
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction, FactionStatus
from models.praxis import ModerationStatus, Praxis, PraxisMember, PraxisStatus, PraxisType
from models.roles import AccountRole, Role
from models.task import Task, TaskStatus, TaskType


# ---------------------------------------------------------------------------
# Faction status mapping
# ---------------------------------------------------------------------------
# System factions that should be hidden in the UI.
HIDDEN_FACTION_SLUGS = frozenset({"aged_out", "na"})


async def upsert_era_factions(session, era) -> int:
    """Give every faction in the era config a `Faction` row, and return how many
    were added.

    The `Faction` table is a thin display mirror of the era config — slug plus
    status, no rules (ADR-0038) — so this is idempotent and safe to run against
    an already-seeded database. That matters because factions are added between
    seeds: `Faction.slug` is a plain string primary key and `character.
    faction_slug` a plain string foreign key, so a new faction needs a row here
    and never an Alembic migration.
    """
    added = 0
    for slug in era.factions:
        existing = await session.execute(
            select(Faction).where(Faction.slug == slug)
        )
        if existing.scalar_one_or_none() is None:
            status = FactionStatus.hidden if slug in HIDDEN_FACTION_SLUGS else FactionStatus.visible
            # ADR-0038: the row is slug + status only; name/description prose
            # lives in frontend/src/locales/en/factions.json.
            session.add(Faction(slug=slug, status=status))
            added += 1
    await session.flush()
    return added


# ---------------------------------------------------------------------------
# Phase 2: Admin bootstrap (idempotent)
# ---------------------------------------------------------------------------

async def bootstrap_admin(session, era, pixie_acc) -> Character:
    """Ensure the Pixie admin account + character + admin role + Era row exist.

    Idempotent: when ``pixie_acc`` is already present this returns Pixie's
    existing character untouched; only a genuinely un-bootstrapped DB creates
    the account, OAuth link, Era row, admin role and starting CharacterStats.
    Returns Pixie's character (needed as ``created_by`` for seeded tasks).
    """
    if pixie_acc is not None:
        print("  >Pixie account already exists — skipping account/era/admin setup")
        return (await session.execute(
            select(Character).where(Character.account_id == pixie_acc.id).limit(1)
        )).scalar_one()

    print("  >Pixie account")
    pixie_acc = Account(email="pixieofhugs@gmail.com")
    session.add(pixie_acc)
    await session.flush()

    session.add(OAuthProvider(
        account_id=pixie_acc.id,
        provider="google",
        provider_user_id="google_pixie",
        access_token="seed_token",
    ))

    pixie_char = Character(
        account_id=pixie_acc.id,
        username="pixie",
        display_name="Pixie",
        bio="",
        faction_slug="ua",
    )
    session.add(pixie_char)
    await session.flush()

    print(f"  >{era.name}")
    era_row = Era(
        name=era.name,
        config_key=era.config_key,
        started_by=pixie_acc.id,
    )
    session.add(era_row)
    await session.flush()

    print("  >Admin role -> pixie")
    admin_role = Role(name="admin", description="Full administrative access")
    session.add(admin_role)
    await session.flush()

    session.add(AccountRole(
        account_id=pixie_acc.id,
        role_id=admin_role.id,
        granted_by=pixie_acc.id,
    ))

    session.add(CharacterStats(
        character_id=pixie_char.id,
        era_id=era_row.id,
        score=0,
        all_time_score=0,
        level=0,
        votes_spent_this_era=0,
    ))
    await session.flush()
    return pixie_char


# ---------------------------------------------------------------------------
# Phase 3: Tasks (from era config) — idempotent per-task sync
# ---------------------------------------------------------------------------

async def sync_era_tasks(session, era, created_by_id: int) -> int:
    """Add every era-config task that is not already in the database.

    Idempotent and — crucially — a genuine *sync*, not an all-or-nothing seed:
    it upserts per task (keyed on title) so that a task added to the era config
    after a database was first seeded actually reaches that database on the next
    seed run. The previous implementation only seeded tasks when the table was
    empty, so config task additions never propagated to any already-seeded
    environment (including production). Returns how many rows were added.
    """
    existing_titles = set(
        (await session.execute(select(Task.title))).scalars().all()
    )
    added = 0
    for task_def in era.tasks:
        if task_def.title in existing_titles:
            continue
        session.add(Task(
            title=task_def.title,
            description=task_def.description,
            point_value=task_def.point_value,
            level_required=task_def.level_required,
            status=TaskStatus.active,
            created_by=created_by_id,
            primary_faction_slug=task_def.faction_slug,
            is_task_vision_eligible=task_def.is_task_vision_eligible,
        ))
        added += 1
    await session.flush()
    return added


# ---------------------------------------------------------------------------
# Phase 4: Meta Tasks (placeholder) — idempotent
# ---------------------------------------------------------------------------

async def ensure_placeholder_metatask(session, created_by_id: int) -> bool:
    """Seed a single placeholder metatask so the UI has something to render.

    A metatask is a Task row with ``task_type=metatask`` (unified in migration
    0006, SESSION M). Guarded by a count check, so this is safe on a populated
    database. Returns True if the placeholder was created this run.
    """
    metatask_count = (
        await session.execute(
            select(func.count())
            .select_from(Task)
            .where(Task.task_type == TaskType.metatask)
        )
    ).scalar()
    if metatask_count:
        return False
    session.add(Task(
        title="Upside Down",
        description="Do this task upside down",
        point_value=100,
        level_required=0,
        status=TaskStatus.active,
        task_type=TaskType.metatask,
        created_by=created_by_id,
        primary_faction_slug="ua",
        metatask_faction_slug="ua",
    ))
    await session.flush()
    return True


# ---------------------------------------------------------------------------
# Dev-only demo content
# ---------------------------------------------------------------------------

async def seed_dev_demo(session) -> None:
    """Dev-only: guarantee the app is never empty on a fresh DB.

    Creates the `dev login (no OAuth)` character ("Molly", unaffiliated) with a
    live in-progress task so the redesigned sidebar renders fully the moment you
    dev-login — then delegates to scripts/seed_demo_praxes for cross-faction
    demo players and community-voted praxes. Idempotent. NEVER runs against prod.
    """
    dev_oauth = (await session.execute(
        select(OAuthProvider).where(
            OAuthProvider.provider == "dev",
            OAuthProvider.provider_user_id == "dev-user-1",
        )
    )).scalar_one_or_none()

    if dev_oauth is None:
        era_row = (await session.execute(select(Era).limit(1))).scalar_one()
        dev_acc = Account(email="dev@localhost")
        session.add(dev_acc)
        await session.flush()
        session.add(OAuthProvider(
            account_id=dev_acc.id,
            provider="dev",
            provider_user_id="dev-user-1",
            access_token="",
        ))
        molly = Character(
            account_id=dev_acc.id,
            username="dev",
            display_name="Molly",
            faction_slug="na",  # unaffiliated — everyone starts here (ADR-0030)
        )
        session.add(molly)
        await session.flush()
        session.add(CharacterStats(
            character_id=molly.id,
            era_id=era_row.id,
            score=0,
            all_time_score=0,
            level=0,
            votes_spent_this_era=0,
        ))
        dev_acc.active_character_id = molly.id

        # One in-progress signup so the sidebar "In Progress" panel isn't empty.
        task = (await session.execute(
            select(Task)
            .where(Task.task_type == TaskType.standard, Task.level_required == 0)
            .limit(1)
        )).scalar_one_or_none()
        if task is not None:
            praxis = Praxis(
                task_id=task.id,
                type=PraxisType.solo,
                status=PraxisStatus.in_progress,
                body_text="",
                created_by_id=molly.id,
                moderation_status=ModerationStatus.visible,
            )
            session.add(praxis)
            await session.flush()
            session.add(PraxisMember(
                praxis_id=praxis.id,
                character_id=molly.id,
                has_submitted=False,
            ))
        await session.flush()
        print("  >Dev-login character (@dev 'Molly', unaffiliated) + 1 in-progress task")
    else:
        print("  >Dev-login character already exists — skipping")

    # Cross-faction demo players + community-voted praxes (reused, idempotent).
    from scripts.seed_demo_praxes import seed as seed_demo_praxes
    await seed_demo_praxes(session)


# ---------------------------------------------------------------------------
# Main seed function
# ---------------------------------------------------------------------------

async def seed(env: str, yes: bool) -> None:
    era = CURRENT_ERA
    settings = get_settings(env)
    db_host = settings.DATABASE_URL.split("@")[-1]

    print(f"Environment : {env}")
    print(f"Database    : {db_host}")
    print(f"Era         : {era.name} ({era.config_key})\n")

    if env == "prod" and not yes:
        print("WARNING: You are about to seed a PRODUCTION database.")
        print(f"Target: {db_host}\n")
        answer = input("Type 'yes' to continue: ").strip()
        if answer != "yes":
            print("Aborted.")
            sys.exit(0)

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    async with async_session() as session:

        # Check what's already present
        pixie_result = await session.execute(
            select(Account).where(Account.email == "pixieofhugs@gmail.com")
        )
        pixie_acc = pixie_result.scalar_one_or_none()

        task_count = (await session.execute(select(func.count()).select_from(Task))).scalar()

        # Every phase below is idempotent (upsert / count-guard / per-task sync),
        # so a fully-seeded DB runs the exact same phases as an empty one — there
        # is no early-return shortcut. This matters because Phases 3 and 4 add
        # content that appears in the era config *after* the first seed (new
        # tasks, the placeholder metatask); an early return skipped them, so
        # config additions never reached any already-seeded environment,
        # including production (#905). Phase 1 was already hoisted for the same
        # reason (#784, Cozy Coven): the Faction table is a thin display mirror
        # of the era config, safe to top up and needing no migration.
        if pixie_acc and task_count > 0:
            print("Database already fully seeded — running idempotent top-up "
                  "(factions, admin, task sync, metatask).")
        else:
            print("Seeding World Zero...\n")

        # ------------------------------------------------------------------
        # Phase 1: Factions (from era config, upsert)
        # ------------------------------------------------------------------
        faction_count = await upsert_era_factions(session, era)
        if faction_count > 0:
            print(f"  >Factions ({faction_count} new)")
        else:
            print("  >Factions already exist — skipping")

        # ------------------------------------------------------------------
        # Phase 2: Admin bootstrap (Pixie account + character + era + role)
        # ------------------------------------------------------------------
        pixie_char = await bootstrap_admin(session, era, pixie_acc)

        # ------------------------------------------------------------------
        # Phase 3: Tasks (from era config) — idempotent per-task sync
        # ------------------------------------------------------------------
        new_tasks = await sync_era_tasks(session, era, pixie_char.id)
        if new_tasks > 0:
            print(f"  >Tasks ({new_tasks} new)")
        else:
            print(f"  >Tasks already exist ({task_count}) — skipping")

        # ------------------------------------------------------------------
        # Phase 4: Meta Tasks (placeholder) — idempotent
        # ------------------------------------------------------------------
        if await ensure_placeholder_metatask(session, pixie_char.id):
            print("  >Metatasks (1 placeholder)")
        else:
            print("  >Metatasks already exist — skipping")

        await session.commit()

        # Phase 5: Dev-only demo content (characters + praxes). Never in prod.
        if env == "dev":
            await seed_dev_demo(session)

        print("\nSeed complete!\n")
        print(f"  era            : {era.name} ({era.config_key})")
        print(f"  factions       : {len(era.factions)}")
        print(f"  pixie account  : pixieofhugs@gmail.com")
        print(f"  pixie character: @pixie (admin)")
        print(f"  tasks          : {len(era.tasks)}")

    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed the World Zero database.")
    add_env_argument(parser)
    parser.add_argument(
        "--yes", "-y",
        action="store_true",
        help="Skip confirmation prompt when targeting production.",
    )
    args = parser.parse_args()
    asyncio.run(seed(args.env, args.yes))

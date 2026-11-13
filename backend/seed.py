"""Production bootstrap (after `alembic upgrade head`): factions, Era row, admin,
era-config tasks, the onboarding task (#511).

Idempotent; `start.sh` runs it on EVERY deploy, which is why the era config owns
no tasks (an admin-deleted one would come back, #1398).
"""

import argparse
import asyncio
import sys

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from sqlalchemy import func, select

from faction_slugs import (
    CROSS_FACTION_SLUG,
    UNAFFILIATED_FACTION_SLUG,
    real_faction_slugs,
)
from game_config import CURRENT_ERA, EraConfig, era_config_for_key
from script_utils import add_env_argument, get_settings
from models.account import Account, AuthProvider, OAuthProvider
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction, FactionStatus
from models.praxis import ModerationStatus, Praxis, PraxisMember, PraxisStatus, PraxisType
from models.roles import AccountRole, Role
from models.task import Task, TaskStatus, TaskType


HIDDEN_FACTION_SLUGS = frozenset({"aged_out", UNAFFILIATED_FACTION_SLUG})


async def upsert_era_factions(session, era) -> tuple[int, int]:
    """Two-way mirror of the era's roster onto `Faction` (ADR-0087). Returns
    `(added, retired)`.

    Never deletes (FKs point at history). Retired is NOT `hidden`: `hidden`
    drops a faction's tasks from every listing. Slug + status only (ADR-0038),
    so a new faction needs no migration.
    """
    existing = {
        row.slug: row
        for row in (await session.execute(select(Faction))).scalars()
    }

    added = 0
    for slug in era.factions:
        status = (
            FactionStatus.hidden
            if slug in HIDDEN_FACTION_SLUGS
            else FactionStatus.visible
        )
        row = existing.get(slug)
        if row is None:
            session.add(Faction(slug=slug, status=status))
            added += 1
        elif row.status is FactionStatus.retired:
            row.status = status

    retired = 0
    for slug, row in existing.items():
        # `hidden` outranks the mirror, checked by slug and by status.
        if (
            slug in era.factions
            or slug in HIDDEN_FACTION_SLUGS
            or row.status is FactionStatus.hidden
        ):
            continue
        if row.status is not FactionStatus.retired:
            row.status = FactionStatus.retired
            retired += 1

    await session.flush()
    return added, retired


async def bootstrap_admin(session, era, pixie_acc) -> Character:
    """Ensure the Pixie admin account, character, role and Era row exist;
    returns Pixie's character (``created_by`` for seeded tasks)."""
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
        provider=AuthProvider.GOOGLE,
        provider_user_id="google_pixie",
    ))

    pixie_char = Character(
        account_id=pixie_acc.id,
        username="pixie",
        display_name="Pixie",
        bio="",
        # Born unaffiliated like everyone (ADR-0030, #1559).
        faction_slug=era.starting_faction_slug,
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


async def sync_era_tasks(session, era, created_by_id: int) -> int:
    """Per-task sync keyed on title, so later config additions reach seeded DBs.
    Returns rows added."""
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


# The single game-wide level-0 task (#511): not era content, seeded every run.
# Level 0 is reserved for it (#904). The seed key is its identity (#3064); the
# title is display copy only.
ONBOARDING_TASK_SEED_KEY = "onboarding_task"
ONBOARDING_TASK_TITLE = "Introduce Yourself"
ONBOARDING_TASK_DESCRIPTION = "Take a picture of your character. This need not be you"
# Cross-faction (#1619 B5) so it pays everyone the same under any era's
# modifiers. CROSS_FACTION_SLUG, not UNAFFILIATED (same value, not aliases).
ONBOARDING_TASK_FACTION_SLUG = CROSS_FACTION_SLUG
ONBOARDING_TASK_POINT_VALUE = 10


async def ensure_onboarding_task(session, created_by_id: int) -> bool:
    """Upsert the onboarding task by ``seed_key`` (unique: ``uq_task_seed_key``),
    so a player's same-titled task is invisible to it (#3064).

    Always syncs fields; returns True if created or corrected. ``status`` is set
    on create only, so an admin's retirement survives the next deploy.
    """
    existing = (
        await session.execute(
            select(Task).where(Task.seed_key == ONBOARDING_TASK_SEED_KEY)
        )
    ).scalar_one_or_none()

    if existing is None:
        session.add(Task(
            seed_key=ONBOARDING_TASK_SEED_KEY,
            title=ONBOARDING_TASK_TITLE,
            description=ONBOARDING_TASK_DESCRIPTION,
            point_value=ONBOARDING_TASK_POINT_VALUE,
            level_required=0,
            status=TaskStatus.active,
            task_type=TaskType.standard,
            created_by=created_by_id,
            primary_faction_slug=ONBOARDING_TASK_FACTION_SLUG,
        ))
        await session.flush()
        return True

    target = {
        "title": ONBOARDING_TASK_TITLE,
        "description": ONBOARDING_TASK_DESCRIPTION,
        "point_value": ONBOARDING_TASK_POINT_VALUE,
        "level_required": 0,
        "primary_faction_slug": ONBOARDING_TASK_FACTION_SLUG,
        # No "status" here — see the docstring above.
    }
    changed = False
    for field, value in target.items():
        if getattr(existing, field) != value:
            setattr(existing, field, value)
            changed = True
    if changed:
        await session.flush()
    return changed


# Dev-only: the duel e2e suite (frontend/e2e/duel.helpers.ts) needs a
# faction-skinned task at `era.duel_level_required` (#1676). Not in the era
# config (#1398). Seed key is identity, as for the onboarding task.
DUEL_FIXTURE_TASK_SEED_KEY = "duel_fixture_task"
DUEL_FIXTURE_TASK_TITLE = "Hold Your Breath and Count"
DUEL_FIXTURE_TASK_DESCRIPTION = (
    "Take one slow breath in, hold it, and count until you have to let go. "
    "Tell us the number — and what you were thinking about while you waited."
)
# Read off the era, never a literal (#2710); sentinels excluded (ADR-0087). A
# function, not a constant: import time precedes resolving the live era
# (ADR-0091), and a stale slug's retired Faction row would pass the guard.
def duel_fixture_task_faction_slug(era: EraConfig = CURRENT_ERA) -> str:
    """The first real faction of the era in hand."""
    return real_faction_slugs(era)[0]


DUEL_FIXTURE_TASK_POINT_VALUE = 10


async def ensure_duel_fixture_task(session, created_by_id: int) -> bool:
    """Dev-only: upsert the duel e2e fixture task, as ``ensure_onboarding_task``
    (status not synced). The ``faction is None`` guard stops a half-seeded DB
    pointing the task at nothing; on sync it only skips the faction field.
    """
    existing = (
        await session.execute(
            select(Task).where(Task.seed_key == DUEL_FIXTURE_TASK_SEED_KEY)
        )
    ).scalar_one_or_none()

    slug = duel_fixture_task_faction_slug()
    faction = (
        await session.execute(select(Faction).where(Faction.slug == slug))
    ).scalar_one_or_none()

    if existing is None:
        if faction is None:
            return False
        session.add(Task(
            seed_key=DUEL_FIXTURE_TASK_SEED_KEY,
            title=DUEL_FIXTURE_TASK_TITLE,
            description=DUEL_FIXTURE_TASK_DESCRIPTION,
            point_value=DUEL_FIXTURE_TASK_POINT_VALUE,
            level_required=CURRENT_ERA.duel_level_required,
            status=TaskStatus.active,
            task_type=TaskType.standard,
            created_by=created_by_id,
            primary_faction_slug=slug,
        ))
        await session.flush()
        return True

    target = {
        "title": DUEL_FIXTURE_TASK_TITLE,
        "description": DUEL_FIXTURE_TASK_DESCRIPTION,
        "point_value": DUEL_FIXTURE_TASK_POINT_VALUE,
        "level_required": CURRENT_ERA.duel_level_required,
        # No "status" here — see the docstring above.
    }
    if faction is not None:
        target["primary_faction_slug"] = slug
    changed = False
    for field, value in target.items():
        if getattr(existing, field) != value:
            setattr(existing, field, value)
            changed = True
    if changed:
        await session.flush()
    return changed


# Deliberately no metatask phase (#1398): seeded content can't be deleted.


async def seed_dev_demo(session, created_by_id: int) -> None:
    """Dev-only, idempotent: the dev-login character plus demo praxes."""
    dev_oauth = (await session.execute(
        select(OAuthProvider).where(
            OAuthProvider.provider == AuthProvider.DEV,
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
            provider=AuthProvider.DEV,
            provider_user_id="dev-user-1",
        ))
        molly = Character(
            account_id=dev_acc.id,
            username="dev",
            display_name="Molly",
            faction_slug=CURRENT_ERA.starting_faction_slug,
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

    # Outside the branch so seeded DBs get topped up; committed here because
    # seed_demo_praxes can return early without committing.
    if await ensure_duel_fixture_task(session, created_by_id):
        print(
            f"  >Duel e2e fixture task (1 {duel_fixture_task_faction_slug()} task "
            f"at the duel level)"
        )
    await session.commit()

    from scripts.seed_demo_praxes import seed as seed_demo_praxes
    await seed_demo_praxes(session)


async def stale_era_warning(session, era) -> str | None:
    """Warning when the live ``Era`` row names an unregistered ``config_key``
    (the game has fallen back to ``era``, the bound one; ADR-0091). None if fine."""
    live = (
        await session.execute(select(Era).order_by(Era.id.desc()).limit(1))
    ).scalar_one_or_none()
    if live is None:
        return (
            "\nWARNING: no Era row exists, so the game is running on the "
            f"compile-time era {era.config_key}.\n         Phase 2 opens the "
            "first row; if you see this after a successful seed, something "
            "rolled it back."
        )
    if era_config_for_key(live.config_key) is not None:
        return None
    return (
        f"\nWARNING: the live Era row (id={live.id}) names config_key "
        f"{live.config_key!r}, which no era file\n         registers. The game "
        f"has fallen back to {era.config_key} and is NOT playing by the rules "
        "that row\n         records. Restore the era file, or roll into a "
        "registered era from the admin page."
    )


async def seed(env: str, yes: bool) -> None:
    settings = get_settings(env)
    db_host = settings.DATABASE_URL.split("@")[-1]

    print(f"Environment : {env}")
    print(f"Database    : {db_host}")

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
        # The DB's live era (ADR-0091), else Phase 1's two-way mirror would undo
        # a mod's rollover every deploy. Local import: services.era imports seed.
        from services.era import rebind_live_era

        era = await rebind_live_era(session)
        print(f"Era         : {era.name} ({era.config_key})\n")

        pixie_result = await session.execute(
            select(Account).where(Account.email == "pixieofhugs@gmail.com")
        )
        pixie_acc = pixie_result.scalar_one_or_none()

        task_count = (await session.execute(select(func.count()).select_from(Task))).scalar()

        # No early return: every phase is idempotent and must top up seeded DBs (#905).
        if pixie_acc and task_count > 0:
            print("Database already fully seeded — running idempotent top-up "
                  "(factions, admin, task sync).")
        else:
            print("Seeding World Zero...\n")

        # Phase 1: factions
        faction_count, retired_count = await upsert_era_factions(session, era)
        if faction_count > 0:
            print(f"  >Factions ({faction_count} new)")
        else:
            print("  >Factions already exist — skipping")
        if retired_count > 0:
            print(f"  >Factions ({retired_count} retired — not in {era.config_key})")

        # Phase 2: admin bootstrap
        pixie_char = await bootstrap_admin(session, era, pixie_acc)

        # Phase 3: era-config tasks (none in Era 1, #1398)
        new_tasks = await sync_era_tasks(session, era, pixie_char.id)
        if new_tasks > 0:
            print(f"  >Tasks ({new_tasks} new from the era config)")
        else:
            print(f"  >No new era-config tasks ({task_count} already on the board)")

        # Phase 3b: onboarding task
        if await ensure_onboarding_task(session, pixie_char.id):
            print("  >Onboarding task (1 game-wide level-0, created or synced)")
        else:
            print("  >Onboarding task already up to date")

        await session.commit()

        # Phase 5: dev-only demo content
        if env == "dev":
            await seed_dev_demo(session, pixie_char.id)

        print("\nSeed complete!\n")
        print(f"  era            : {era.name} ({era.config_key})")
        print(f"  factions       : {len(era.factions)}")
        print(f"  pixie account  : pixieofhugs@gmail.com")
        print(f"  pixie character: @pixie (admin)")
        print(f"  era-config tasks: {len(era.tasks)} (Era 1 ships none — #1398)")

        warning = await stale_era_warning(session, era)
        if warning:
            print(warning)

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

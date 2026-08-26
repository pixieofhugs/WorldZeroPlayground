"""
Seed script for World Zero — production bootstrap.

Prerequisites: run `alembic upgrade head` first.
Migrations handle schema. This script adds:
  - Factions (from the era config)
  - Era row
  - Pixie admin account + character + admin role
  - Any tasks the era config declares (Era 1 declares none — #1398)
  - The single game-wide level-0 onboarding task (#511)

Every phase is idempotent, and `start.sh` runs this on EVERY production deploy.
That is why the era config owns no tasks: anything listed there is restored the
next deploy after an admin deletes it.

Run from /backend:
    python seed.py               # dev (default)
    python seed.py --env prod --yes
"""

import argparse
import asyncio
import sys

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from sqlalchemy import func, select

from faction_slugs import CROSS_FACTION_SLUG, UNAFFILIATED_FACTION_SLUG
from game_config import CURRENT_ERA
from script_utils import add_env_argument, get_settings
from models.account import Account, AuthProvider, OAuthProvider
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
HIDDEN_FACTION_SLUGS = frozenset({"aged_out", UNAFFILIATED_FACTION_SLUG})


async def upsert_era_factions(session, era) -> tuple[int, int]:
    """Mirror the live era's faction roster onto the `Faction` table.

    Two-way (ADR-0087, #2706): every slug the era lists gets a row, and every
    row the era does *not* list is marked `retired`. Returns
    `(added, retired)`.

    **Nothing is ever deleted.** `character.faction_slug` and
    `task.primary_faction_slug` are foreign keys onto this table, and a closed
    era's characters and tasks are the history those columns point at.

    Retiring is also **not** `hidden`. `hidden` is the system-row flag, and its
    one reader (`services.faction_service.hidden_faction_slugs`) drops that
    faction's tasks from every listing — so a retired faction flagged `hidden`
    would take its era's whole task archive off the site. Retirement removes a
    faction from the registry, not from the record.

    The `Faction` table is a thin display mirror of the era config — slug plus
    status, no rules (ADR-0038) — so this is idempotent and safe to run against
    an already-seeded database. That matters because factions are added between
    seeds: `Faction.slug` is a plain string primary key and `character.
    faction_slug` a plain string foreign key, so a new faction needs a row here
    and never an Alembic migration.
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
            # ADR-0038: the row is slug + status only; name/description prose
            # lives in frontend/src/locales/en/factions.json.
            session.add(Faction(slug=slug, status=status))
            added += 1
        elif row.status is FactionStatus.retired:
            # A later era listing a retired slug again brings its tile back.
            row.status = status

    retired = 0
    for slug, row in existing.items():
        # A system row is never a roster member, so it never retires: `hidden`
        # outranks the mirror. Tested both ways — by slug, so a system row the
        # era stops listing is still safe, and by status, so a row hidden for
        # some other reason does not have its tasks silently un-hidden here.
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
        provider=AuthProvider.GOOGLE,
        provider_user_id="google_pixie",
    ))

    pixie_char = Character(
        account_id=pixie_acc.id,
        username="pixie",
        display_name="Pixie",
        bio="",
        # Born unaffiliated like every other character (ADR-0019 / ADR-0030),
        # read from the era so the fixture cannot contradict the live default.
        # This said "ua" until #1559 — a bare literal with no reason attached,
        # which made a freshly seeded prod show the admin as UA · Level 0 and
        # made the site-wide default look broken on the most-used account.
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
# Phase 3b: Onboarding task (game-wide, era-independent) — idempotent
# ---------------------------------------------------------------------------

# The single game-wide level-0 task (#511). It is NOT era content — it lives in
# no `era_N.tasks` list — so it is seeded here on every run and exists in every
# era regardless of era config. Level 0 is reserved for this one task; every
# faction's roster content lives in levels 1-7 (#904).
ONBOARDING_TASK_TITLE = "Take a Picture of \"Yourself\""
ONBOARDING_TASK_DESCRIPTION = (
    "Point a camera at yourself — but the quotation marks are doing work. "
    "\"Yourself\" can be your face, or it can be the mug you can't start a "
    "morning without, the view from where you think, the shoes that have "
    "carried you, the desk that's unmistakably yours. Show us who you are. A "
    "literal selfie is allowed, but never required."
)
# Cross-faction, not Albescent (#1619 B5). It was Albescent by the owner's call
# and for good reasons that all still hold — signup is gated on level only
# (`meets_task_level`), never faction, so an unaffiliated player could always
# take it, and Albescent renders neutral/rainbow (#783/#794) so it *reads*
# neutral. What changed is that a second era makes a faction slug carry
# arithmetic it did not carry before: `compute_faction_multiplier` treats a task
# as own-faction only when its slug matches the character's or the task is
# cross-faction, so an Albescent task charged a brand-new `na` character
# `other_task_modifier`. In Era 1 that is 1.0 and nothing happens; at 0.8 the
# first act of an era pays a newcomer 8 points instead of 10 for not having a
# faction yet, on what may be the only task on the board. Cross-faction keeps
# every property the original call wanted and adds era-independence: it pays the
# same to everyone, in every era, whatever the modifiers are.
#
# CROSS_FACTION_SLUG, not UNAFFILIATED_FACTION_SLUG — they share the value "na"
# and are not aliases (see faction_slugs). This is a task belonging to no
# faction, not a player who has joined none.
ONBOARDING_TASK_FACTION_SLUG = CROSS_FACTION_SLUG
ONBOARDING_TASK_POINT_VALUE = 10


async def ensure_onboarding_task(session, created_by_id: int) -> bool:
    """Upsert the single game-wide level-0 onboarding task (keyed on title).

    This runs on every seed so the onboarding self-portrait exists in every era,
    independent of era config (#511). Guarded by a title lookup, so it is safe on
    a populated database. Returns True if the task was created this run.

    It is now the **only** task any seed run creates: Era 1's config task list is
    empty (see ``eras/era_1.py``) and the Phase-4 placeholder metatask is gone
    (#1398). That is deliberate — everything else on the board is authored in the
    admin UI — but this one stays, because it is what a brand-new player has to
    do on the day they arrive.
    """
    existing = (
        await session.execute(
            select(Task).where(Task.title == ONBOARDING_TASK_TITLE)
        )
    ).scalar_one_or_none()
    if existing is not None:
        return False
    session.add(Task(
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


# ---------------------------------------------------------------------------
# Dev-only e2e fixture task
# ---------------------------------------------------------------------------
# The duel e2e suite (frontend/e2e/duel.helpers.ts) needs a task that is BOTH
# faction-skinned and reachable at `era.duel_level_required`, so the duel flow
# drives a real archetype (UaEditPraxis / UaDuelSealConfirm / UaPraxisDetail)
# instead of only the Default skins. Era 1 seeds no such task — ERA_1_TASKS is
# empty by design and the onboarding task above is cross-faction — so the duel
# specs have failed on every nightly they ever ran (#1676).
#
# Dev-only, and deliberately NOT in the era config: #1398's ruling is that the
# board is admin-authored, and anything named in the era config comes back the
# deploy after an admin deletes it. This is created from `seed_dev_demo`, which
# never runs against production, so that ruling is untouched.
DUEL_FIXTURE_TASK_TITLE = "Hold Your Breath and Count"
DUEL_FIXTURE_TASK_DESCRIPTION = (
    "Take one slow breath in, hold it, and count until you have to let go. "
    "Tell us the number — and what you were thinking about while you waited."
)
DUEL_FIXTURE_TASK_FACTION_SLUG = "ua"
DUEL_FIXTURE_TASK_POINT_VALUE = 10


async def ensure_duel_fixture_task(session, created_by_id: int) -> bool:
    """Dev-only: upsert the faction-skinned task the duel e2e fixture picks.

    Title-guarded like ``ensure_onboarding_task``, so it is safe to re-run.
    Returns True if the task was created this run.

    `level_required` reads ``era.duel_level_required`` rather than repeating the
    number: the fixture's whole point is a task a duelling character can sign up
    for, so the two must move together.

    The faction slug is a literal because it names a *fixture*, not a rule — the
    e2e suite asks for UA's archetype by name. A future era need not carry that
    faction, so this no-ops when the row is absent rather than writing a Task
    whose ``primary_faction_slug`` points at nothing.
    """
    existing = (
        await session.execute(
            select(Task).where(Task.title == DUEL_FIXTURE_TASK_TITLE)
        )
    ).scalar_one_or_none()
    if existing is not None:
        return False

    faction = (
        await session.execute(
            select(Faction).where(Faction.slug == DUEL_FIXTURE_TASK_FACTION_SLUG)
        )
    ).scalar_one_or_none()
    if faction is None:
        return False

    session.add(Task(
        title=DUEL_FIXTURE_TASK_TITLE,
        description=DUEL_FIXTURE_TASK_DESCRIPTION,
        point_value=DUEL_FIXTURE_TASK_POINT_VALUE,
        level_required=CURRENT_ERA.duel_level_required,
        status=TaskStatus.active,
        task_type=TaskType.standard,
        created_by=created_by_id,
        primary_faction_slug=DUEL_FIXTURE_TASK_FACTION_SLUG,
    ))
    await session.flush()
    return True


# There is deliberately no metatask phase (#1398). A "placeholder" metatask
# ("Upside Down") used to be seeded here so the metatask surface had something
# to render; it was invented content that appeared on production every deploy
# and could not be permanently deleted, because the seeder recreated it whenever
# the metatask count hit zero. The surface now renders empty until an admin
# authors a real metatask, which is the correct empty state.


# ---------------------------------------------------------------------------
# Dev-only demo content
# ---------------------------------------------------------------------------

async def seed_dev_demo(session, created_by_id: int) -> None:
    """Dev-only: guarantee the app is never empty on a fresh DB.

    Creates the `dev login (no OAuth)` character ("Molly", unaffiliated) with a
    live in-progress task so the redesigned sidebar renders fully the moment you
    dev-login — then delegates to scripts/seed_demo_praxes for cross-faction
    demo players and community-voted praxes. Idempotent. NEVER runs against prod.
    """
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
            # unaffiliated — everyone starts here (ADR-0030), read from the era
            # so the fixture tracks era.starting_faction_slug (#1559).
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

    # The duel e2e fixture's task. Outside the branch above so it is topped up on
    # an already-seeded dev database, not only on a fresh one.
    #
    # Committed here rather than left to `seed_demo_praxes` below: that function
    # has several early returns that skip its own commit on an already-seeded
    # database, which is exactly the case where this top-up matters.
    if await ensure_duel_fixture_task(session, created_by_id):
        print("  >Duel e2e fixture task (1 UA task at the duel level)")
    await session.commit()

    # Cross-faction demo players + community-voted praxes (reused, idempotent).
    from scripts.seed_demo_praxes import seed as seed_demo_praxes
    await seed_demo_praxes(session)


# ---------------------------------------------------------------------------
# Deploy-window warning: configured era vs. the era row that is actually live
# ---------------------------------------------------------------------------

async def stale_era_warning(session, era) -> str | None:
    """What to tell the operator when the configured era has no Era row yet.

    The seeder does not open an era for an unseen ``config_key`` — the rollover
    does, because it is what stamps ``Era.started_by``. So a deploy that flips
    ``CURRENT_ERA`` forward leaves the app running the new rules against the old
    row, and since #2705 it does that *quietly*: the live era is the latest row
    whatever its key, which is what keeps the rollover runnable instead of
    500ing every character-stats read. This is where the noise went. ``start.sh``
    runs the seeder on every deploy, so it lands in front of the one person who
    can act on it.

    Returns None when the live row already matches; the caller prints.
    """
    live = (
        await session.execute(select(Era).order_by(Era.id.desc()).limit(1))
    ).scalar_one_or_none()
    if live is not None and live.config_key == era.config_key:
        return None
    live_key = live.config_key if live is not None else "absent"
    return (
        f"\nWARNING: {era.config_key} is configured but the live Era row is "
        f"{live_key}.\n         Run scripts/era_reset.py to open it."
    )


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

        # Every phase below is idempotent (upsert / title-guard / per-task sync),
        # so a fully-seeded DB runs the exact same phases as an empty one — there
        # is no early-return shortcut. This matters because Phase 3 adds content
        # that appears in the era config *after* the first seed; an early return
        # skipped it, so config additions never reached any already-seeded
        # environment, including production (#905). Phase 1 was hoisted for the
        # same reason (#784, Cozy Coven): the Faction table is a thin display
        # mirror of the era config, safe to top up and needing no migration.
        #
        # The flip side of that sync, and why Era 1's task list is empty (#1398):
        # this script runs on every deploy (``start.sh``), so any task named in
        # the era config comes back the deploy after an admin deletes it.
        if pixie_acc and task_count > 0:
            print("Database already fully seeded — running idempotent top-up "
                  "(factions, admin, task sync).")
        else:
            print("Seeding World Zero...\n")

        # ------------------------------------------------------------------
        # Phase 1: Factions (from era config, upsert)
        # ------------------------------------------------------------------
        faction_count, retired_count = await upsert_era_factions(session, era)
        if faction_count > 0:
            print(f"  >Factions ({faction_count} new)")
        else:
            print("  >Factions already exist — skipping")
        if retired_count > 0:
            # The rollover deploy's one visible sign that the roster shrank
            # (ADR-0087). Rows are retired, never deleted.
            print(f"  >Factions ({retired_count} retired — not in {era.config_key})")

        # ------------------------------------------------------------------
        # Phase 2: Admin bootstrap (Pixie account + character + era + role)
        # ------------------------------------------------------------------
        pixie_char = await bootstrap_admin(session, era, pixie_acc)

        # ------------------------------------------------------------------
        # Phase 3: Tasks (from era config) — idempotent per-task sync
        # ------------------------------------------------------------------
        # Era 1's list is empty on purpose (#1398), so this is a no-op today;
        # the phase stays because a future era may ship a config-owned roster.
        new_tasks = await sync_era_tasks(session, era, pixie_char.id)
        if new_tasks > 0:
            print(f"  >Tasks ({new_tasks} new from the era config)")
        else:
            print(f"  >No new era-config tasks ({task_count} already on the board)")

        # ------------------------------------------------------------------
        # Phase 3b: Onboarding task (game-wide level-0, era-independent)
        # ------------------------------------------------------------------
        if await ensure_onboarding_task(session, pixie_char.id):
            print("  >Onboarding task (1 game-wide level-0)")
        else:
            print("  >Onboarding task already exists — skipping")

        await session.commit()

        # Phase 5: Dev-only demo content (characters + praxes). Never in prod.
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

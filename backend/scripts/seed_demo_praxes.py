"""
Seed demo praxes — one submitted, community-voted praxis per faction, authored
by real demo Characters, so the per-faction praxis cards render with genuine
scores for local testing.

Idempotent: re-running creates only what's missing (keyed on demo usernames and
a per-faction title marker). Dev DB only — these are throwaway test rows; remove
with `scripts/seed_demo_praxes.py --remove`.

    backend/.venv/Scripts/python scripts/seed_demo_praxes.py
    backend/.venv/Scripts/python scripts/seed_demo_praxes.py --remove
"""
import argparse
import asyncio
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from game_config import CURRENT_ERA, EraConfig
from script_utils import get_settings
from models.account import Account, AuthProvider, OAuthProvider
from models.character import Character
from models.character_stats import CharacterStats
from models.duel import Duel, DuelStatus
from models.era import Era
from models.meta_task import PraxisMetaTask
from models.task import Task, TaskStatus, TaskType
from models.praxis import ModerationStatus, Praxis, PraxisMember, PraxisStatus, PraxisType
from models.vote import Vote

TITLE_MARKER = "[demo] "

# Real demo players: distinct accounts (anti-self-voting is per-account, so
# cross-votes need separate accounts). username, display_name, faction_slug.
PLAYERS = [
    ("demo_quill", "Quill", "ua"),
    ("demo_sol", "Sol Brennan", "everymen"),
    ("demo_marigold", "Marigold", "wow"),
    ("demo_riot", "Riot", "snide"),
    ("demo_vesper", "Vesper", "ephemerists"),
    ("demo_unit", "UNIT-7", "singularity"),
    ("demo_almanac", "Almanac Okonkwo", "ephemerists"),  # extra collaborator
    # Appended, not inserted: the DEMOS loop and the metatask fixture both take
    # the FIRST n non-member players as voters, so anything added here must go on
    # the end to leave the existing fixtures' vote tallies untouched.
    ("demo_kettle", "Kettle", "coven"),      # collab fixture, both sides Coven
    ("demo_thimble", "Thimble", "coven"),
]

# faction -> (author_username, title, body, type, [stars from other players])
DEMOS = {
    "ua": ("demo_quill", "Mapped the unmarked stair",
           "Walked every floor until the numbering stopped making sense, then drew it.",
           PraxisType.solo, [4, 5, 3]),
    "everymen": ("demo_sol", "Hit the bench. Then hit it again",
               "Same task, second time through — put my own oxygen mask on first.",
               PraxisType.solo, [5, 5, 4]),
    "wow": ("demo_marigold", "Threw a stranger a parade",
                "Confetti, a kazoo, one very confused commuter. The bus stop will never recover.",
                PraxisType.solo, [5, 4, 5]),
    "snide": ("demo_riot", "Flyposted the quiet block",
              "Stuck it where they said not to. Allegedly.",
              PraxisType.solo, [3, 4, 2]),
    "ephemerists": ("demo_vesper", "Traced a myth to its road",
                   "Followed the old account to the actual coordinates. It was there.",
                   PraxisType.solo, [5, 4, 5]),
    "singularity": ("demo_unit", "Logged the signal at 0300",
                    "Clean capture. Consensus pending. The noise floor held.",
                    PraxisType.solo, [4, 3, 4]),
}

# DEMOS is all-solo on purpose: one praxis per faction so every per-faction
# praxis card archetype has something to render. The collab case is not missing,
# it is just seeded separately (COLLAB_* / seed_collab_fixture below) because it
# exists to exercise a multiplier rather than a card archetype.


# ---------------------------------------------------------------------------
# Score-breakdown fixtures (#891)
# ---------------------------------------------------------------------------
# Without these, `praxis_meta_task` is empty and every reachable Era 1
# multiplier is 1.0, so the metatask row and the `{base} x {mult}` row of the
# score breakdown are both permanently hidden in dev — a correct scoring
# implementation and a broken one render identically. These rows make both
# visible. Fixture content only: nothing here changes scoring semantics, and
# every *rule* (levels, modifiers) is read off `era.*`.

# The metatask itself. `point_value` is fixture content, not a rule — a
# metatask is a plain Task row and no metatask lives in the era config.
# Since #1398 this is the ONLY metatask any seeding path creates: seed.py's
# Phase-4 placeholder ("Upside Down") is gone, and it was prod content applied
# to nothing. This one is dev-only fixture content, and it is applied.
METATASK_TITLE = TITLE_MARKER + "Do It Backwards"
METATASK_DESCRIPTION = "Run the whole task in reverse order. Photographic proof or it didn't happen."
METATASK_POINTS = 100
# Whose level-N members may APPLY it (era.metatask_apply_level gates the level
# axis; faction_permits gates this one). Matches the metatask owner below.
METATASK_FACTION_SLUG = "ua"

# The metatask owner: a dev-login-able account so the apply flow is one call
# away. Reuses the `POST /auth/dev-login?key=<KEY>` seam (routers/auth.py) —
# same provider/provider_user_id/email shape, so dev-login adopts this
# character instead of minting a second one.
METATASK_PLAYER_KEY = "meta"
METATASK_PLAYER = ("demo_meta", "Metamancer", METATASK_FACTION_SLUG)
METATASK_PRAXIS_TITLE = TITLE_MARKER + "Shelved the whole aisle backwards"
METATASK_PRAXIS_BODY = (
    "Same task, inverted. The metatask bonus is the flat row above the multiplier."
)
METATASK_PRAXIS_STARS = [5, 4, 4]
# A second, still-open praxis so the apply flow itself can be exercised in the
# composer (apply_metatask requires an in_progress praxis).
METATASK_OPEN_PRAXIS_TITLE = TITLE_MARKER + "Open: apply a metatask to me"

# The duel pair. Snide is deliberately the LOSING side: Era 1 gives Snide
# duel_loss_modifier 0.0, the only x0.0 in the game and the one multiplier that
# has never rendered. The winner takes their own faction's duel_win_modifier.
# Both sides share one task so the faction multiplier is identical on each and
# the duel modifier is the only thing that differs.
# Both sides also carry the demo metatask (#2633): x0.0 on the base is the only
# place a flat metatask and a multiplied one produce different numbers, so this
# pair is what makes ADR-0086 visible in dev instead of arithmetically silent.
DUEL_TASK_FACTION_SLUG = "snide"
DUEL_LOSER_USERNAME = "demo_riot"        # snide — challenger, loses -> x0.0
DUEL_WINNER_USERNAME = "demo_sol"        # everymen — opponent, wins -> x1.5
DUEL_LOSER_TITLE = TITLE_MARKER + "Duel: did it louder"
DUEL_LOSER_BODY = "Went first, went loud. The room did not agree."
DUEL_WINNER_TITLE = TITLE_MARKER + "Duel: did it better"
DUEL_WINNER_BODY = "Answered the challenge. Took the room."
# Unequal on purpose — the duel winner is decided on points_from_votes.
DUEL_LOSER_STARS = [("demo_quill", 1), ("demo_marigold", 2)]
DUEL_WINNER_STARS = [("demo_vesper", 5), ("demo_unit", 5), ("demo_almanac", 4)]

# The collab pair. Coven is the only faction in Era 1 with a non-1.0
# collaboration modifier (era.factions["coven"].collab_own_modifier), and it is
# also the only Era 1 multiplier that is neither a duel modifier nor a whole
# number — so it is the one place the score arithmetic can round wrong, and
# until now the one case with no fixture. Own-faction means the TASK's faction
# matches the scoring character's (services/scoring.compute_faction_multiplier),
# so both members are Coven doing a Coven task: whichever member's card you open
# shows the modifier. The value itself is never written here — it is read off the
# era at render time.
COLLAB_TASK_FACTION_SLUG = "coven"
COLLAB_AUTHOR_USERNAME = "demo_kettle"
COLLAB_SECOND_USERNAME = "demo_thimble"
COLLAB_TITLE = TITLE_MARKER + "Collab: proofed the dough in shifts"
COLLAB_BODY = (
    "Two of us, one Coven task, one long rise. The multiplier row is the "
    "own-faction collaboration bonus."
)
COLLAB_STARS = [("demo_quill", 5), ("demo_vesper", 4), ("demo_unit", 4)]


async def _praxis_exists(session, title: str) -> bool:
    count = (
        await session.execute(
            select(func.count()).select_from(Praxis).where(Praxis.title == title)
        )
    ).scalar()
    return bool(count)


async def _pick_task(session, faction_slug: str) -> Task | None:
    """Lowest-level active standard task for a faction, or None."""
    return (
        await session.execute(
            select(Task)
            .where(
                Task.primary_faction_slug == faction_slug,
                Task.task_type == TaskType.standard,
            )
            .order_by(Task.level_required, Task.id)
            .limit(1)
        )
    ).scalar_one_or_none()


async def get_or_create_metatask_owner(
    session, era: EraConfig = CURRENT_ERA
) -> Character:
    """The metatask owner, at ``era.metatask_apply_level``, reachable by dev-login."""
    username, display_name, faction_slug = METATASK_PLAYER
    existing = (
        await session.execute(select(Character).where(Character.username == username))
    ).scalar_one_or_none()

    if existing is None:
        account = Account(email=f"dev-{METATASK_PLAYER_KEY}@localhost")
        session.add(account)
        await session.flush()
        # Same shape routers/auth.dev_login derives from `key`, so
        # `?key=meta` logs straight into this character.
        session.add(OAuthProvider(
            account_id=account.id,
            provider=AuthProvider.DEV,
            provider_user_id=f"dev-{METATASK_PLAYER_KEY}",
        ))
        existing = Character(
            account_id=account.id,
            username=username,
            display_name=display_name,
            faction_slug=faction_slug,
        )
        session.add(existing)
        await session.flush()
        account.active_character_id = existing.id

    # Level is a rule: read the gate off the era, never hardcode it.
    level = era.metatask_apply_level
    score = (
        era.level_thresholds[level]
        if level < len(era.level_thresholds)
        else era.level_thresholds[-1]
    )
    era_row = (await session.execute(select(Era).limit(1))).scalar_one()
    stats = (
        await session.execute(
            select(CharacterStats).where(
                CharacterStats.character_id == existing.id,
                CharacterStats.era_id == era_row.id,
            )
        )
    ).scalar_one_or_none()
    if stats is None:
        session.add(CharacterStats(
            character_id=existing.id,
            era_id=era_row.id,
            score=score,
            all_time_score=score,
            level=level,
            votes_spent_this_era=0,
        ))
    else:
        stats.level = level
        stats.score = max(stats.score, score)
        stats.all_time_score = max(stats.all_time_score, stats.score)
    await session.flush()
    return existing


async def get_or_create_metatask(session, created_by: Character) -> Task:
    """The one demo metatask (Task row with ``task_type=metatask``)."""
    existing = (
        await session.execute(select(Task).where(Task.title == METATASK_TITLE))
    ).scalar_one_or_none()
    if existing is not None:
        return existing
    task = Task(
        title=METATASK_TITLE,
        description=METATASK_DESCRIPTION,
        point_value=METATASK_POINTS,
        # level_required 0 on purpose: this is the gate on *seeing the bonus
        # scored* (services/meta_task.py skips a metatask above the viewer's
        # level), so keeping it at 0 means every viewer sees the metatask row
        # render. Applying one is still gated by era.metatask_apply_level.
        level_required=0,
        status=TaskStatus.active,
        task_type=TaskType.metatask,
        created_by=created_by.id,
        primary_faction_slug=METATASK_FACTION_SLUG,
        metatask_faction_slug=METATASK_FACTION_SLUG,
    )
    session.add(task)
    await session.flush()
    return task


async def seed_metatask_fixture(
    session, players: dict[str, Character], era: EraConfig = CURRENT_ERA
) -> Task:
    """A metatask, a submitted praxis carrying it, and an open praxis to apply it to.

    Returns the metatask ``Task`` so the duel fixture can hang it on both sides
    (#2633) — the metatask row is only interesting beside a non-1.0 multiplier.
    """
    owner = await get_or_create_metatask_owner(session, era)
    metatask = await get_or_create_metatask(session, owner)

    task = await _pick_task(session, METATASK_FACTION_SLUG)
    if task is None:
        print(f"  ! metatask: no {METATASK_FACTION_SLUG} task on the board — skipped")
        return metatask

    if await _praxis_exists(session, METATASK_PRAXIS_TITLE):
        print("  = metatask praxis already present — skipped")
    else:
        now = datetime.now(timezone.utc)
        praxis = Praxis(
            task_id=task.id,
            type=PraxisType.solo,
            status=PraxisStatus.submitted,
            title=METATASK_PRAXIS_TITLE,
            body_text=METATASK_PRAXIS_BODY,
            created_by_id=owner.id,
            moderation_status=ModerationStatus.visible,
            submitted_at=now,
        )
        session.add(praxis)
        await session.flush()
        session.add(PraxisMember(
            praxis_id=praxis.id, character_id=owner.id, has_submitted=True
        ))
        session.add(PraxisMetaTask(praxis_id=praxis.id, task_id=metatask.id))
        voters = [c for c in players.values() if c.account_id != owner.account_id]
        for voter, star in zip(voters, METATASK_PRAXIS_STARS):
            session.add(Vote(
                praxis_id=praxis.id,
                voter_character_id=voter.id,
                voter_account_id=voter.account_id,
                value=star,
            ))
        print(
            f"  + metatask '{METATASK_TITLE}' (+{METATASK_POINTS}) on "
            f"'{METATASK_PRAXIS_TITLE}' by {owner.display_name}"
        )

    if await _praxis_exists(session, METATASK_OPEN_PRAXIS_TITLE):
        print("  = metatask apply-flow praxis already present — skipped")
    else:
        open_praxis = Praxis(
            task_id=task.id,
            type=PraxisType.solo,
            status=PraxisStatus.in_progress,
            title=METATASK_OPEN_PRAXIS_TITLE,
            body_text="",
            created_by_id=owner.id,
            moderation_status=ModerationStatus.visible,
        )
        session.add(open_praxis)
        await session.flush()
        session.add(PraxisMember(
            praxis_id=open_praxis.id, character_id=owner.id, has_submitted=False
        ))
        print(f"  + in-progress praxis for the apply flow by {owner.display_name}")
    await session.flush()
    return metatask


async def seed_duel_fixture(
    session, players: dict[str, Character], metatask: Optional[Task] = None
) -> None:
    """One settled duel with unequal tallies, so both duel modifiers render.

    ``metatask`` is attached to BOTH sides (#2633). Under ADR-0086 a metatask is
    flat, so the losing Snide side at x0.0 must still score the metatask's points
    while its base goes to zero — the one arrangement where the old formula and
    the new one render differently. Without it a regression is invisible in dev.
    """
    if await _praxis_exists(session, DUEL_LOSER_TITLE):
        print("  = duel pair already present — skipped")
        return

    task = await _pick_task(session, DUEL_TASK_FACTION_SLUG)
    if task is None:
        print(f"  ! duel: no {DUEL_TASK_FACTION_SLUG} task on the board — skipped")
        return

    loser = players[DUEL_LOSER_USERNAME]
    winner = players[DUEL_WINNER_USERNAME]
    now = datetime.now(timezone.utc)

    sides: dict[str, Praxis] = {}
    for author, title, body in (
        (loser, DUEL_LOSER_TITLE, DUEL_LOSER_BODY),
        (winner, DUEL_WINNER_TITLE, DUEL_WINNER_BODY),
    ):
        # Duel sides are PraxisType.solo (services/duel.py) — the duel link
        # lives on the Duel row, not on the praxis type.
        praxis = Praxis(
            task_id=task.id,
            type=PraxisType.solo,
            status=PraxisStatus.submitted,
            title=title,
            body_text=body,
            created_by_id=author.id,
            moderation_status=ModerationStatus.visible,
            submitted_at=now,
        )
        session.add(praxis)
        await session.flush()
        session.add(PraxisMember(
            praxis_id=praxis.id, character_id=author.id, has_submitted=True
        ))
        if metatask is not None:
            session.add(PraxisMetaTask(praxis_id=praxis.id, task_id=metatask.id))
        sides[title] = praxis

    for title, stars in ((DUEL_LOSER_TITLE, DUEL_LOSER_STARS),
                         (DUEL_WINNER_TITLE, DUEL_WINNER_STARS)):
        for voter_username, star in stars:
            voter = players[voter_username]
            session.add(Vote(
                praxis_id=sides[title].id,
                voter_character_id=voter.id,
                voter_account_id=voter.account_id,
                value=star,
            ))

    # `settled` = both sides submitted, voting open (models/duel.py). The
    # winner is derived live from the tallies until era close, so a settled
    # duel with a lead is what makes the modifier non-1.0 today.
    session.add(Duel(
        task_id=task.id,
        challenger_praxis_id=sides[DUEL_LOSER_TITLE].id,
        opponent_character_id=winner.id,
        opponent_praxis_id=sides[DUEL_WINNER_TITLE].id,
        status=DuelStatus.settled,
        accepted_at=now,
    ))
    await session.flush()
    print(
        f"  + duel: {loser.display_name} ({loser.faction_slug}) loses to "
        f"{winner.display_name} ({winner.faction_slug})"
    )


async def seed_collab_fixture(session, players: dict[str, Character]) -> None:
    """One submitted own-faction collab, so the collaboration modifier renders.

    Both members are Coven on a Coven task, which is what makes the multiplier
    ``collab_own_modifier`` rather than ``collab_other_modifier``. Two members is
    not decoration: a collab that drops to one member is converted back to solo
    (ADR-0060), which would take the modifier with it.
    """
    if await _praxis_exists(session, COLLAB_TITLE):
        print("  = collab praxis already present — skipped")
        return

    # Same contract as the metatask and duel fixtures: ERA_1_TASKS is empty by
    # design (the board lives only in the DB, see eras/era_1.py), so this fixture
    # renders only on a database whose board actually has a Coven task. Never
    # create one here — that would put a task in a code path the era config
    # deliberately refuses to own.
    task = await _pick_task(session, COLLAB_TASK_FACTION_SLUG)
    if task is None:
        print(
            f"  ! collab: no {COLLAB_TASK_FACTION_SLUG} task on the board — skipped "
            f"(import a board first; the collab modifier stays invisible until then)"
        )
        return

    author = players[COLLAB_AUTHOR_USERNAME]
    second = players[COLLAB_SECOND_USERNAME]
    now = datetime.now(timezone.utc)

    praxis = Praxis(
        task_id=task.id,
        type=PraxisType.collab,
        status=PraxisStatus.submitted,
        title=COLLAB_TITLE,
        body_text=COLLAB_BODY,
        created_by_id=author.id,
        moderation_status=ModerationStatus.visible,
        submitted_at=now,
    )
    session.add(praxis)
    await session.flush()
    # `submitted` means every member submitted (a partial collab is `pending`).
    for member in (author, second):
        session.add(PraxisMember(
            praxis_id=praxis.id, character_id=member.id, has_submitted=True
        ))

    member_account_ids = {author.account_id, second.account_id}
    for voter_username, star in COLLAB_STARS:
        voter = players[voter_username]
        # Anti-self-voting is per ACCOUNT, not per character (ADR-0041).
        if voter.account_id in member_account_ids:
            continue
        session.add(Vote(
            praxis_id=praxis.id,
            voter_character_id=voter.id,
            voter_account_id=voter.account_id,
            value=star,
        ))
    await session.flush()
    print(
        f"  + collab: '{COLLAB_TITLE}' by {author.display_name} + "
        f"{second.display_name} on a {COLLAB_TASK_FACTION_SLUG} task"
    )


async def seed_score_fixtures(
    session, players: dict[str, Character], era: EraConfig = CURRENT_ERA
) -> None:
    """Everything #891 asks for: a metatask in use and every non-1.0 multiplier."""
    metatask = await seed_metatask_fixture(session, players, era)
    await seed_duel_fixture(session, players, metatask)
    await seed_collab_fixture(session, players)


def print_login_recipe(era: EraConfig = CURRENT_ERA) -> None:
    _, display_name, faction_slug = METATASK_PLAYER
    # ASCII only: this prints to a cp1252 console on Windows.
    print("\nScore-breakdown fixtures (#891) - log in as the metatask owner:")
    print(
        f"  curl -X POST 'http://localhost:8000/auth/dev-login"
        f"?key={METATASK_PLAYER_KEY}'"
    )
    print(
        f"  -> {display_name} ({faction_slug}), level {era.metatask_apply_level} "
        f"(era.metatask_apply_level)"
    )
    print(f"  metatask row  : '{METATASK_PRAXIS_TITLE}' carries '{METATASK_TITLE}'")
    print(f"  apply flow    : '{METATASK_OPEN_PRAXIS_TITLE}' is in progress")
    print(
        f"  multiplier row: '{DUEL_LOSER_TITLE}' (losing Snide side) and "
        f"'{DUEL_WINNER_TITLE}'"
    )
    print(
        f"  flat metatask : both duel sides carry '{METATASK_TITLE}' "
        f"(+{METATASK_POINTS}); the losing side scores it at x0.0 base (ADR-0086)"
    )
    collab_modifier = era.factions[COLLAB_TASK_FACTION_SLUG].collab_own_modifier
    print(
        f"  collab row    : '{COLLAB_TITLE}' - "
        f"{COLLAB_TASK_FACTION_SLUG} own-faction collab at x{collab_modifier} "
        f"(era.factions['{COLLAB_TASK_FACTION_SLUG}'].collab_own_modifier)"
    )
    print(
        f"                  needs a {COLLAB_TASK_FACTION_SLUG} task on the board; "
        f"if the line above said 'skipped', import one first"
    )


async def get_or_create_players(session) -> dict[str, Character]:
    chars: dict[str, Character] = {}
    for username, display_name, faction_slug in PLAYERS:
        existing = (
            await session.execute(select(Character).where(Character.username == username))
        ).scalar_one_or_none()
        if existing is not None:
            chars[username] = existing
            continue
        account = Account(email=f"{username}@worldzero.test")
        session.add(account)
        await session.flush()
        session.add(OAuthProvider(
            account_id=account.id,
            provider=AuthProvider.DEMO,
            provider_user_id=username,
        ))
        character = Character(
            account_id=account.id,
            username=username,
            display_name=display_name,
            faction_slug=faction_slug,
        )
        session.add(character)
        await session.flush()
        chars[username] = character
    return chars


async def seed(session, era: EraConfig = CURRENT_ERA) -> None:
    players = await get_or_create_players(session)
    created = 0
    for faction, (author_username, title, body, ptype, stars) in DEMOS.items():
        task = (
            await session.execute(
                select(Task).where(Task.primary_faction_slug == faction).limit(1)
            )
        ).scalar_one_or_none()
        if task is None:
            print(f"  ! {faction}: no task on the board — skipped")
            continue
        author = players[author_username]
        marked_title = TITLE_MARKER + title
        already = (
            await session.execute(
                select(func.count())
                .select_from(Praxis)
                .where(Praxis.created_by_id == author.id, Praxis.title == marked_title)
            )
        ).scalar()
        if already:
            print(f"  = {faction}: demo praxis already present — skipped")
            continue

        praxis = Praxis(
            task_id=task.id,
            type=ptype,
            status=PraxisStatus.submitted,
            title=marked_title,
            body_text=body,
            created_by_id=author.id,
            moderation_status=ModerationStatus.visible,
        )
        session.add(praxis)
        await session.flush()

        session.add(PraxisMember(praxis_id=praxis.id, character_id=author.id, has_submitted=True))
        voters = [c for c in players.values() if c.id != author.id][: len(stars)]
        for voter, star in zip(voters, stars):
            session.add(Vote(
                praxis_id=praxis.id,
                voter_character_id=voter.id,
                voter_account_id=voter.account_id,
                value=star,
            ))
        created += 1
        print(f"  + {faction}: '{title}' by {author.display_name} ({len(voters)} votes)")

    await seed_score_fixtures(session, players, era)
    await session.commit()
    print(f"\nDone. {created} demo praxis(es) created.")
    print_login_recipe(era)


async def remove(session) -> None:
    demo_chars = (
        await session.execute(
            select(Character).where(Character.username.like("demo_%"))
        )
    ).scalars().all()
    ids = [c.id for c in demo_chars]
    if not ids:
        print("No demo players found.")
        return
    praxis_ids = (
        await session.execute(select(Praxis.id).where(Praxis.created_by_id.in_(ids)))
    ).scalars().all()
    if praxis_ids:
        # Duel rows first: they FK both praxis ids and character ids (#891).
        await session.execute(delete(Duel).where(or_(
            Duel.challenger_praxis_id.in_(praxis_ids),
            Duel.opponent_praxis_id.in_(praxis_ids),
            Duel.opponent_character_id.in_(ids),
        )))
        await session.execute(
            delete(PraxisMetaTask).where(PraxisMetaTask.praxis_id.in_(praxis_ids))
        )
        await session.execute(delete(Vote).where(Vote.praxis_id.in_(praxis_ids)))
        await session.execute(delete(PraxisMember).where(PraxisMember.praxis_id.in_(praxis_ids)))
        await session.execute(delete(Praxis).where(Praxis.id.in_(praxis_ids)))
    # The demo metatask is a Task row authored by a demo character (#891), so it
    # has to go too — with any application of it, whoever applied it.
    demo_metatask_id = (
        await session.execute(select(Task.id).where(Task.title == METATASK_TITLE))
    ).scalar_one_or_none()
    if demo_metatask_id is not None:
        await session.execute(
            delete(PraxisMetaTask).where(PraxisMetaTask.task_id == demo_metatask_id)
        )
        await session.execute(delete(Task).where(Task.id == demo_metatask_id))
    # votes cast by demo players on any praxis
    await session.execute(delete(Vote).where(Vote.voter_character_id.in_(ids)))
    await session.execute(delete(PraxisMember).where(PraxisMember.character_id.in_(ids)))
    account_ids = [c.account_id for c in demo_chars]
    await session.execute(delete(CharacterStats).where(CharacterStats.character_id.in_(ids)))
    await session.execute(delete(Character).where(Character.id.in_(ids)))
    await session.execute(delete(OAuthProvider).where(OAuthProvider.account_id.in_(account_ids)))
    await session.execute(delete(Account).where(Account.id.in_(account_ids)))
    await session.commit()
    print(f"Removed {len(praxis_ids)} demo praxis(es) and {len(ids)} demo players.")


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--remove", action="store_true", help="delete all demo players + praxes")
    parser.add_argument("--env", default="dev")
    args = parser.parse_args()

    settings = get_settings(args.env)
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async with async_sessionmaker(engine, expire_on_commit=False)() as session:
        if args.remove:
            await remove(session)
        else:
            await seed(session)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())

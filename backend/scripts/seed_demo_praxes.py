"""Dev-only: one community-voted demo praxis per faction, plus score-breakdown
fixtures. Idempotent; repairs its own #2846-corrupt rows.

Run as a MODULE from backend/ (a script path can't import `faction_slugs`):
``python -m scripts.seed_demo_praxes [--remove]``, or ``scripts/wz seed --demo``.
"""
import argparse
import asyncio
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from faction_slugs import real_faction_slugs
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
from services.character import record_level_reached

TITLE_MARKER = "[demo] "


def fixture_faction_slugs(era: EraConfig) -> tuple[str, str, str]:
    """``(metatask, duel, collab)`` — real factions *this* era defines (#2710).

    Never literals (an era may drop one). Distinct when possible, cycling on a
    smaller era.
    """
    real = real_faction_slugs(era)
    if not real:
        # Degenerate era: fixtures skip anyway when no task matches.
        real = [era.starting_faction_slug]
    return real[0], real[1 % len(real)], real[2 % len(real)]

# (username, display_name, preferred faction). Separate accounts so they can
# cross-vote. Unknown slugs fall back to starting faction (#2710); None = the
# collab fixture's faction.
PLAYERS = [
    ("demo_quill", "Quill", "ua"),
    ("demo_sol", "Sol Brennan", "everymen"),
    ("demo_marigold", "Marigold", "wow"),
    ("demo_riot", "Riot", "snide"),
    ("demo_vesper", "Vesper", "ephemerists"),
    ("demo_unit", "UNIT-7", "singularity"),
    ("demo_almanac", "Almanac Okonkwo", "ephemerists"),  # extra collaborator
    # APPEND ONLY: fixtures take the first n non-member players as voters, so
    # inserting would change existing tallies.
    # Collab pair, in the collab task's faction (own-faction collab).
    ("demo_kettle", "Kettle", None),
    ("demo_thimble", "Thimble", None),
    # Coven's DEMOS author (#2895).
    ("demo_hazel", "Hazel", "coven"),
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
    "coven": ("demo_hazel", "Left a tin on every landing",
              "Baked all afternoon, wrote nine notes. Three tins came back "
              "with notes already in them.",
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

# DEMOS is all-solo; the collab is seeded separately (seed_collab_fixture).


# Score-breakdown fixtures (#891): make the metatask row and the multiplier row
# visible in dev. Every rule is read off `era.*`.
METATASK_TITLE = TITLE_MARKER + "Do It Backwards"
METATASK_DESCRIPTION = "Run the whole task in reverse order. Photographic proof or it didn't happen."
METATASK_POINTS = 100
# Owner reachable via `POST /auth/dev-login?key=<KEY>` (same OAuth shape as
# routers/auth.py, so dev-login adopts this character).
METATASK_PLAYER_KEY = "meta"
METATASK_PLAYER = ("demo_meta", "Metamancer")
METATASK_PRAXIS_TITLE = TITLE_MARKER + "Shelved the whole aisle backwards"
METATASK_PRAXIS_BODY = (
    "Same task, inverted. The metatask bonus is the flat row above the multiplier."
)
METATASK_PRAXIS_STARS = [5, 4, 4]
# In-progress praxis for exercising apply_metatask in the composer.
METATASK_OPEN_PRAXIS_TITLE = TITLE_MARKER + "Open: apply a metatask to me"

# Duel pair on one shared task, so only the duel modifier differs. Snide loses
# (Era 1 duel_loss_modifier 0.0). Both carry the metatask (#2633): at x0.0 base
# a flat metatask (ADR-0086) is visibly different.
DUEL_LOSER_USERNAME = "demo_riot"        # snide — challenger, loses -> x0.0
DUEL_WINNER_USERNAME = "demo_sol"        # everymen — opponent, wins -> x1.5
DUEL_LOSER_TITLE = TITLE_MARKER + "Duel: did it louder"
DUEL_LOSER_BODY = "Went first, went loud. The room did not agree."
DUEL_WINNER_TITLE = TITLE_MARKER + "Duel: did it better"
DUEL_WINNER_BODY = "Answered the challenge. Took the room."
# Unequal on purpose — the duel winner is decided on points_from_votes.
DUEL_LOSER_STARS = [("demo_quill", 1), ("demo_marigold", 2)]
DUEL_WINNER_STARS = [("demo_vesper", 5), ("demo_unit", 5), ("demo_almanac", 4)]

# Own-faction collab: both members in the task's faction, so either card reads
# `collab_own_modifier`. Seeds a collaboration, promises no bonus (#2710).
COLLAB_AUTHOR_USERNAME = "demo_kettle"
COLLAB_SECOND_USERNAME = "demo_thimble"
COLLAB_TITLE = TITLE_MARKER + "Collab: proofed the dough in shifts"
COLLAB_BODY = (
    "Two of us, one task, one long rise. The multiplier row is the "
    "own-faction collaboration modifier."
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
    username, display_name = METATASK_PLAYER
    faction_slug, _, _ = fixture_faction_slugs(era)
    existing = (
        await session.execute(select(Character).where(Character.username == username))
    ).scalar_one_or_none()

    if existing is None:
        account = Account(email=f"dev-{METATASK_PLAYER_KEY}@localhost")
        session.add(account)
        await session.flush()
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
    record_level_reached(existing, level)
    await session.flush()
    return existing


async def get_or_create_metatask(
    session, created_by: Character, faction_slug: str
) -> Task:
    """The one demo metatask; ``faction_slug`` must match ``created_by``'s so
    the owner can apply it."""
    existing = (
        await session.execute(select(Task).where(Task.title == METATASK_TITLE))
    ).scalar_one_or_none()
    if existing is not None:
        return existing
    task = Task(
        title=METATASK_TITLE,
        description=METATASK_DESCRIPTION,
        point_value=METATASK_POINTS,
        # 0 so every viewer sees it scored (services/meta_task.py); applying is
        # still gated by era.metatask_apply_level.
        level_required=0,
        status=TaskStatus.active,
        task_type=TaskType.metatask,
        created_by=created_by.id,
        primary_faction_slug=faction_slug,
        metatask_faction_slug=faction_slug,
    )
    session.add(task)
    await session.flush()
    return task


async def seed_metatask_fixture(
    session, players: dict[str, Character], era: EraConfig = CURRENT_ERA
) -> Task:
    """A metatask, a submitted praxis carrying it, and an open praxis to apply it
    to. Returns the metatask for the duel fixture (#2633)."""
    faction_slug, _, _ = fixture_faction_slugs(era)
    owner = await get_or_create_metatask_owner(session, era)
    metatask = await get_or_create_metatask(session, owner, faction_slug)

    task = await _pick_task(session, faction_slug)
    if task is None:
        print(f"  ! metatask: no {faction_slug} task on the board — skipped")
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
    session,
    players: dict[str, Character],
    metatask: Optional[Task] = None,
    era: EraConfig = CURRENT_ERA,
) -> None:
    """One settled duel with unequal tallies; ``metatask`` on both sides (#2633)."""
    if await _praxis_exists(session, DUEL_LOSER_TITLE):
        print("  = duel pair already present — skipped")
        return

    _, duel_slug, _ = fixture_faction_slugs(era)
    task = await _pick_task(session, duel_slug)
    if task is None:
        print(f"  ! duel: no {duel_slug} task on the board — skipped")
        return

    loser = players[DUEL_LOSER_USERNAME]
    winner = players[DUEL_WINNER_USERNAME]
    now = datetime.now(timezone.utc)

    sides: dict[str, Praxis] = {}
    for author, title, body in (
        (loser, DUEL_LOSER_TITLE, DUEL_LOSER_BODY),
        (winner, DUEL_WINNER_TITLE, DUEL_WINNER_BODY),
    ):
        # Duel sides are solo; the link lives on the Duel row.
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

    # `settled`: winner derived live from tallies until era close.
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


async def seed_collab_fixture(
    session, players: dict[str, Character], era: EraConfig = CURRENT_ERA
) -> None:
    """One submitted own-faction collab. Two members: a one-member collab
    reverts to solo (ADR-0060)."""
    if await _praxis_exists(session, COLLAB_TITLE):
        print("  = collab praxis already present — skipped")
        return

    # Never create the task here; the board is DB-only (eras/era_1.py).
    _, _, collab_slug = fixture_faction_slugs(era)
    task = await _pick_task(session, collab_slug)
    if task is None:
        print(
            f"  ! collab: no {collab_slug} task on the board — skipped "
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
    for member in (author, second):
        session.add(PraxisMember(
            praxis_id=praxis.id, character_id=member.id, has_submitted=True
        ))

    member_account_ids = {author.account_id, second.account_id}
    for voter_username, star in COLLAB_STARS:
        voter = players[voter_username]
        # Anti-self-voting is per account (ADR-0041).
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
        f"{second.display_name} on a {collab_slug} task"
    )


async def seed_score_fixtures(
    session, players: dict[str, Character], era: EraConfig = CURRENT_ERA
) -> None:
    """#891: a metatask in use, a duel pair, and a collab."""
    metatask = await seed_metatask_fixture(session, players, era)
    await seed_duel_fixture(session, players, metatask, era)
    await seed_collab_fixture(session, players, era)


def print_login_recipe(era: EraConfig = CURRENT_ERA) -> None:
    _, display_name = METATASK_PLAYER
    faction_slug, _, collab_slug = fixture_faction_slugs(era)
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
    # `.get`: must not raise when the collab was skipped (#2710).
    collab_faction = era.factions.get(collab_slug)
    collab_modifier = collab_faction.collab_own_modifier if collab_faction else 1.0
    print(
        f"  collab row    : '{COLLAB_TITLE}' - "
        f"{collab_slug} own-faction collab at x{collab_modifier} "
        f"(era.factions['{collab_slug}'].collab_own_modifier)"
    )
    print(
        f"                  needs a {collab_slug} task on the board; "
        f"if the line above said 'skipped', import one first"
    )


async def get_or_create_players(
    session, era: EraConfig = CURRENT_ERA
) -> dict[str, Character]:
    """The demo cast, each in a faction this era seeded (FK; #2710)."""
    _, _, collab_slug = fixture_faction_slugs(era)
    chars: dict[str, Character] = {}
    for username, display_name, preferred_slug in PLAYERS:
        faction_slug = collab_slug if preferred_slug is None else preferred_slug
        if faction_slug not in era.factions:
            faction_slug = era.starting_faction_slug
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


async def _repair_corrupt_submitted(session) -> int:
    """Re-stamp this script's own (``TITLE_MARKER``) rows that are submitted with
    NULL ``submitted_at`` (#2846), and their members, from ``created_at``.
    Needed because the title-keyed skip would never revisit them."""
    rows = (
        await session.execute(
            select(Praxis).where(
                Praxis.title.like(f"{TITLE_MARKER}%"),
                Praxis.status == PraxisStatus.submitted,
                Praxis.submitted_at.is_(None),
            )
        )
    ).scalars().all()
    for praxis in rows:
        praxis.submitted_at = praxis.created_at
        members = (
            await session.execute(
                select(PraxisMember).where(
                    PraxisMember.praxis_id == praxis.id,
                    PraxisMember.has_submitted.is_(True),
                    PraxisMember.submitted_at.is_(None),
                )
            )
        ).scalars().all()
        for member in members:
            member.submitted_at = praxis.created_at
    if rows:
        await session.flush()
        print(
            f"  ! repaired {len(rows)} pre-existing corrupt row(s) "
            "(status=submitted, submitted_at=NULL — #2846) — re-stamped from created_at"
        )
    return len(rows)


async def _assert_no_corrupt_submitted(session) -> None:
    """Post-seed check of the ``list_praxes`` invariant (submitted implies
    ``submitted_at``) over this script's rows, so a new creation site can't
    silently regress it."""
    bad = (
        await session.execute(
            select(func.count())
            .select_from(Praxis)
            .where(
                Praxis.title.like(f"{TITLE_MARKER}%"),
                Praxis.status == PraxisStatus.submitted,
                Praxis.submitted_at.is_(None),
            )
        )
    ).scalar()
    if bad:
        raise RuntimeError(
            f"seed_demo_praxes: {bad} row(s) with status=submitted and "
            "submitted_at=NULL survived seeding — services/praxis.py hides "
            "these from every feed and profile. Fix the creation site that "
            "made them; see #2846."
        )


async def seed(session, era: EraConfig = CURRENT_ERA) -> None:
    players = await get_or_create_players(session, era)
    repaired = await _repair_corrupt_submitted(session)
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

        now = datetime.now(timezone.utc)
        praxis = Praxis(
            task_id=task.id,
            type=ptype,
            status=PraxisStatus.submitted,
            title=marked_title,
            body_text=body,
            created_by_id=author.id,
            moderation_status=ModerationStatus.visible,
            submitted_at=now,
        )
        session.add(praxis)
        await session.flush()

        session.add(PraxisMember(
            praxis_id=praxis.id,
            character_id=author.id,
            has_submitted=True,
            submitted_at=now,
        ))
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
    await _assert_no_corrupt_submitted(session)
    summary = f"\nDone. {created} demo praxis(es) created"
    if repaired:
        summary += f", {repaired} corrupt row(s) repaired"
    print(summary + ".")
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
    # The demo metatask and every application of it.
    demo_metatask_id = (
        await session.execute(select(Task.id).where(Task.title == METATASK_TITLE))
    ).scalar_one_or_none()
    if demo_metatask_id is not None:
        await session.execute(
            delete(PraxisMetaTask).where(PraxisMetaTask.task_id == demo_metatask_id)
        )
        await session.execute(delete(Task).where(Task.id == demo_metatask_id))
    await session.execute(delete(Vote).where(Vote.voter_character_id.in_(ids)))
    await session.execute(delete(PraxisMember).where(PraxisMember.character_id.in_(ids)))
    account_ids = [c.account_id for c in demo_chars]
    await session.execute(delete(CharacterStats).where(CharacterStats.character_id.in_(ids)))
    # Unhook active_character_id first, or fk_account_active_character blocks
    # the character delete.
    await session.execute(
        update(Account)
        .where(Account.active_character_id.in_(ids))
        .values(active_character_id=None)
    )
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

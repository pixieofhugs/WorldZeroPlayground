import logging
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import (
    COMPILE_TIME_ERA_CONFIG_KEY,
    CURRENT_ERA,
    EraConfig,
    bind_live_era,
    era_config_for_key,
)
from models.character import Character
from models.character_stats import CharacterStats
from models.duel import Duel, DuelStatus
from models.era import Era
from models.praxis import Praxis
from models.task import Task, TaskStatus
# ``seed`` imports no service, so this costs no cycle; the seeder owns the key (#511).
from seed import ONBOARDING_TASK_SEED_KEY
from services.duel_outcome import duel_winner
from services.scoring import sole_tie_taker_id
from services.vote_tally import get_tally, tally_votes

logger = logging.getLogger(__name__)


#: Serializes rollovers across the admin route and ``scripts/era_reset.py``
#: (lives here so the script needn't import the admin service). Value is the
#: issue number, as in ``praxis_room._SINGLE_INSTANCE_LOCK_KEY``.
_ERA_ROLLOVER_LOCK_KEY = 17400827


async def lock_era_rollover(session: AsyncSession) -> None:
    """Take the rollover lock, held until the caller's transaction ends.

    Call **before** reading the live ``Era`` row so read, decision and insert
    are atomic (two mods, or a mod plus ``era_reset.py``). Advisory lock, not
    ``FOR UPDATE``: there may be no row to lock, and under READ COMMITTED a
    waiter's ``ORDER BY id DESC LIMIT 1`` isn't re-planned, so it would hold
    the stale row.
    """
    await session.execute(select(func.pg_advisory_xact_lock(_ERA_ROLLOVER_LOCK_KEY)))


async def rebind_live_era(session: AsyncSession) -> EraConfig:
    """Resolve the live ruleset from the latest ``Era`` row and bind it.

    One of two binders (with :func:`commit_and_bind_live_era`;
    ``test_live_era_binding.py`` enforces it). For callers with no era in hand:
    app start-up and ``seed.py``. Rollovers use the commit-first path.

    Total over the row (the DB call can still raise), since start-up must not
    crash: no row (fresh DB; don't invent one, ``started_by`` is not-null) or an
    unknown ``config_key`` (deploy mistake, warned) both fall back to the
    compile-time era.
    """
    era_row = await get_current_era_row_safe(session)
    era_config = (
        None if era_row is None else era_config_for_key(era_row.config_key)
    )
    if era_config is None:
        if era_row is None:
            logger.info(
                "No Era row yet — the live ruleset falls back to the "
                "compile-time era %r. Expected on a fresh database, before the "
                "first seed.",
                COMPILE_TIME_ERA_CONFIG_KEY,
            )
        else:
            logger.warning(
                "Era row id=%s names config_key %r, which no era file registers "
                "— the live ruleset falls back to the compile-time era %r. The "
                "game is NOT playing by the rules that row records.",
                era_row.id,
                era_row.config_key,
                COMPILE_TIME_ERA_CONFIG_KEY,
            )
        era_config = era_config_for_key(COMPILE_TIME_ERA_CONFIG_KEY)
    else:
        logger.info(
            "Live ruleset bound to %r from Era row id=%s.",
            era_config.config_key,
            era_row.id,
        )
    return bind_live_era(era_config)


async def commit_and_bind_live_era(
    session: AsyncSession, era: EraConfig
) -> EraConfig:
    """Commit the rollover, then point the process at the era it just wrote.

    Order matters: bind-then-failed-commit leaves the process on rules the DB
    rolled back, unrecoverably; commit-first's worst case is fixed by a restart.
    The one deliberate service-owned commit (contra ``db.get_db``): the router
    can't own which era to bind, and ``get_db`` commits too late. Its later
    commit is a no-op.
    """
    await session.commit()
    return bind_live_era(era)


async def get_current_era_row(session: AsyncSession) -> Era:
    """Return the live Era row; 500 only on a fresh DB with no ``Era`` rows."""
    era_row = await get_current_era_row_safe(session)
    if era_row is None:
        raise HTTPException(
            status_code=500,
            detail="No active era configured. Run the initial seed before creating characters.",
        )
    return era_row


async def get_current_era_row_safe(session: AsyncSession) -> Era | None:
    """Like ``get_current_era_row`` but returns None instead of raising.

    Live era = the latest row, whatever its ``config_key`` (rows are append-only,
    one per reset). Filtering by key deadlocked era switching (#2705). Cost:
    between deploy and rollover the new rules run against the old row; ``seed.py``
    warns about it.
    """
    result = await session.execute(
        select(Era).order_by(Era.id.desc()).limit(1)
    )
    return result.scalar_one_or_none()


async def load_era_stats(
    character_id: int,
    era_id: int,
    session: AsyncSession,
) -> CharacterStats | None:
    """A character's CharacterStats row for an era already in hand, or None (#1381)."""
    result = await session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character_id,
            CharacterStats.era_id == era_id,
        )
    )
    return result.scalar_one_or_none()


async def load_current_era_stats(
    character_id: int,
    session: AsyncSession,
) -> CharacterStats | None:
    """Current-era CharacterStats, or None when unseeded / no stats row."""
    era_row = await get_current_era_row_safe(session)
    if era_row is None:
        return None
    return await load_era_stats(character_id, era_row.id, session)


async def get_or_create_stats(
    session: AsyncSession,
    character_id: int,
    era_id: int,
) -> CharacterStats:
    """Fetch or create the (character, era) CharacterStats row.

    Vote budget is computed on read (``scoring.compute_votes_available``), so
    no seeding beyond ``votes_spent_this_era = 0``.
    """
    stats = await load_era_stats(character_id, era_id, session)
    if stats is None:
        stats = CharacterStats(
            character_id=character_id,
            era_id=era_id,
            votes_spent_this_era=0,
        )
        session.add(stats)
        await session.flush()
    return stats


async def get_closing_era_id(new_era_row: Era, session: AsyncSession) -> int | None:
    """The era closed by the reset that inserted ``new_era_row`` (prior id), or None."""
    result = await session.execute(
        select(Era.id)
        .where(Era.id < new_era_row.id)
        .order_by(Era.id.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_next_era_row(era_row: Era, session: AsyncSession) -> Era | None:
    """The era after ``era_row``, or None when ``era_row`` is live.

    Bounds an era to ``[started_at, next.started_at)`` for seal-time scoring
    (#1345); ``None`` also means "still open", i.e. invitations may be delivered.
    """
    result = await session.execute(
        select(Era).where(Era.id > era_row.id).order_by(Era.id).limit(1)
    )
    return result.scalar_one_or_none()


async def get_era_row_for_praxis(praxis: Praxis, session: AsyncSession) -> Era:
    """The latest era that started at or before the praxis's seal (#1362).

    Unsealed (or sealed before any era) → current era. A vote on a closed era's
    praxis credits that era's stats (#1345).
    """
    if praxis.submitted_at is not None:
        result = await session.execute(
            select(Era)
            .where(Era.started_at <= praxis.submitted_at)
            .order_by(Era.id.desc())
            .limit(1)
        )
        era_row = result.scalar_one_or_none()
        if era_row is not None:
            return era_row
    return await get_current_era_row(session)


async def resolve_duels_at_era_close(
    session: AsyncSession,
    resolved_at: datetime | None = None,
    closing_era_id: int | None = None,
    era: EraConfig = CURRENT_ERA,
) -> list[Duel]:
    """Freeze every ``active``/``settled`` duel's outcome (ADR-0052).

    Sets winner (``duel_winner``), both final-points snapshots, ``resolved_at``,
    status, and ``resolved_era_id`` (#823; a timestamp can't answer it since the
    new Era row is inserted first). ``active`` duels are no-contests (null
    winner, zero snapshots); ``pending``/``declined`` are untouched. No per-duel
    feed events: the era announcement covers it.
    """
    resolved_at = resolved_at or datetime.now(timezone.utc)

    duel_result = await session.execute(
        select(Duel).where(Duel.status.in_([DuelStatus.active, DuelStatus.settled]))
    )
    duels = list(duel_result.scalars().all())
    if not duels:
        return []

    praxis_ids: list[int] = []
    for duel in duels:
        praxis_ids.append(duel.challenger_praxis_id)
        if duel.opponent_praxis_id is not None:
            praxis_ids.append(duel.opponent_praxis_id)

    praxis_result = await session.execute(
        select(Praxis).where(Praxis.id.in_(praxis_ids))
    )
    praxes_by_id: dict[int, Praxis] = {p.id: p for p in praxis_result.scalars()}
    tallies = await tally_votes(praxis_ids, session)

    # Factions so a tie freezes to the Snide tiebreak winner the live view shows (#748).
    character_ids = {duel.opponent_character_id for duel in duels}
    character_ids.update(
        praxis.created_by_id
        for praxis in praxes_by_id.values()
    )
    faction_result = await session.execute(
        select(Character.id, Character.faction_slug).where(
            Character.id.in_(character_ids)
        )
    )
    faction_by_character: dict[int, str] = {
        character_id: (slug or "") for character_id, slug in faction_result.all()
    }

    for duel in duels:
        is_contest = duel.status == DuelStatus.settled
        if is_contest:
            challenger_points = get_tally(
                tallies, duel.challenger_praxis_id
            ).points_from_votes
            opponent_points = (
                get_tally(tallies, duel.opponent_praxis_id).points_from_votes
                if duel.opponent_praxis_id is not None
                else 0
            )
        else:
            challenger_points = 0
            opponent_points = 0

        challenger_praxis = praxes_by_id.get(duel.challenger_praxis_id)
        challenger_character_id = (
            challenger_praxis.created_by_id if challenger_praxis else None
        )
        opponent_praxis = (
            praxes_by_id.get(duel.opponent_praxis_id)
            if duel.opponent_praxis_id is not None
            else None
        )
        duel.winner_character_id = (
            duel_winner(
                challenger_character_id=challenger_character_id,
                opponent_character_id=duel.opponent_character_id,
                challenger_points=challenger_points,
                opponent_points=opponent_points,
                challenger_moderation=(
                    challenger_praxis.moderation_status if challenger_praxis else None
                ),
                opponent_moderation=(
                    opponent_praxis.moderation_status if opponent_praxis else None
                ),
                forfeited_by_character_id=duel.forfeited_by_character_id,
                tie_break_winner_id=sole_tie_taker_id(
                    faction_by_character.get(challenger_character_id, ""),
                    challenger_character_id,
                    faction_by_character.get(duel.opponent_character_id, ""),
                    duel.opponent_character_id,
                    era,
                ),
            )
            if is_contest
            else None
        )
        duel.challenger_final_points = challenger_points
        duel.opponent_final_points = opponent_points
        duel.resolved_at = resolved_at
        duel.resolved_era_id = closing_era_id
        duel.status = DuelStatus.resolved

    await session.flush()
    return duels


async def retire_board_at_era_close(session: AsyncSession) -> int:
    """Retire every task except the onboarding one (#1619). Returns rows moved.

    Retire, not delete: ``praxis.task_id`` is NOT NULL. Pending proposals go
    too. The onboarding task is spared by ``seed_key``, not title (#3064), since
    the seeder keeps it alive every era (#511).

    Known consequences (not bugs):
    1. Retired titles stay taken: ``task_import`` dedupes on all titles, and
       after #1563 a colliding import row is silently skipped.
    2. Retired tasks reappear in browse past ``level_to_see_retired_tasks``,
       and for ``allow_praxis_on_retired_task_factions`` factions.
    """
    # IS DISTINCT FROM: seed_key is NULL on ordinary tasks and ``NULL != 'x'`` is NULL.
    result = await session.execute(
        update(Task)
        .where(Task.seed_key.is_distinct_from(ONBOARDING_TASK_SEED_KEY))
        .where(Task.status.notin_([TaskStatus.retired, TaskStatus.deleted]))
        .values(status=TaskStatus.retired)
    )
    return result.rowcount


async def apply_era_reset(
    characters: list[Character],
    new_era_row: Era,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> None:
    """Create new-era CharacterStats rows, freeze duels, retire the board.

    Prior-era stats are kept. Defection history isn't purged: every reader
    filters by era, so old rows can't gate a new-era join (#1372).
    """
    # Duels first: against the closing era's tallies, before new stats exist (#823).
    closing_era_id = await get_closing_era_id(new_era_row, session)
    await resolve_duels_at_era_close(session, closing_era_id=closing_era_id)

    await retire_board_at_era_close(session)

    for character in characters:
        prev_result = await session.execute(
            select(CharacterStats)
            .where(CharacterStats.character_id == character.id)
            .order_by(CharacterStats.era_id.desc())
            .limit(1)
        )
        prev_stats = prev_result.scalar_one_or_none()
        prev_all_time = prev_stats.all_time_score if prev_stats else 0

        new_stats = CharacterStats(
            character_id=character.id,
            era_id=new_era_row.id,
            score=0 if era.reset_score else (prev_stats.score if prev_stats else 0),
            all_time_score=0 if era.reset_all_time_score else prev_all_time,
            level=0 if era.reset_level else (prev_stats.level if prev_stats else 0),
            votes_spent_this_era=0 if era.reset_vote_budget else (
                prev_stats.votes_spent_this_era if prev_stats else 0
            ),
        )
        session.add(new_stats)

        if era.reset_faction:
            character.faction_slug = era.reset_faction_slug

    await session.flush()

    # Does NOT move the live era: nothing is durable yet. The caller binds after
    # commit via commit_and_bind_live_era (ADR-0091, #827). In-flight requests
    # straddling the change are accepted.

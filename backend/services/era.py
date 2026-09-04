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
# ``seed`` is a leaf as far as services go — it imports models, game_config and
# config, never a service — so naming the one task both modules must agree on
# costs no cycle. The seeder owns the title because the seeder is what keeps the
# task alive in every era (#511); the sweep below only has to recognise it.
from seed import ONBOARDING_TASK_TITLE
from services.duel_outcome import duel_winner
from services.scoring import sole_tie_taker_id
from services.vote_tally import get_tally, tally_votes

logger = logging.getLogger(__name__)


#: Serializes the rollover against itself, across **both** doors — the admin
#: route and ``scripts/era_reset.py``. Lives here rather than in
#: ``services.admin_service`` because the script must take the same lock and
#: importing it from the admin service would drag the whole admin surface into a
#: CLI. Reads as the issue number in ``pg_locks``, the same convention as
#: ``services.praxis_room._SINGLE_INSTANCE_LOCK_KEY``.
_ERA_ROLLOVER_LOCK_KEY = 17400827


async def lock_era_rollover(session: AsyncSession) -> None:
    """Take the rollover lock. Held until the caller's transaction ends.

    Call it **before** reading the live ``Era`` row, so that read, the decision
    made on it and the insert that follows are one indivisible operation. Two
    rollovers overlapping is not hypothetical: two mods confirming within a
    second of each other, or — the case the route alone could not cover — an
    operator running ``era_reset.py`` while a mod is confirming on the admin
    page. Without this, both read the same live row, both pass their refusals,
    the game takes two destructive resets, and the process is left bound to
    whichever finished last rather than to the latest row.

    A transaction-scoped advisory lock, not ``SELECT ... FOR UPDATE`` on the
    latest row. The row lock locks nothing on a database that has none, and
    under READ COMMITTED a waiter's locked row is re-checked but its
    ``ORDER BY id DESC LIMIT 1`` is not re-planned — so after the winner
    inserts a new latest row the waiter is still holding the old one, and would
    decide against it.
    """
    await session.execute(select(func.pg_advisory_xact_lock(_ERA_ROLLOVER_LOCK_KEY)))


async def rebind_live_era(session: AsyncSession) -> EraConfig:
    """Resolve the live ruleset from the latest ``Era`` row and bind it.

    One of the two functions in the shipped backend that reach
    :func:`game_config.bind_live_era` — the other is
    :func:`commit_and_bind_live_era` below, and
    ``tests/unit/test_live_era_binding.py`` keeps it to those two, both here.
    This one is for the callers that have no era in hand and must ask the
    database which it is:

    * process start-up, from the app's lifespan, and
    * ``seed.py``, which ``start.sh`` runs on every deploy and whose faction
      mirror must reflect the era the database says is live, not the one the
      process compiled against.

    A rollover does **not** come through here. It already holds the era it just
    wrote, and it must not bind until that write is durable — see
    :func:`commit_and_bind_live_era`.

    Total by construction — it binds *something* on every path, because a
    start-up that raises here takes the whole app down over a row that a fresh
    install has not written yet:

    * **No ``Era`` row at all.** A fresh database. ``bootstrap_admin`` writes the
      first row only on an un-bootstrapped database, so start-up can legitimately
      find nothing. Fall back to the compile-time era and say so; do not invent
      a row, because ``Era.started_by`` is a not-null audit trail with nobody to
      put in it.
    * **A row naming a ``config_key`` no era file claims.** A deleted era file,
      or a row written by a newer version of the app and then rolled back. Same
      fallback, louder — this one is a deployment mistake, not a fresh install.

    The database call itself can still raise; "total" is about the *row*, not
    about the connection.
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

    **The order is the point.** The live era is a process-wide object; the row
    that justifies it is a database fact. Binding first and committing second
    means a failed commit — a serialization failure, a dropped connection, a
    constraint the rollover tripped on the way out — rolls the database back to
    the closing era while the process goes on playing by the opening one's
    rules, with nothing to notice and no request able to put it back. Committing
    first means the worst case is a durable rollover the process has not
    noticed yet, which the next restart fixes.

    This is the one place a service owns its own commit, against the rule
    ``db.get_db`` states — services flush, the router's dependency owns the
    single per-request commit. It is deliberate and it is narrow: the
    router cannot own this boundary without also owning *which* era to bind,
    which is the rollover's decision, and ``get_db``'s commit lands after the
    handler has already returned — too late for the handler to bind behind it.
    ``get_db`` still commits afterwards; that second commit has nothing left to
    write.

    ``era`` is the config the caller already resolved, so there is no re-query
    and no chance of binding something other than what was written.
    """
    await session.commit()
    return bind_live_era(era)


async def get_current_era_row(session: AsyncSession) -> Era:
    """Return the live Era DB row — see :func:`get_current_era_row_safe`.

    Raises 500 only on a genuinely fresh database (no ``Era`` rows at all). Run
    the initial seed or migration before creating characters.
    """
    era_row = await get_current_era_row_safe(session)
    if era_row is None:
        raise HTTPException(
            status_code=500,
            detail="No active era configured. Run the initial seed before creating characters.",
        )
    return era_row


async def get_current_era_row_safe(session: AsyncSession) -> Era | None:
    """Like ``get_current_era_row`` but returns None on missing era instead of raising.

    The live era is **the latest ``Era`` row, whatever its ``config_key``** — the
    same append-only invariant :func:`get_closing_era_id` and
    :func:`get_next_era_row` read ("rows are only ever appended, one per reset").
    It used to filter on ``CURRENT_ERA.config_key``, which deadlocked the one
    lever that switches the game (ADR-0042): pointing ``CURRENT_ERA`` at a new
    era file left no row carrying that key, so ``scripts/era_reset.py`` refused
    to run — and creating that row is its job — while every path resolving a
    character's stats 500ed in the meantime (#2705).

    The cost, taken knowingly: "unseeded" now means *no rows at all* rather than
    *no row for this key*, so between the deploy and the rollover the app serves
    the new rules against the old row instead of failing loudly. The loudness
    lives in ``seed.py``, which runs on every deploy and says so.
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
    """A character's CharacterStats row for an era already in hand, or None.

    Split out of :func:`load_current_era_stats` so a caller that has already
    resolved the era row — /auth/me composes four such reads (#1381) — pays for
    it once instead of once per lookup.
    """
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
    """Look up a character's CharacterStats for the current era.

    Returns None when the era is unseeded or the character has no stats row,
    so callers can fall back to zero stats without try/except.
    """
    era_row = await get_current_era_row_safe(session)
    if era_row is None:
        return None
    return await load_era_stats(character_id, era_row.id, session)


async def get_or_create_stats(
    session: AsyncSession,
    character_id: int,
    era_id: int,
) -> CharacterStats:
    """Fetch or create the CharacterStats row for a given (character, era) pair.

    Vote budget is computed on read from score + votes_spent_this_era
    (see services.scoring.compute_votes_available), so new rows start with
    votes_spent_this_era = 0 — no explicit seeding of the budget is required.
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
    """The era being closed by the reset that inserted ``new_era_row``.

    The row immediately before it by id — ``Era`` rows are only ever appended, one
    per reset. Returns None when there is no earlier era (the very first reset),
    which is also the "nothing has ever closed" state Era 1 is in today.
    """
    result = await session.execute(
        select(Era.id)
        .where(Era.id < new_era_row.id)
        .order_by(Era.id.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_next_era_row(era_row: Era, session: AsyncSession) -> Era | None:
    """The era that succeeded ``era_row``, or None when ``era_row`` is the live one.

    Mirror of :func:`get_closing_era_id`, and the upper half of an era's window.
    ``Era`` rows are only ever appended, one per reset, so "the next era" is the
    next id. Together with ``era_row.started_at`` this bounds an era to
    ``[started_at, next.started_at)`` — the seal-time window
    :func:`services.character_stats.recalculate_character_stats` scores against
    (#1345). ``None`` doubles as "this era is still open", which is why the same
    call also answers *may this recalc deliver invitations?*
    """
    result = await session.execute(
        select(Era).where(Era.id > era_row.id).order_by(Era.id).limit(1)
    )
    return result.scalar_one_or_none()


async def get_era_row_for_praxis(praxis: Praxis, session: AsyncSession) -> Era:
    """The era a praxis belongs to — the latest era that started at or before its seal.

    ``Praxis`` carries no ``era_id``; era membership is a **seal-time** fact, the
    same bound :class:`services.praxis.PraxisEraScope` reads (#1362). An unsealed
    praxis (``submitted_at IS NULL``) is in-flight work and belongs to the era in
    progress, so it resolves to the current era — as does any praxis somehow
    sealed before the first ``Era`` row existed.

    Used by the vote path: a vote on a closed era's praxis credits *that* era's
    stats row, not the ladder the author is climbing today (#1345).
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
    """Freeze every unresolved duel's outcome (ADR-0052). Returns the frozen rows.

    A duel has no winner until the era closes — the tally floats live until this
    runs (ADR-0011). Here every ``active`` or ``settled`` duel gets:

    - ``winner_character_id`` from the one shared rule (``duel_winner``): a side
      that forfeited or that a moderator ruled unscored cannot win (#1442), else
      strictly greater ``points_from_votes``, tie → NULL.
    - a snapshot of both sides' ``points_from_votes``, so a resolved surface can
      show vote shares without the live tally moving under it.
    - ``resolved_at`` and the terminal ``resolved`` status.
    - ``resolved_era_id`` — the era being closed, so "which era was this duel?"
      survives as a fact rather than a timestamp comparison (#823). ``resolved_at``
      cannot answer it: the new ``Era`` row is inserted before this runs, so every
      frozen duel timestamps *after* the incoming era's ``started_at``.

    ``active`` duels (accepted, but never both-submitted) never became votable, so
    they resolve as a **no-contest**: null winner, zero snapshots. ``pending``
    duels — never accepted, so never a contest at all — are left untouched, as are
    ``declined`` ones.

    Deliberately emits **no** per-duel activity-feed event: every duel resolves at
    the same instant, so N identical-timestamp cards would flood the feed. The
    single ``era_announcement`` the new ``Era`` row already produces is the
    notification (ADR-0052).
    """
    resolved_at = resolved_at or datetime.now(timezone.utc)

    duel_result = await session.execute(
        select(Duel).where(Duel.status.in_([DuelStatus.active, DuelStatus.settled]))
    )
    duels = list(duel_result.scalars().all())
    if not duels:
        return []

    # Bulk: one praxis fetch (for the challenger's character id), one vote tally.
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

    # Both sides' factions, so a tie freezes to the Snide tiebreak winner rather
    # than a permanent NULL (#748: Snide wins ties — the one duel_winner rule must
    # freeze what the live multiplier already shows).
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
            # No-contest: never votable, so there is nothing to snapshot.
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
                # The freeze reads moderation for the same reason the live
                # multiplier does (#1442): a side an admin ruled unscored cannot
                # win, and this is the write that makes the result permanent.
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
    """Retire every task except the onboarding one. Returns how many rows moved.

    An era's board belongs to that era. Before #1619 ``apply_era_reset`` had no
    ``Task`` reference at all, so a rollover left the whole board active and
    claimable; an empty ``ERA_2_TASKS`` only stops the *seeder* adding more, it
    says nothing about what is already there.

    **Retire, not delete.** ``praxis.task_id`` is NOT NULL, so deleting a task
    would strand or destroy every praxis written against it. Retiring preserves
    every reference — the row keeps answering "what was this proof *for*".

    The onboarding self-portrait is spared: ``seed.ensure_onboarding_task`` keeps
    it alive in every era by design (#511), so re-retiring it each rollover would
    only fight the seeder on the next deploy. Everything else goes, including
    ``pending`` proposals — a proposal from a closed era is that era's content,
    and leaving it approvable would let the board the sweep just cleared come
    back one admin click at a time.

    Two consequences, neither a blocker and both certain to be re-discovered as
    bugs otherwise:

    1. **Retired titles stay taken.** ``services.task_import`` dedupes on
       ``select(Task.title)`` with no status filter, so a retired task still
       occupies its name. From here every title from every past era is reserved
       forever — and once #1563 lands, a colliding import row is *silently
       skipped* rather than rejected, so re-using a task name across eras yields
       a successful-looking import that quietly drops rows.
    2. **The board un-hides itself as players climb.** ``level_to_see_retired_tasks``
       is 2, so retired tasks return to browse for anyone past that level.
       ``reset_level`` puts everyone at 0 on rollover, so "only the photo task"
       is true on day one and decays from there. (An era listing a faction in
       ``allow_praxis_on_retired_task_factions`` — Era 1 lists Ephemerists —
       leaks a second way, for that faction only.)
    """
    result = await session.execute(
        update(Task)
        .where(Task.title != ONBOARDING_TASK_TITLE)
        .where(Task.status != TaskStatus.retired)
        .values(status=TaskStatus.retired)
    )
    return result.rowcount


async def apply_era_reset(
    characters: list[Character],
    new_era_row: Era,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> None:
    """Create new CharacterStats rows for each character under the new era.

    Preserves historical stats rows for prior eras. Also freezes every unresolved
    duel outcome — era close is the moment a duel acquires a definitive winner
    (ADR-0011 / ADR-0052) — and retires the closing era's board
    (:func:`retire_board_at_era_close`, #1619).

    Defection history is **not** purged. ``reset_faction`` returns everyone to
    ``na``, and a fresh start on the join gate falls out of era scoping alone:
    every reader of ``FactionDefectionHistory`` filters on the era in hand
    (``services.faction_service.can_join_faction``, ``get_defection_history``,
    ``services.activity_feed``), so prior-era rows can never gate a new-era join.
    The rows stay as history (#1372).
    """
    # Freeze duels first: the outcome must be computed against the closing era's
    # tallies, before any stats row for the new era exists. The closing era is the
    # row before ``new_era_row``, and is stamped on each duel so a later read can
    # tell "last era" from "this era" without comparing timestamps (#823).
    closing_era_id = await get_closing_era_id(new_era_row, session)
    await resolve_duels_at_era_close(session, closing_era_id=closing_era_id)

    # The closing era's board closes with it. Order does not matter to the duel
    # freeze above — a duel's outcome is a vote tally, never a task status.
    await retire_board_at_era_close(session)

    for character in characters:
        # Find previous stats to carry all_time_score forward
        prev_result = await session.execute(
            select(CharacterStats)
            .where(CharacterStats.character_id == character.id)
            .order_by(CharacterStats.era_id.desc())
            .limit(1)
        )
        prev_stats = prev_result.scalar_one_or_none()
        prev_all_time = prev_stats.all_time_score if prev_stats else 0

        # Vote budget is computed on read. On era reset with reset_vote_budget=True
        # we zero votes_spent_this_era so the on-read budget reflects the full
        # formula against the (possibly reset) score. Otherwise we carry over
        # the previous era's spend count.
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

    # Deliberately does NOT move the live era. This function only flushes, so
    # the rows above are not durable yet, and binding a process-wide object to
    # a transaction that may still roll back is how the process and the database
    # end up disagreeing about which era the game is in. The caller binds, after
    # its commit, through :func:`commit_and_bind_live_era` (ADR-0091, #827).
    #
    # Accepted with the ruling: a request already in flight straddles the change
    # — it began under the closing era's rules and finishes under the opening
    # one's. The hand-flip this replaces had the same effect, arriving via a
    # deploy that restarted the process. If it ever matters, the answer is
    # draining or rebinding behind the rollover's own lock.

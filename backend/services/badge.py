"""Badge evaluation service (ADR-0033, #459).

Evaluates the code-defined :data:`badges.ALL_BADGES` registry against a
per-character :class:`badges.BadgeContext` built from explicit queries.

No fact a badge condition consults is allowed to cost one query *per character*
on a list path: :func:`build_badge_contexts` folds the whole page into a fixed
number of set-based queries and assembles each context in memory (#655). The
rule is "never *per-character* on list paths", not "never on list paths".
"""
from dataclasses import dataclass
from typing import Iterable, Optional

from sqlalchemy import func, or_, select
from sqlalchemy.dialects.postgresql import aggregate_order_by, array_agg
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from badges import ALL_BADGES, BadgeContext
from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.duel import Duel, DuelStatus
from models.era import Era
from models.praxis import Praxis
from schemas.character import BadgeOut
from services.duel_outcome import duel_winner
from services.scoring import sole_tie_taker_id
from services.vote_tally import get_tally, tally_votes

# Every duel status that can feed the duelist badge. `resolved` is included
# (owner ruling on #748, 2026-07-21): the badge means "won *or* winning", not
# "winning right now", so a win survives the era close #824 freezes it at.
# #823 narrows to the last-era-only case.
BADGE_DUEL_STATUSES: tuple[DuelStatus, ...] = (
    DuelStatus.active,
    DuelStatus.settled,
    DuelStatus.resolved,
)


@dataclass(frozen=True)
class DuelWinnerFacts:
    """The two per-character duel facts, read out of one pass over the duels."""

    # Won or winning, live or frozen, however long ago — the `duelist` badge (#748).
    winners: frozenset[int] = frozenset()
    # Frozen winner of a duel resolved at the close of the previous era — the
    # `duel_victor` badge (#823). Always a subset of `winners`.
    last_era_winners: frozenset[int] = frozenset()


async def _previous_era_id(session: AsyncSession) -> Optional[int]:
    """Id of the era before the current one, or None if none has ever closed.

    ``Era`` rows are append-only, one per reset, so "the era before this one" is
    the second-highest id. Reading the *table* rather than comparing timestamps is
    the whole point: a duel's ``resolved_at`` lands microseconds *after* the
    incoming era's ``started_at`` (the reset inserts the row first), so a boundary
    comparison would file every frozen duel under the era it did not belong to.
    """
    result = await session.execute(
        select(Era.id).order_by(Era.id.desc()).offset(1).limit(1)
    )
    return result.scalar_one_or_none()


async def _duel_winner_facts(
    character_ids: set[int],
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> DuelWinnerFacts:
    """Both duel facts for the given characters, from one pass over their duels.

    Three set-based queries regardless of page size: one for every badge-eligible
    duel any of these characters is a side of (joined to the challenger's praxis,
    which is where the challenger's character id lives), one
    :func:`tally_votes` over the *live* sides' praxis ids, and one for the previous
    era's id. The last-era fact (#823) rides the same duel rows rather than
    querying again — it is a filter on the winners, not a second source.

    Frozen and live split the same way :mod:`services.praxis_scoring` splits
    them:

    * ``resolved`` — read the frozen ``Duel.winner_character_id`` directly.
      #824 froze it at era close on purpose; recomputing would re-open a settled
      fact, and these duels need no tally row at all.
    * ``active`` / ``settled`` — the winner comes from the one shared rule
      (:func:`services.duel_outcome.duel_winner`, ADR-0052) over the live tally:
      ineligible sides first (forfeit, or a moderation ruling that the work is
      unscored — #1442), then strictly-greater ``points_from_votes``, else a tie.

    Never infer a winner from the points: a forfeit winner — or the opponent of a
    failed praxis — can hold the *lower* score, frozen or live.
    """
    if not character_ids:
        return DuelWinnerFacts()

    challenger_praxis = aliased(Praxis)
    opponent_praxis = aliased(Praxis)
    duel_rows = (
        await session.execute(
            select(
                challenger_praxis.created_by_id.label("challenger_character_id"),
                challenger_praxis.moderation_status.label("challenger_moderation"),
                opponent_praxis.moderation_status.label("opponent_moderation"),
                Duel.opponent_character_id,
                Duel.challenger_praxis_id,
                Duel.opponent_praxis_id,
                Duel.forfeited_by_character_id,
                Duel.status,
                Duel.winner_character_id,
                Duel.resolved_era_id,
            )
            .join(
                challenger_praxis,
                challenger_praxis.id == Duel.challenger_praxis_id,
            )
            # Outer: an `active` duel has no opponent praxis yet, and a side an
            # admin ruled unscored cannot win the badge any more than it can win
            # the multiplier (#1442). Same join, no extra query.
            .outerjoin(
                opponent_praxis,
                opponent_praxis.id == Duel.opponent_praxis_id,
            )
            .where(
                Duel.status.in_(BADGE_DUEL_STATUSES),
                or_(
                    challenger_praxis.created_by_id.in_(character_ids),
                    Duel.opponent_character_id.in_(character_ids),
                ),
            )
        )
    ).all()
    if not duel_rows:
        return DuelWinnerFacts()

    # Unconditional, so the query count does not depend on *which* duels a page
    # happens to contain (the batch guard compares pages, ADR-0033).
    previous_era_id = await _previous_era_id(session)

    # Only the live duels need a tally: a resolved duel's winner is already
    # frozen on the row, so tallying its sides would be wasted work.
    live_rows = [row for row in duel_rows if row.status != DuelStatus.resolved]
    praxis_ids = {row.challenger_praxis_id for row in live_rows}
    praxis_ids.update(
        row.opponent_praxis_id
        for row in live_rows
        if row.opponent_praxis_id is not None
    )
    tallies = await tally_votes(list(praxis_ids), session)

    # A live tie needs both sides' factions to resolve the Snide tiebreak (#748):
    # Snide takes ties, so it must win the badge on a tie exactly as it wins the
    # multiplier. One set-based query over the live sides, never per-character.
    faction_by_character: dict[int, str] = {}
    tie_side_ids = {row.challenger_character_id for row in live_rows}
    tie_side_ids.update(row.opponent_character_id for row in live_rows)
    tie_side_ids.discard(None)
    if tie_side_ids:
        faction_rows = await session.execute(
            select(Character.id, Character.faction_slug).where(
                Character.id.in_(tie_side_ids)
            )
        )
        faction_by_character = {
            character_id: (slug or "") for character_id, slug in faction_rows.all()
        }

    winners: set[int] = set()
    last_era_winners: set[int] = set()
    for row in duel_rows:
        if row.status == DuelStatus.resolved:
            # Frozen fact (#824): trust the recorded winner, never the points.
            winner_character_id: Optional[int] = row.winner_character_id
        else:
            opponent_points = (
                get_tally(tallies, row.opponent_praxis_id).points_from_votes
                if row.opponent_praxis_id is not None
                else 0
            )
            winner_character_id = duel_winner(
                challenger_character_id=row.challenger_character_id,
                opponent_character_id=row.opponent_character_id,
                challenger_points=get_tally(
                    tallies, row.challenger_praxis_id
                ).points_from_votes,
                opponent_points=opponent_points,
                challenger_moderation=row.challenger_moderation,
                opponent_moderation=row.opponent_moderation,
                forfeited_by_character_id=row.forfeited_by_character_id,
                tie_break_winner_id=sole_tie_taker_id(
                    faction_by_character.get(row.challenger_character_id, ""),
                    row.challenger_character_id,
                    faction_by_character.get(row.opponent_character_id, ""),
                    row.opponent_character_id,
                    era,
                ),
            )
        if winner_character_id is None or winner_character_id not in character_ids:
            continue
        winners.add(winner_character_id)
        # "Last era" is a property of the *freeze*, not of the win: only a
        # resolved duel carries a `resolved_era_id`, and only the era immediately
        # before the current one counts. An older frozen win keeps `duelist` and
        # loses `duel_victor` — the badge lapses one era after it is earned.
        if (
            row.status == DuelStatus.resolved
            and previous_era_id is not None
            and row.resolved_era_id == previous_era_id
        ):
            last_era_winners.add(winner_character_id)
    return DuelWinnerFacts(
        winners=frozenset(winners),
        last_era_winners=frozenset(last_era_winners),
    )


async def build_badge_contexts(
    characters: Iterable[Character],
    session: AsyncSession,
) -> dict[int, BadgeContext]:
    """Assemble each character's :class:`BadgeContext`, keyed by id.

    ``Character.account`` is ``lazy="raise"`` — siblings are queried explicitly
    by ``account_id``. One ``GROUP BY account_id`` row per distinct account
    carries both per-account facts a condition can consult: how many characters
    the account owns, and which of them is "earliest" — first by
    ``(created_at, id)``, id breaking same-instant creation ties.

    The sibling count is deliberately unfiltered by status: a puppet is a puppet
    whether or not the list path would surface it.

    The two duel facts (#748, #823) are per-*character*, so they get their own
    set-based pass over the page (:func:`_duel_winner_facts`) rather than a query
    inside the loop — one pass for both, since "won last era" is a filter on the
    same winners rather than a second source.
    """
    characters = list(characters)
    account_ids = {character.account_id for character in characters}
    if not account_ids:
        return {}

    result = await session.execute(
        select(
            Character.account_id,
            func.count(Character.id).label("character_count"),
            # Postgres arrays are 1-indexed: [1] is the earliest by (created_at, id).
            array_agg(
                aggregate_order_by(
                    Character.id,
                    Character.created_at.asc(),
                    Character.id.asc(),
                )
            )[1].label("earliest_id"),
        )
        .where(Character.account_id.in_(account_ids))
        .group_by(Character.account_id)
    )
    by_account = {
        account_id: (character_count, earliest_id)
        for account_id, character_count, earliest_id in result.all()
    }

    duel_facts = await _duel_winner_facts(
        {character.id for character in characters}, session
    )

    contexts: dict[int, BadgeContext] = {}
    for character in characters:
        character_count, earliest_id = by_account.get(
            character.account_id, (1, character.id)
        )
        contexts[character.id] = BadgeContext(
            account_character_count=character_count,
            is_earliest_on_account=character.id == earliest_id,
            is_duel_winner=character.id in duel_facts.winners,
            won_duel_last_era=character.id in duel_facts.last_era_winners,
        )
    return contexts


async def build_badge_context(
    character: Character,
    session: AsyncSession,
) -> BadgeContext:
    """Single-character :func:`build_badge_contexts` — the same query shape."""
    contexts = await build_badge_contexts([character], session)
    return contexts[character.id]


def evaluate_badges(context: BadgeContext) -> list[BadgeOut]:
    """Every registry badge whose condition holds, in registry order."""
    return [
        BadgeOut(key=badge.key, name=badge.name)
        for badge in ALL_BADGES
        if badge.condition(context)
    ]


async def list_badges_for_character(
    character: Character,
    session: AsyncSession,
) -> list[BadgeOut]:
    context = await build_badge_context(character, session)
    return evaluate_badges(context)

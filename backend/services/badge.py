"""Badge evaluation service (ADR-0033, #459).

Evaluates the code-defined :data:`badges.ALL_BADGES` registry against a
per-character :class:`badges.BadgeContext` built from explicit queries.

No fact a badge condition consults is allowed to cost one query *per character*
on a list path: :func:`build_badge_contexts` folds the whole page into a fixed
number of set-based queries and assembles each context in memory (#655). The
rule is "never *per-character* on list paths", not "never on list paths".
"""
from typing import Iterable, Optional

from sqlalchemy import func, or_, select
from sqlalchemy.dialects.postgresql import aggregate_order_by, array_agg
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from badges import ALL_BADGES, BadgeContext
from models.character import Character
from models.duel import Duel, DuelStatus
from models.praxis import Praxis
from schemas.character import BadgeOut
from services.duel_outcome import duel_winner
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


async def _duel_winning_character_ids(
    character_ids: set[int],
    session: AsyncSession,
) -> set[int]:
    """Ids of the given characters that have won or are winning a duel (#748).

    Two set-based queries regardless of page size: one for every badge-eligible
    duel any of these characters is a side of (joined to the challenger's praxis,
    which is where the challenger's character id lives), then one
    :func:`tally_votes` over the *live* sides' praxis ids.

    Frozen and live split the same way :mod:`services.praxis_scoring` splits
    them:

    * ``resolved`` — read the frozen ``Duel.winner_character_id`` directly.
      #824 froze it at era close on purpose; recomputing would re-open a settled
      fact, and these duels need no tally row at all.
    * ``active`` / ``settled`` — the winner comes from the one shared rule
      (:func:`services.duel_outcome.duel_winner`, ADR-0052) over the live tally:
      forfeit first, then strictly-greater ``points_from_votes``, else a tie.

    Never infer a winner from the points: a forfeit winner can hold the *lower*
    score, frozen or live.
    """
    if not character_ids:
        return set()

    challenger_praxis = aliased(Praxis)
    duel_rows = (
        await session.execute(
            select(
                challenger_praxis.created_by_id.label("challenger_character_id"),
                Duel.opponent_character_id,
                Duel.challenger_praxis_id,
                Duel.opponent_praxis_id,
                Duel.forfeited_by_character_id,
                Duel.status,
                Duel.winner_character_id,
            )
            .join(
                challenger_praxis,
                challenger_praxis.id == Duel.challenger_praxis_id,
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
        return set()

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

    winners: set[int] = set()
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
                forfeited_by_character_id=row.forfeited_by_character_id,
            )
        if winner_character_id is not None and winner_character_id in character_ids:
            winners.add(winner_character_id)
    return winners


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

    The duel-winner fact (#748) is per-*character*, so it gets its own
    set-based pass over the page (:func:`_duel_winning_character_ids`) rather
    than a query inside the loop.
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

    duel_winners = await _duel_winning_character_ids(
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
            is_duel_winner=character.id in duel_winners,
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

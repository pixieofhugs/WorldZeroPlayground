"""Badge evaluation service (ADR-0033, #459).

Evaluates :data:`badges.ALL_BADGES` against a per-character
:class:`badges.BadgeContext`. List paths must never cost a query per character:
:func:`build_badge_contexts` uses a fixed number of set-based queries (#655).
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

# `resolved` included (#748): the badge means "won or winning", so a frozen win counts.
BADGE_DUEL_STATUSES: tuple[DuelStatus, ...] = (
    DuelStatus.active,
    DuelStatus.settled,
    DuelStatus.resolved,
)


@dataclass(frozen=True)
class DuelWinnerFacts:
    """The two per-character duel facts, read out of one pass over the duels."""

    # `duelist` (#748): won or winning, ever.
    winners: frozenset[int] = frozenset()
    # `duel_victor` (#823): frozen winner at the previous era's close. Subset of
    # `winners`.
    last_era_winners: frozenset[int] = frozenset()


async def _previous_era_id(session: AsyncSession) -> Optional[int]:
    """Id of the era before the current one, or None if none has ever closed.

    Second-highest id (rows are append-only). Not a timestamp comparison: a
    duel's ``resolved_at`` lands just *after* the new era's ``started_at``.
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

    Fixed query count regardless of page size: the duels, one
    :func:`tally_votes` over live sides, the previous era id.

    Split as in :mod:`services.praxis_scoring`: ``resolved`` reads the frozen
    ``Duel.winner_character_id`` (#824); live duels use
    :func:`services.duel_outcome.duel_winner` (ADR-0052). Never infer a winner
    from points — a forfeit winner can hold the lower score.
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
            # Outer: an `active` duel has no opponent praxis yet;
            # moderation feeds #1442.
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

    # Unconditional so query count is page-independent (batch guard, ADR-0033).
    previous_era_id = await _previous_era_id(session)

    live_rows = [row for row in duel_rows if row.status != DuelStatus.resolved]
    praxis_ids = {row.challenger_praxis_id for row in live_rows}
    praxis_ids.update(
        row.opponent_praxis_id
        for row in live_rows
        if row.opponent_praxis_id is not None
    )
    tallies = await tally_votes(list(praxis_ids), session)

    # Factions for the Snide tiebreak on live ties (#748).
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
        # `duel_victor` lapses one era after it is earned; `duelist` never does.
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

    ``Character.account`` is ``lazy="raise"``, so siblings are one
    ``GROUP BY account_id`` query: count, and earliest by ``(created_at, id)``.
    The count is unfiltered by status: a puppet is a puppet.
    """
    characters = list(characters)
    account_ids = {character.account_id for character in characters}
    if not account_ids:
        return {}

    result = await session.execute(
        select(
            Character.account_id,
            func.count(Character.id).label("character_count"),
            # Postgres arrays are 1-indexed.
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

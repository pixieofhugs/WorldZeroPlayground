"""Praxis scoring for both read and recalc paths (ADR-0014).

Async gather-and-assemble over the pure arithmetic in ``services.scoring``.
"""
from dataclasses import dataclass
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from faction_slugs import CROSS_FACTION_SLUG, UNAFFILIATED_FACTION_SLUG
from game_config import EraConfig
from models.character import Character
from models.duel import Duel, DuelStatus
from models.praxis import ModerationStatus, Praxis, PraxisMember, PraxisType
from models.task import Task
from services.duel_outcome import duel_winner
from services.meta_task import get_meta_task_points_bulk
from services.scoring import (
    COLLABORATION_MODE_COLLAB,
    COLLABORATION_MODE_SOLO,
    compute_duel_multiplier,
    compute_faction_multiplier,
    compute_praxis_score,
)
from services.vote_tally import VoteTally, get_tally, tally_votes


@dataclass(frozen=True)
class Contribution:
    """Points one character earns from one praxis.

    total = base_points × faction_multiplier × duel_multiplier
            + metatask_points + points_from_votes + habit_bonus_points

    Only ``base_points`` multiplies (ADR-0086). ``habit_bonus_points`` is the
    value stamped at seal time (#1617), never recomputed.
    """

    base_points: int
    metatask_points: int
    faction_multiplier: float
    duel_multiplier: float
    points_from_votes: int
    habit_bonus_points: int
    total: float


async def compute_contributions(
    praxes: list[Praxis],
    character: Character,
    era: EraConfig,
    session: AsyncSession,
    *,
    character_level: int = 0,
) -> dict[int, Contribution]:
    """Return a ``Contribution`` for each praxis id in ``praxes``.

    ``praxes``: the caller-gathered submitted, non-hidden praxes this character
    authored (solo/duel) or is a collab member of. Bulk queries, no N+1.
    """
    if not praxes:
        return {}

    praxis_ids = [p.id for p in praxes]

    task_ids = {p.task_id for p in praxes}
    tasks_result = await session.execute(
        select(Task).where(Task.id.in_(task_ids))
    )
    tasks_by_id: dict[int, Task] = {t.id: t for t in tasks_result.scalars()}

    tallies = await tally_votes(praxis_ids, session)

    # ``resolved`` included so an era-frozen duel keeps its modifier (ADR-0052).
    duel_result = await session.execute(
        select(Duel).where(
            (Duel.challenger_praxis_id.in_(praxis_ids))
            | (Duel.opponent_praxis_id.in_(praxis_ids)),
            Duel.status.in_(
                [DuelStatus.active, DuelStatus.settled, DuelStatus.resolved]
            ),
        )
    )
    duels = list(duel_result.scalars().all())

    duel_by_own_praxis: dict[int, Duel] = {}
    opponent_praxis_ids: set[int] = set()
    for duel in duels:
        if duel.challenger_praxis_id in praxis_ids:
            duel_by_own_praxis[duel.challenger_praxis_id] = duel
            if duel.opponent_praxis_id is not None:
                opponent_praxis_ids.add(duel.opponent_praxis_id)
        if duel.opponent_praxis_id in praxis_ids:
            duel_by_own_praxis[duel.opponent_praxis_id] = duel
            opponent_praxis_ids.add(duel.challenger_praxis_id)

    opp_praxes_by_id: dict[int, Praxis] = {}
    opp_characters_by_id: dict[int, Character] = {}
    if opponent_praxis_ids:
        opp_praxis_result = await session.execute(
            select(Praxis).where(Praxis.id.in_(opponent_praxis_ids))
        )
        opp_praxes_by_id = {p.id: p for p in opp_praxis_result.scalars()}

        opp_character_ids = {p.created_by_id for p in opp_praxes_by_id.values()}
        if opp_character_ids:
            opp_char_result = await session.execute(
                select(Character).where(Character.id.in_(opp_character_ids))
            )
            opp_characters_by_id = {c.id: c for c in opp_char_result.scalars()}

    opp_tallies: dict[int, VoteTally] = {}
    if opponent_praxis_ids:
        opp_tallies = await tally_votes(list(opponent_praxis_ids), session)

    # Every praxis type earns metatask points (ADR-0051), outside both
    # multipliers (ADR-0086). Same rows as praxis_out.applied_metatasks_for (the
    # seal set):
    # the level gate can zero the points while the seal stays, which is legitimate.
    meta_points = await get_meta_task_points_bulk(
        praxis_ids, character_level=character_level, session=session
    )

    # Habit bonus as stamped at seal (#1617), never derived: the two callers hold
    # different praxis sets and would disagree (see services.habit_bonus). This
    # character's rows only. A query, not ``praxis.members``: in-session praxes
    # have unloaded collections (lazy load raises ``MissingGreenlet``).
    habit_result = await session.execute(
        select(PraxisMember.praxis_id, PraxisMember.habit_bonus_points).where(
            PraxisMember.praxis_id.in_(praxis_ids),
            PraxisMember.character_id == character.id,
        )
    )
    habit_bonus_by_praxis: dict[int, int] = dict(habit_result.all())

    contributions: dict[int, Contribution] = {}
    character_faction = character.faction_slug or UNAFFILIATED_FACTION_SLUG

    for praxis in praxes:
        task = tasks_by_id.get(praxis.task_id)
        if task is None:
            continue

        task_faction = task.primary_faction_slug or CROSS_FACTION_SLUG
        own_tally = get_tally(tallies, praxis.id)
        base_points = task.point_value
        metatask_points = meta_points.get(praxis.id, 0)
        habit_bonus_points = habit_bonus_by_praxis.get(praxis.id, 0)

        if praxis.type == PraxisType.collab:
            faction_multiplier = compute_faction_multiplier(
                character_faction, task_faction, era,
                collaboration_mode=COLLABORATION_MODE_COLLAB,
            )
            duel_multiplier = 1.0

        elif praxis.id in duel_by_own_praxis:
            duel = duel_by_own_praxis[praxis.id]
            if duel.challenger_praxis_id == praxis.id:
                opp_id: Optional[int] = duel.opponent_praxis_id
            else:
                opp_id = duel.challenger_praxis_id

            opp_tally = get_tally(opp_tallies, opp_id) if opp_id is not None else VoteTally(0, 0)

            opp_praxis = opp_praxes_by_id.get(opp_id) if opp_id is not None else None
            opponent_faction = UNAFFILIATED_FACTION_SLUG
            if opp_praxis is not None:
                opp_char = opp_characters_by_id.get(opp_praxis.created_by_id)
                if opp_char is not None:
                    opponent_faction = opp_char.faction_slug or UNAFFILIATED_FACTION_SLUG

            faction_multiplier = compute_faction_multiplier(
                character_faction, task_faction, era,
                collaboration_mode=COLLABORATION_MODE_SOLO,
            )
            # Shared winner rule (ADR-0052), live until era close freezes
            # winner_character_id; then the frozen winner is authoritative.
            if duel.status == DuelStatus.resolved:
                winner_character_id: Optional[int] = duel.winner_character_id
            else:
                opp_moderation: Optional[ModerationStatus] = (
                    opp_praxis.moderation_status if opp_praxis is not None else None
                )
                if duel.challenger_praxis_id == praxis.id:
                    challenger_character_id: Optional[int] = character.id
                    challenger_points = own_tally.points_from_votes
                    opponent_points = opp_tally.points_from_votes
                    challenger_moderation = praxis.moderation_status
                    opponent_moderation = opp_moderation
                else:
                    challenger_character_id = (
                        opp_praxis.created_by_id if opp_praxis is not None else None
                    )
                    challenger_points = opp_tally.points_from_votes
                    opponent_points = own_tally.points_from_votes
                    challenger_moderation = opp_moderation
                    opponent_moderation = praxis.moderation_status

                winner_character_id = duel_winner(
                    challenger_character_id=challenger_character_id,
                    opponent_character_id=duel.opponent_character_id,
                    challenger_points=challenger_points,
                    opponent_points=opponent_points,
                    challenger_moderation=challenger_moderation,
                    opponent_moderation=opponent_moderation,
                    forfeited_by_character_id=duel.forfeited_by_character_id,
                )
            duel_multiplier = compute_duel_multiplier(
                character_faction,
                opponent_faction,
                is_winner=winner_character_id == character.id,
                is_tied=winner_character_id is None,
                era=era,
            )

        else:
            faction_multiplier = compute_faction_multiplier(
                character_faction, task_faction, era,
                collaboration_mode=COLLABORATION_MODE_SOLO,
            )
            duel_multiplier = 1.0

        total = compute_praxis_score(
            base_points,
            faction_multiplier,
            own_tally.points_from_votes,
            meta_task_points=metatask_points,
            duel_multiplier=duel_multiplier,
            habit_bonus=habit_bonus_points,
        )

        contributions[praxis.id] = Contribution(
            base_points=base_points,
            metatask_points=metatask_points,
            faction_multiplier=faction_multiplier,
            duel_multiplier=duel_multiplier,
            points_from_votes=own_tally.points_from_votes,
            habit_bonus_points=habit_bonus_points,
            total=total,
        )

    return contributions

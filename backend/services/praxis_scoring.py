"""Praxis scoring — single interface for both read and recalc paths (ADR-0014).

``compute_contributions`` is the one function that produces a
``Contribution`` breakdown for each (character, praxis) pair.
It replaces the scattered ``compute_praxis_score_from_db`` read path and the
``_score_*`` / ``_fetch_*`` helpers in ``character_stats.py``.

The pure arithmetic lives in ``services.scoring``; this module is the async
gather-and-assemble layer on top of it.
"""
from dataclasses import dataclass
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import EraConfig
from models.character import Character
from models.duel import Duel, DuelStatus
from models.praxis import ModerationStatus, Praxis, PraxisType
from models.task import Task
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
    """Points one character earns from one praxis — a frozen breakdown.

    total = (base_points + metatask_points) × faction_multiplier
            × duel_multiplier + points_from_votes
    """

    base_points: int
    metatask_points: int
    faction_multiplier: float
    duel_multiplier: float
    points_from_votes: int
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

    ``praxes`` must be the submitted, non-hidden praxes this character has a
    stake in: solo/duel praxes they authored, plus collab praxes they are
    a member of. The caller is responsible for gathering them; this function
    is pure scoring arithmetic over that set.

    Uses bulk queries: one task fetch, one vote tally, one duel query, one
    opponent fetch — no N+1 in the praxis count.
    """
    if not praxes:
        return {}

    praxis_ids = [p.id for p in praxes]

    # ── bulk-fetch tasks ────────────────────────────────────────────────────
    task_ids = {p.task_id for p in praxes}
    tasks_result = await session.execute(
        select(Task).where(Task.id.in_(task_ids))
    )
    tasks_by_id: dict[int, Task] = {t.id: t for t in tasks_result.scalars()}

    # ── vote tallies for all praxes ─────────────────────────────────────────
    tallies = await tally_votes(praxis_ids, session)

    # ── duel info for solo praxes ────────────────────────────────────────────
    # A solo praxis may be a duel side (ADR-0011). Fetch all active/settled
    # duels that reference any of our praxes in one query.
    duel_result = await session.execute(
        select(Duel).where(
            (Duel.challenger_praxis_id.in_(praxis_ids))
            | (Duel.opponent_praxis_id.in_(praxis_ids)),
            Duel.status.in_([DuelStatus.active, DuelStatus.settled]),
        )
    )
    duels = list(duel_result.scalars().all())

    # Map own praxis id → duel row
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

    # Fetch opponent praxes and their characters for faction slug
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

    # Fetch opponent vote tallies (needed for duel win/loss determination)
    opp_tallies: dict[int, VoteTally] = {}
    if opponent_praxis_ids:
        opp_tallies = await tally_votes(list(opponent_praxis_ids), session)

    # ── meta task points for non-duel solo praxes ───────────────────────────
    # Collab and duel praxes get 0 metatask points (preserving current behaviour).
    solo_non_duel_ids = [
        p.id for p in praxes
        if p.type == PraxisType.solo and p.id not in duel_by_own_praxis
    ]
    meta_points = await get_meta_task_points_bulk(
        solo_non_duel_ids, character_level=character_level, session=session
    )

    # ── assemble contributions ───────────────────────────────────────────────
    contributions: dict[int, Contribution] = {}
    character_faction = character.faction_slug or "na"

    for praxis in praxes:
        task = tasks_by_id.get(praxis.task_id)
        if task is None:
            continue

        task_faction = task.primary_faction_slug or "na"
        own_tally = get_tally(tallies, praxis.id)
        base_points = task.point_value
        metatask_points = 0

        if praxis.type == PraxisType.collab:
            faction_multiplier = compute_faction_multiplier(
                character_faction, task_faction, era,
                collaboration_mode=COLLABORATION_MODE_COLLAB,
            )
            duel_multiplier = 1.0

        elif praxis.id in duel_by_own_praxis:
            # Duel side: compare own votes vs opponent's
            duel = duel_by_own_praxis[praxis.id]
            if duel.challenger_praxis_id == praxis.id:
                opp_id: Optional[int] = duel.opponent_praxis_id
            else:
                opp_id = duel.challenger_praxis_id

            opp_tally = get_tally(opp_tallies, opp_id) if opp_id is not None else VoteTally(0, 0)

            opp_praxis = opp_praxes_by_id.get(opp_id) if opp_id is not None else None
            opponent_faction = "na"
            if opp_praxis is not None:
                opp_char = opp_characters_by_id.get(opp_praxis.created_by_id)
                if opp_char is not None:
                    opponent_faction = opp_char.faction_slug or "na"

            faction_multiplier = compute_faction_multiplier(
                character_faction, task_faction, era,
                collaboration_mode=COLLABORATION_MODE_SOLO,
            )
            if duel.forfeited_by_character_id is not None:
                # ADR-0011 §Forfeit: the opponent wins by default; vote tallies
                # don't decide the outcome. The forfeiter takes the loss modifier.
                duel_multiplier = compute_duel_multiplier(
                    character_faction,
                    opponent_faction,
                    is_winner=character.id != duel.forfeited_by_character_id,
                    is_tied=False,
                    era=era,
                )
            else:
                own_pts = own_tally.points_from_votes
                opp_pts = opp_tally.points_from_votes
                duel_multiplier = compute_duel_multiplier(
                    character_faction,
                    opponent_faction,
                    is_winner=own_pts > opp_pts,
                    is_tied=own_pts == opp_pts,
                    era=era,
                )

        else:
            # Plain solo praxis
            faction_multiplier = compute_faction_multiplier(
                character_faction, task_faction, era,
                collaboration_mode=COLLABORATION_MODE_SOLO,
            )
            duel_multiplier = 1.0
            metatask_points = meta_points.get(praxis.id, 0)

        total = compute_praxis_score(
            base_points,
            faction_multiplier,
            own_tally.points_from_votes,
            meta_task_points=metatask_points,
            duel_multiplier=duel_multiplier,
        )

        contributions[praxis.id] = Contribution(
            base_points=base_points,
            metatask_points=metatask_points,
            faction_multiplier=faction_multiplier,
            duel_multiplier=duel_multiplier,
            points_from_votes=own_tally.points_from_votes,
            total=total,
        )

    return contributions

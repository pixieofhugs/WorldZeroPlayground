"""Era 2's rules, proved against ``ERA_2`` whatever is live (#2709).

Pass ``ERA_2`` explicitly; monkeypatching ``CURRENT_ERA`` can't reach
def-time defaults. The ``era`` fixture row is just the window/FK (ADR-0042).
"""
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import ERA_2
from models.character_stats import CharacterStats
from models.duel import Duel, DuelStatus
from models.era import Era
from models.faction_defection_history import FactionDefectionHistory
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import TaskStatus
from seed import upsert_era_factions
from services.character_capabilities import compute_capabilities
from services.character_stats import recalculate_character_stats
from services.habit_bonus import faction_habit_bonus_points
from services.meta_task import faction_bypasses_metatask_level
from services.praxis import evaluate_signup
from services.praxis_scoring import compute_contributions
from tests.integration.factories import (
    cast_vote,
    make_character,
    make_solo_praxis,
    make_task,
    rejoin_gate_open,
)

ERA_2_SLUGS = sorted(ERA_2.factions)

#: Another real faction; never ``na``, which scores as own-faction for everyone.
def _other_slug(slug: str) -> str:
    return "wow" if slug == "snide" else "snide"


async def _seed_factions(session: AsyncSession) -> None:
    await upsert_era_factions(session, ERA_2)


async def _bank_one_praxis(
    session: AsyncSession,
    era: Era,
    *,
    label: str,
    faction_slug: str,
    task_faction_slug: str,
    point_value: int = 10,
    praxis_type: PraxisType = PraxisType.solo,
) -> int:
    """Seal one praxis under ``ERA_2`` and return the score it banks."""
    await _seed_factions(session)
    member = await make_character(
        session, era, username=label, faction_slug=faction_slug
    )
    task = await make_task(
        session,
        member,
        title=f"{label} task",
        point_value=point_value,
        faction_slug=task_faction_slug,
    )
    praxis = Praxis(
        task_id=task.id,
        created_by_id=member.id,
        type=praxis_type,
        title=label,
        body_text="proof",
        status=PraxisStatus.submitted,
    )
    session.add(praxis)
    await session.flush()
    session.add(PraxisMember(praxis_id=praxis.id, character_id=member.id))
    await session.commit()

    await recalculate_character_stats(member.id, session, ERA_2, emit_taunts=False)
    await session.commit()
    return (
        await session.execute(
            select(CharacterStats.score).where(
                CharacterStats.character_id == member.id,
                CharacterStats.era_id == era.id,
            )
        )
    ).scalar_one()


# own_task_modifier / other_task_modifier: the era's headline rule

@pytest.mark.asyncio
@pytest.mark.parametrize("faction_slug", ERA_2_SLUGS)
async def test_a_solo_praxis_on_your_own_faction_task_pays_a_fifth_more(
    db_session: AsyncSession, era: Era, faction_slug: str
):
    """Literal expectation on purpose, so flattening the rule fails here."""
    assert ERA_2.factions[faction_slug].own_task_modifier == 1.2
    score = await _bank_one_praxis(
        db_session,
        era,
        label=f"{faction_slug}own",
        faction_slug=faction_slug,
        task_faction_slug=faction_slug,
    )
    assert score == 12


@pytest.mark.asyncio
@pytest.mark.parametrize("faction_slug", ERA_2_SLUGS)
async def test_a_solo_praxis_on_another_factions_task_pays_a_fifth_less(
    db_session: AsyncSession, era: Era, faction_slug: str
):
    assert ERA_2.factions[faction_slug].other_task_modifier == 0.8
    score = await _bank_one_praxis(
        db_session,
        era,
        label=f"{faction_slug}other",
        faction_slug=faction_slug,
        task_faction_slug=_other_slug(faction_slug),
    )
    assert score == 8


@pytest.mark.asyncio
@pytest.mark.parametrize("task_owner", ["own", "other"])
async def test_a_collab_stays_flat_on_both_sides(
    db_session: AsyncSession, era: Era, task_owner: str
):
    """The 120/80 split is solo and duel only; collabs stay flat. Owner ruling, see
    ``eras/era_2.py``."""
    task_faction_slug = "snide" if task_owner == "own" else _other_slug("snide")
    assert ERA_2.factions["snide"].collab_own_modifier == 1.0
    assert ERA_2.factions["snide"].collab_other_modifier == 1.0

    score = await _bank_one_praxis(
        db_session,
        era,
        label=f"snidecollab{task_owner}",
        faction_slug="snide",
        task_faction_slug=task_faction_slug,
        praxis_type=PraxisType.collab,
    )

    assert score == 10


# Snide: duel_win_modifier / duel_loss_modifier

@pytest.mark.asyncio
@pytest.mark.parametrize("snide_wins", [True, False])
async def test_snide_carries_its_whole_duel_gamble_into_metamorphosis(
    db_session: AsyncSession, era: Era, snide_wins: bool
):
    """Stacks on the own/other split. Hand-built: ``make_duel`` uses the live era's
    default faction."""
    snide = ERA_2.factions["snide"]
    assert (snide.duel_win_modifier, snide.duel_loss_modifier) == (2.0, 0.0)
    await _seed_factions(db_session)

    challenger = await make_character(
        db_session, era, username="snideduel", faction_slug="snide"
    )
    opponent = await make_character(
        db_session, era, username="wowduel", faction_slug="wow"
    )
    voter = await make_character(
        db_session, era, username="duelvoter", faction_slug="na"
    )
    task = await make_task(
        db_session, challenger, title="Duel task", faction_slug="snide"
    )
    challenger_praxis = await make_solo_praxis(
        db_session, task, challenger, title="mine"
    )
    opponent_praxis = await make_solo_praxis(
        db_session, task, opponent, title="theirs"
    )
    stars = 5 if snide_wins else 1
    await cast_vote(db_session, challenger_praxis, voter, stars)
    await cast_vote(db_session, opponent_praxis, voter, 1 if snide_wins else 5)
    db_session.add(
        Duel(
            task_id=task.id,
            challenger_praxis_id=challenger_praxis.id,
            opponent_character_id=opponent.id,
            opponent_praxis_id=opponent_praxis.id,
            status=DuelStatus.settled,
        )
    )
    await db_session.flush()

    contributions = await compute_contributions(
        [challenger_praxis], challenger, ERA_2, db_session
    )

    (contribution,) = contributions.values()
    duel_multiplier = (
        snide.duel_win_modifier if snide_wins else snide.duel_loss_modifier
    )
    assert contribution.duel_multiplier == duel_multiplier
    assert contribution.faction_multiplier == snide.own_task_modifier
    assert contribution.total == (
        task.point_value * snide.own_task_modifier * duel_multiplier + stars
    )


# WOW: level_jump_reach

@pytest.mark.asyncio
@pytest.mark.parametrize("faction_slug,expected", [("wow", True), ("snide", False)])
async def test_only_wow_reaches_a_level_above_its_own(
    db_session: AsyncSession, era: Era, faction_slug: str, expected: bool
):
    assert ERA_2.factions["wow"].level_jump_reach == 1
    await _seed_factions(db_session)
    member = await make_character(
        db_session, era, username=f"{faction_slug}jumper", faction_slug=faction_slug
    )
    task = await make_task(
        db_session, member, title="One up", level_required=1, faction_slug=faction_slug
    )

    eligibility = await evaluate_signup(member, task, db_session, ERA_2)
    assert eligibility.allowed is expected


# Everymen: can_hold_multiple_memberships (Double Dipper)

@pytest.mark.asyncio
@pytest.mark.parametrize(
    "faction_slug,expected", [("everymen", True), ("snide", False)]
)
async def test_only_everymen_claims_a_task_it_is_already_on(
    db_session: AsyncSession, era: Era, faction_slug: str, expected: bool
):
    await _seed_factions(db_session)
    member = await make_character(
        db_session, era, username=f"{faction_slug}dipper", faction_slug=faction_slug
    )
    task = await make_task(db_session, member, faction_slug=faction_slug)
    await make_solo_praxis(db_session, task, member, status=PraxisStatus.in_progress)

    eligibility = await evaluate_signup(member, task, db_session, ERA_2)
    assert eligibility.allowed is expected


# Albescent: can_always_rejoin, can_apply_metatask_at_any_level

@pytest.mark.asyncio
@pytest.mark.parametrize(
    "faction_slug,expected", [("albescent", True), ("snide", False)]
)
async def test_only_an_always_rejoinable_faction_reopens_after_a_defection(
    db_session: AsyncSession, era: Era, faction_slug: str, expected: bool
):
    assert ERA_2.factions["albescent"].can_always_rejoin is True
    await _seed_factions(db_session)
    defector = await make_character(
        db_session, era, username=f"{faction_slug}exile", faction_slug="na"
    )
    db_session.add(
        FactionDefectionHistory(
            character_id=defector.id, faction_slug=faction_slug, era_id=era.id
        )
    )
    await db_session.flush()

    allowed = await rejoin_gate_open(
        defector.id, faction_slug, era.id, db_session, ERA_2
    )
    assert allowed is expected


def test_albescent_applies_a_metatask_below_the_level_gate():
    """Stated by Era 2's config, not inherited (#1871)."""
    assert faction_bypasses_metatask_level("albescent", ERA_2) is True
    assert faction_bypasses_metatask_level("snide", ERA_2) is False
    assert ERA_2.metatask_apply_level > 0

    albescent = compute_capabilities(0, False, ERA_2, faction_slug="albescent")
    snide = compute_capabilities(0, False, ERA_2, faction_slug="snide")
    assert albescent.can_apply_metatask is True
    assert snide.can_apply_metatask is False


# Era 1 rules that lose their subject here

def test_no_faction_carries_a_habit_bonus_or_a_collab_bonus():
    """No UA or Coven here; pinned as deliberate."""
    for slug in ERA_2_SLUGS:
        assert faction_habit_bonus_points(slug, ERA_2) == 0
        assert ERA_2.factions[slug].collab_own_modifier == 1.0
        assert ERA_2.factions[slug].collab_other_modifier == 1.0


@pytest.mark.asyncio
async def test_task_vision_is_not_conjured_for_an_inheritor(
    db_session: AsyncSession, era: Era
):
    """Albescent inherits only perks someone holds; no Ephemerists, no Task Vision
    (#1871)."""
    assert ERA_2.allow_praxis_on_retired_task_factions == frozenset()
    await _seed_factions(db_session)
    member = await make_character(
        db_session, era, username="albseer", faction_slug="albescent"
    )
    task = await make_task(
        db_session,
        member,
        title="Gone",
        status=TaskStatus.retired,
        faction_slug="albescent",
    )

    eligibility = await evaluate_signup(member, task, db_session, ERA_2)
    assert eligibility.allowed is False

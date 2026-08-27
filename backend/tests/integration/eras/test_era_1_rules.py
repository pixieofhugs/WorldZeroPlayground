"""Era 1's rules, proved against ``ERA_1`` — never against whatever is live (#2709).

**The seam is the ``era: EraConfig`` parameter every service already takes.**
Passing ``CURRENT_ERA`` into a test named after a faction's perk reads as though
it tests that perk, and stops the day the era changes: Coven's 1.1 collab bonus
was the only fraction in Era 1 for the half-up rounding to round, so
``test_coven_collab_banks_half_up`` — the file this module absorbs — could not
have failed under Era 2 no matter what the rounding code did. Every call below
names ``ERA_1``, so these tests keep asserting Era 1's rules after the rollover,
which is the only time an era's rules can be quietly re-tuned unnoticed.

The ``era`` fixture's **row** is still whatever the live era is, and that is
correct: ADR-0042 splits config (owns the rules) from the DB (owns the history).
The row is the window the praxes fall inside and the FK the stats row hangs off;
it decides nothing about what a praxis is worth.

Perks covered, one per faction, all ten axes the guard in
``tests/test_era_rules_modules.py`` finds Era 1 granting:

======================================  ==============================
``collab_own_modifier``                 Coven's +10%, and its rounding
``habit_bonus_points``                  UA's habit bonus
``level_jump_reach``                    WOW's level jump
``can_hold_multiple_memberships``       Everymen's Double Dipper
``allow_praxis_on_retired_task_factions``  Ephemerists' Task Vision
``duel_win_modifier``/``duel_loss_modifier``  Snide's gamble
``can_always_rejoin``                   Albescent's open door
``can_apply_metatask_at_any_level``     Albescent's metatask bypass
``reads_the_array``                     Singularity reads the config
======================================  ==============================
"""
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import ERA_1
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction_defection_history import FactionDefectionHistory
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import Task, TaskStatus
from seed import upsert_era_factions
from services.character_capabilities import compute_capabilities
from services.character_stats import recalculate_character_stats
from services.faction_service import can_join_faction
from services.habit_bonus import stamp_habit_bonus
from services.meta_task import faction_bypasses_metatask_level
from services.praxis import evaluate_signup
from services.praxis_scoring import compute_contributions
from tests.integration.factories import (
    make_character,
    make_duel,
    make_solo_praxis,
    make_task,
)


async def _seed_factions(session: AsyncSession) -> None:
    """Every faction Era 1 lists, read off the era rather than named here."""
    await upsert_era_factions(session, ERA_1)


# ---------------------------------------------------------------------------
# Coven — collab_own_modifier, and the rounding it is the only source of
# ---------------------------------------------------------------------------

# (task point value, banked score). The four rows of #1578's table plus the
# whole-number neighbours that made the old behaviour look arbitrary: under
# banker's rounding only 35 landed on a true binary half, so 35 lost a point and
# 25/45/55 did not. The modifier is read from the era, never restated, but the
# expected scores are literal — an era that changes it fails loudly instead of
# silently reintroducing a rounding surprise.
COVEN_COLLAB_SCORES = [
    (20, 22),
    (25, 28),
    (30, 33),
    (35, 39),
    (40, 44),
    (45, 50),
    (50, 55),
    (55, 61),
]


async def _seal_coven_collab(
    session: AsyncSession, era: Era, point_value: int
) -> Character:
    """A Coven character who has sealed one Coven collab worth ``point_value``."""
    await _seed_factions(session)
    witch = await make_character(
        session, era, username=f"witch{point_value}", faction_slug="coven"
    )
    task = await make_task(
        session,
        witch,
        title=f"Coven task {point_value}",
        point_value=point_value,
        faction_slug="coven",
    )
    praxis = Praxis(
        task_id=task.id,
        created_by_id=witch.id,
        type=PraxisType.collab,
        title=f"Coven collab {point_value}",
        body_text="proof",
        status=PraxisStatus.submitted,
    )
    session.add(praxis)
    await session.flush()
    session.add(PraxisMember(praxis_id=praxis.id, character_id=witch.id))
    await session.commit()
    return witch


@pytest.mark.asyncio
@pytest.mark.parametrize("point_value,expected_score", COVEN_COLLAB_SCORES)
async def test_coven_collab_banks_half_up(
    db_session: AsyncSession, era: Era, point_value: int, expected_score: int
):
    """The seeded Coven collab banks the half-up score, not the banker's one.

    The whole reason this module exists. ``ERA_1`` rather than ``CURRENT_ERA``
    is the entire fix: Coven carries the only non-1.0, non-duel, non-integer
    modifier in Era 1, and there is no Coven in Era 2 — so under the live era
    this would one day round nothing and pass forever.
    """
    assert ERA_1.factions["coven"].collab_own_modifier != 1.0, (
        "Era 1's Coven carries the fraction this rounding guard rounds"
    )
    witch = await _seal_coven_collab(db_session, era, point_value)

    await recalculate_character_stats(witch.id, db_session, ERA_1, emit_taunts=False)
    await db_session.commit()

    result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == witch.id,
            CharacterStats.era_id == era.id,
        )
    )
    assert result.scalar_one().score == expected_score


@pytest.mark.asyncio
async def test_coven_collab_contribution_carries_no_binary_error(
    db_session: AsyncSession, era: Era
):
    """A 100-point Coven collab contributes 110.0 — not 110.00000000000001."""
    witch = await _seal_coven_collab(db_session, era, 100)
    praxes = (
        (
            await db_session.execute(
                select(Praxis)
                .join(PraxisMember, PraxisMember.praxis_id == Praxis.id)
                .where(PraxisMember.character_id == witch.id)
            )
        )
        .scalars()
        .all()
    )

    contributions = await compute_contributions(
        list(praxes), witch, ERA_1, db_session
    )

    (contribution,) = contributions.values()
    # The modifier really is the one that used to grow a tail.
    assert contribution.faction_multiplier == (
        ERA_1.factions["coven"].collab_own_modifier
    )
    assert contribution.total == 110.0
    assert repr(contribution.total) == "110.0"


# ---------------------------------------------------------------------------
# UA — habit_bonus_points
# ---------------------------------------------------------------------------

async def _stamp_second_seal(
    session: AsyncSession, era: Era, faction_slug: str
) -> int:
    """Seal a praxis one day after a predecessor and return the member's stamp.

    Driven at ``stamp_habit_bonus``, the single writer, because it is the one
    seam on this path that takes an ``EraConfig``. The API route that reaches it
    reads ``CURRENT_ERA``, which is precisely the read this module must not make.
    """
    await _seed_factions(session)
    sealed_at = datetime.now(timezone.utc)
    member = await make_character(
        session, era, username=f"{faction_slug}habit", faction_slug=faction_slug
    )
    task = await make_task(session, member, faction_slug=faction_slug)

    predecessor = await make_solo_praxis(session, task, member, title="First")
    predecessor.submitted_at = sealed_at - timedelta(days=1)
    await session.flush()

    second_task = await make_task(
        session, member, title="Second", faction_slug=faction_slug
    )
    second = await make_solo_praxis(session, second_task, member, title="Second")
    second.submitted_at = sealed_at
    await session.flush()
    await session.refresh(second, ["members"])

    await stamp_habit_bonus(second, sealed_at, session, ERA_1)
    await session.flush()
    return (
        await session.execute(
            select(PraxisMember.habit_bonus_points).where(
                PraxisMember.praxis_id == second.id,
                PraxisMember.character_id == member.id,
            )
        )
    ).scalar_one()


@pytest.mark.asyncio
async def test_ua_banks_its_habit_bonus_on_the_second_seal(
    db_session: AsyncSession, era: Era
):
    """UA's only perk: a flat bonus for sealing inside the era's habit window."""
    granted = ERA_1.factions["ua"].habit_bonus_points
    assert granted > 0, "Era 1 gives UA a habit bonus; this test needs one"
    assert await _stamp_second_seal(db_session, era, "ua") == granted


@pytest.mark.asyncio
async def test_a_faction_without_the_habit_bonus_banks_nothing(
    db_session: AsyncSession, era: Era
):
    """Same two seals, a faction at the 0 baseline: the window is not the perk."""
    assert ERA_1.factions["coven"].habit_bonus_points == 0
    assert await _stamp_second_seal(db_session, era, "coven") == 0


# ---------------------------------------------------------------------------
# WOW — level_jump_reach
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.parametrize("faction_slug,expected", [("wow", True), ("coven", False)])
async def test_only_wow_reaches_a_level_above_its_own(
    db_session: AsyncSession, era: Era, faction_slug: str, expected: bool
):
    """A level-0 member signs up for a level-1 task iff their faction grants reach."""
    assert ERA_1.factions["wow"].level_jump_reach == 1
    await _seed_factions(db_session)
    member = await make_character(
        db_session, era, username=f"{faction_slug}jumper", faction_slug=faction_slug
    )
    task = await make_task(
        db_session, member, title="One up", level_required=1, faction_slug=faction_slug
    )

    eligibility = await evaluate_signup(member, task, db_session, ERA_1)
    assert eligibility.allowed is expected


# ---------------------------------------------------------------------------
# Everymen — can_hold_multiple_memberships (Double Dipper)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.parametrize(
    "faction_slug,expected", [("everymen", True), ("coven", False)]
)
async def test_only_everymen_claims_a_task_it_is_already_on(
    db_session: AsyncSession, era: Era, faction_slug: str, expected: bool
):
    """Double Dipper is the gap between "am I on this" and "may I claim it again"."""
    await _seed_factions(db_session)
    member = await make_character(
        db_session, era, username=f"{faction_slug}dipper", faction_slug=faction_slug
    )
    task = await make_task(db_session, member, faction_slug=faction_slug)
    await make_solo_praxis(
        db_session, task, member, status=PraxisStatus.in_progress
    )

    eligibility = await evaluate_signup(member, task, db_session, ERA_1)
    assert eligibility.allowed is expected


# ---------------------------------------------------------------------------
# Ephemerists — allow_praxis_on_retired_task_factions (Task Vision)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.parametrize(
    "faction_slug,expected", [("ephemerists", True), ("coven", False)]
)
async def test_only_task_vision_reaches_a_retired_task(
    db_session: AsyncSession, era: Era, faction_slug: str, expected: bool
):
    """The perk that is a frozenset of slugs on ``EraConfig``, not a field."""
    assert "ephemerists" in ERA_1.allow_praxis_on_retired_task_factions
    await _seed_factions(db_session)
    member = await make_character(
        db_session, era, username=f"{faction_slug}seer", faction_slug=faction_slug
    )
    task = await make_task(
        db_session,
        member,
        title="Gone",
        status=TaskStatus.retired,
        faction_slug=faction_slug,
    )

    eligibility = await evaluate_signup(member, task, db_session, ERA_1)
    assert eligibility.allowed is expected


# ---------------------------------------------------------------------------
# Snide — duel_win_modifier / duel_loss_modifier
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.parametrize("snide_wins", [True, False])
async def test_snide_takes_the_whole_duel_gamble(
    db_session: AsyncSession, era: Era, snide_wins: bool
):
    """Both halves of the deal, banked: 200% of base on a win and nothing on a loss."""
    snide = ERA_1.factions["snide"]
    assert (snide.duel_win_modifier, snide.duel_loss_modifier) == (2.0, 0.0)
    await _seed_factions(db_session)
    duel, challenger, _opponent = await make_duel(
        db_session,
        era,
        label="snidegamble",
        challenger_faction="snide",
        challenger_votes=5 if snide_wins else 1,
        opponent_votes=1 if snide_wins else 5,
    )
    praxis = await db_session.get(Praxis, duel.challenger_praxis_id)
    task = await db_session.get(Task, duel.task_id)

    contributions = await compute_contributions(
        [praxis], challenger, ERA_1, db_session
    )

    (contribution,) = contributions.values()
    expected = (
        snide.duel_win_modifier if snide_wins else snide.duel_loss_modifier
    )
    assert contribution.duel_multiplier == expected
    # base × faction × duel, plus the stars the side was rated. The task is
    # UA's, so the faction half is Era 1's flat cross-faction 1.0 (#452).
    stars = 5 if snide_wins else 1
    assert contribution.total == task.point_value * expected + stars


# ---------------------------------------------------------------------------
# Albescent — can_always_rejoin, can_apply_metatask_at_any_level
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.parametrize(
    "faction_slug,expected", [("albescent", True), ("coven", False)]
)
async def test_only_an_always_rejoinable_faction_reopens_after_a_defection(
    db_session: AsyncSession, era: Era, faction_slug: str, expected: bool
):
    """Albescent's open door, read through the join gate rather than the field."""
    assert ERA_1.factions["albescent"].can_always_rejoin is True
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

    allowed = await can_join_faction(
        defector.id, faction_slug, era.id, db_session, ERA_1
    )
    assert allowed is expected


def test_albescent_applies_a_metatask_below_the_level_gate():
    """``can_apply_metatask_at_any_level`` — Albescent's own perk, not an inherited one.

    Pure: the rule has no DB half. Both readers are here, because a capability
    flag that disagreed with the gate would offer a control that 403s (#1973).
    """
    assert faction_bypasses_metatask_level("albescent", ERA_1) is True
    assert faction_bypasses_metatask_level("coven", ERA_1) is False
    assert ERA_1.metatask_apply_level > 0

    albescent = compute_capabilities(0, False, ERA_1, faction_slug="albescent")
    coven = compute_capabilities(0, False, ERA_1, faction_slug="coven")
    assert albescent.can_apply_metatask is True
    assert coven.can_apply_metatask is False


# ---------------------------------------------------------------------------
# Singularity — reads_the_array
# ---------------------------------------------------------------------------

def test_singularity_alone_reads_the_array():
    """The one perk with no server-side door, so the era config *is* the rule.

    ``game_config`` says it outright: nothing is withheld — ``/game-config``
    already ships to every client and the UI merely never renders the numbers.
    There is deliberately no ``services.`` reader to drive here. What the wire
    does with the flag is pinned under the live era by
    ``tests/integration/test_game_config.py``; what Era 1 *grants* is this.
    """
    holders = {
        slug
        for slug, faction in ERA_1.factions.items()
        if faction.reads_the_array
    }
    # Albescent holds every other faction's perk in its era (#1871), so the
    # union — not Singularity alone — is the honest expectation.
    assert holders == {"singularity", "albescent"}

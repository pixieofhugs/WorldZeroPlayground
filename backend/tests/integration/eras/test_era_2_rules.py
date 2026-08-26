"""Era 2's rules, proved against ``ERA_2`` while Era 1 is still live (#2709).

**The seam is the ``era: EraConfig`` parameter every service already takes**, so
an era that is authored but not activated can be driven end to end years before
``CURRENT_ERA`` moves. That is the whole point of this module landing before the
flip: Metamorphosis was authored in #1618 granting four faction perks, and not
one of them had ever been exercised — its headline rule, the 1.2 / 0.8 own-other
split, had zero coverage on the day it was written.

Do **not** reach for ``CURRENT_ERA`` here, and do not try to monkeypatch it:
``services.era`` and ``scripts.era_reset`` bind it as a default argument at
``def`` time, so patching the module attribute never reaches them. Passing the
era is the only thing that works, and it is also the only thing that reads
honestly.

The ``era`` fixture's **row** still says Era 1, and that is correct rather than
a compromise — ADR-0042 splits config (owns the rules) from the DB (owns the
history). The row is the window the praxes fall inside and the FK the stats row
hangs off. What a praxis is *worth* comes from the ``EraConfig`` in hand.

Covered: the own/other split end to end, the deliberately flat collab pair, the
four perks Metamorphosis carries across (Snide's duel gamble, WOW's level jump,
Everymen's Double Dipper, Albescent's open door), Albescent's own metatask
bypass, and the three Era 1 rules that lose their subject here.
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
from services.faction_service import can_join_faction
from services.habit_bonus import faction_habit_bonus_points
from services.meta_task import faction_bypasses_metatask_level
from services.praxis import can_sign_up_for_task
from services.praxis_scoring import compute_contributions
from tests.integration.factories import (
    cast_vote,
    make_character,
    make_solo_praxis,
    make_task,
)

#: Every faction Metamorphosis lists, read off the era rather than restated.
ERA_2_SLUGS = sorted(ERA_2.factions)

#: A slug that is neither ``slug`` nor the cross-faction sentinel. ``na`` is
#: both the unaffiliated character's slug and the "belongs to no faction" task
#: slug (faction_slugs.py), and a task carrying it scores as *own*-faction for
#: everyone — so it can never stand in for "someone else's task".
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


# ---------------------------------------------------------------------------
# The point of the era — own_task_modifier / other_task_modifier
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.parametrize("faction_slug", ERA_2_SLUGS)
async def test_a_solo_praxis_on_your_own_faction_task_pays_a_fifth_more(
    db_session: AsyncSession, era: Era, faction_slug: str
):
    """Metamorphosis's headline rule, banked: 10 points become 12.

    The expectation is literal on purpose. ``own_task_modifier`` is the one rule
    this era exists to re-tune, so a later edit that flattens it must fail here
    rather than agree with itself.
    """
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
    """The other half of the split: 10 points become 8."""
    assert ERA_2.factions[faction_slug].other_task_modifier == 0.8
    score = await _bank_one_praxis(
        db_session,
        era,
        label=f"{faction_slug}other",
        faction_slug=faction_slug,
        task_faction_slug=_other_slug(faction_slug),
    )
    assert score == 8


# ---------------------------------------------------------------------------
# The asymmetry that is a ruling, not an oversight
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.parametrize("task_owner", ["own", "other"])
async def test_a_collab_stays_flat_on_both_sides(
    db_session: AsyncSession, era: Era, task_owner: str
):
    """The 120/80 rule is solo and duel only — **do not flatten this** (owner ruling).

    A collaboration on your own faction's task must not be worth less than doing
    it alone, which is what a 1.2 solo beside a 1.0 collab would mean if the
    collab pair were lifted with it; and a cross-faction collab is the behaviour
    this game wants to encourage, so it is not penalised either. ``eras/era_2.py``
    says so in as many words: "this is exactly the shape a later 'make these
    consistent' cleanup would flatten. Do not."
    """
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

    # Flat means flat: neither the 1.2 the same task pays solo, nor the 0.8 the
    # cross-faction version of it pays solo.
    assert score == 10


# ---------------------------------------------------------------------------
# Snide — duel_win_modifier / duel_loss_modifier
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.parametrize("snide_wins", [True, False])
async def test_snide_carries_its_whole_duel_gamble_into_metamorphosis(
    db_session: AsyncSession, era: Era, snide_wins: bool
):
    """200% of base on a win, nothing at all on a loss — and it stacks on the split.

    Built by hand rather than with ``factories.make_duel``: that builder puts its
    task on ``ua``, a faction Metamorphosis does not have, so its task could only
    ever be somebody else's here.
    """
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


# ---------------------------------------------------------------------------
# WOW — level_jump_reach
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.parametrize("faction_slug,expected", [("wow", True), ("snide", False)])
async def test_only_wow_reaches_a_level_above_its_own(
    db_session: AsyncSession, era: Era, faction_slug: str, expected: bool
):
    """The level jump crosses the rollover intact."""
    assert ERA_2.factions["wow"].level_jump_reach == 1
    await _seed_factions(db_session)
    member = await make_character(
        db_session, era, username=f"{faction_slug}jumper", faction_slug=faction_slug
    )
    task = await make_task(
        db_session, member, title="One up", level_required=1, faction_slug=faction_slug
    )

    assert await can_sign_up_for_task(member, task, db_session, ERA_2) is expected


# ---------------------------------------------------------------------------
# Everymen — can_hold_multiple_memberships (Double Dipper)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.parametrize(
    "faction_slug,expected", [("everymen", True), ("snide", False)]
)
async def test_only_everymen_claims_a_task_it_is_already_on(
    db_session: AsyncSession, era: Era, faction_slug: str, expected: bool
):
    """Double Dipper crosses the rollover intact."""
    await _seed_factions(db_session)
    member = await make_character(
        db_session, era, username=f"{faction_slug}dipper", faction_slug=faction_slug
    )
    task = await make_task(db_session, member, faction_slug=faction_slug)
    await make_solo_praxis(db_session, task, member, status=PraxisStatus.in_progress)

    assert await can_sign_up_for_task(member, task, db_session, ERA_2) is expected


# ---------------------------------------------------------------------------
# Albescent — can_always_rejoin, can_apply_metatask_at_any_level
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.parametrize(
    "faction_slug,expected", [("albescent", True), ("snide", False)]
)
async def test_only_an_always_rejoinable_faction_reopens_after_a_defection(
    db_session: AsyncSession, era: Era, faction_slug: str, expected: bool
):
    """Albescent's open door crosses the rollover intact."""
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

    allowed = await can_join_faction(
        defector.id, faction_slug, era.id, db_session, ERA_2
    )
    assert allowed is expected


def test_albescent_applies_a_metatask_below_the_level_gate():
    """``can_apply_metatask_at_any_level`` — stated by Era 2, not inherited.

    Until #1871 this was a slug branch inside ``services.praxis_metatask``,
    which is how Metamorphosis came to hold the perk without ever saying so.
    """
    assert faction_bypasses_metatask_level("albescent", ERA_2) is True
    assert faction_bypasses_metatask_level("snide", ERA_2) is False
    assert ERA_2.metatask_apply_level > 0

    albescent = compute_capabilities(0, False, ERA_2, faction_slug="albescent")
    snide = compute_capabilities(0, False, ERA_2, faction_slug="snide")
    assert albescent.can_apply_metatask is True
    assert snide.can_apply_metatask is False


# ---------------------------------------------------------------------------
# The rules that lose their subject at this rollover
# ---------------------------------------------------------------------------

def test_no_faction_carries_a_habit_bonus_or_a_collab_bonus():
    """Two Era 1 rules with nobody left to hold them, pinned as deliberate.

    ``habit_bonus_points`` was UA's alone and there is no UA here; the 1.1 collab
    bonus was Coven's alone, so this is the first era with no non-1.0 collab
    modifier at all. Both are choices, and the perk-coverage guard in
    ``tests/test_era_rules_modules.py`` will demand a test the day either comes
    back — this is the assertion that says which side of that line Era 2 is on.
    """
    for slug in ERA_2_SLUGS:
        assert faction_habit_bonus_points(slug, ERA_2) == 0
        assert ERA_2.factions[slug].collab_own_modifier == 1.0
        assert ERA_2.factions[slug].collab_other_modifier == 1.0


@pytest.mark.asyncio
async def test_task_vision_is_not_conjured_for_an_inheritor(
    db_session: AsyncSession, era: Era
):
    """"At least as good as the best other faction" — and no better (#1871).

    Albescent holds every other faction's perk in its era. There are no
    Ephemerists in Metamorphosis, so nobody holds Task Vision and Albescent does
    not invent it: the retired archive stays shut for everyone.
    """
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

    assert await can_sign_up_for_task(member, task, db_session, ERA_2) is False

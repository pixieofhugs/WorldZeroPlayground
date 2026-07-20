"""Integration tests for the PraxisCardOut scoring breakdown (ADR-0047, #819).

``build_praxis_card_out`` surfaces the per-praxis scoring breakdown
(``base_points``/``metatask_points``/``display_multiplier``/
``points_from_votes``/``total``) computed for the praxis AUTHOR, so the
frontend score stamp can render ``base × mult (+meta) + votes = total`` without
re-deriving the formula.

Display-multiplier rules (ADR-0047):
- solo → faction_multiplier
- duel → faction_multiplier × duel_multiplier combined into one value
- collab → None (stamp collapses to Merit = base + votes)

``score`` stays Merit for every type (unchanged from ADR-0014); ``total`` is the
new headline the redesign reads.
"""

import dataclasses

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.duel import Duel, DuelStatus
from models.era import Era
from models.faction import Faction, FactionStatus
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import Task, TaskStatus
from models.vote import Vote
from services.praxis import build_praxis_card_out


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


def _era_with_wow_own_modifier(value: float):
    """CURRENT_ERA with WOW's solo own_task_modifier overridden.

    Era 1 deliberately flattens every solo multiplier to 1.0 (#452), so a
    "solo mult != 1" case is unreachable from live config. This override
    exercises the resolution path — that display_multiplier reflects the
    faction multiplier rather than being pinned to 1.0 — without depending on a
    future era's tuning. The card builder reads ``era.*``, so this flows through.
    """
    boosted = dataclasses.replace(
        CURRENT_ERA.factions["wow"], own_task_modifier=value
    )
    factions = dict(CURRENT_ERA.factions)
    factions["wow"] = boosted
    return dataclasses.replace(CURRENT_ERA, factions=factions)


async def _load_card(session: AsyncSession, praxis_id: int, era=CURRENT_ERA):
    """Reload a praxis with the relationships the card builder needs (lazy=raise)."""
    result = await session.execute(
        select(Praxis)
        .where(Praxis.id == praxis_id)
        .options(
            selectinload(Praxis.task),
            selectinload(Praxis.created_by),
            selectinload(Praxis.members),
            selectinload(Praxis.media_items),
        )
    )
    praxis = result.scalar_one()
    return await build_praxis_card_out(praxis, session, era=era)


async def _cast_vote(
    session: AsyncSession, praxis: Praxis, voter: Character, value: int
) -> None:
    """Direct Vote insert — bypasses the service-layer budget/anti-vote checks."""
    session.add(
        Vote(
            praxis_id=praxis.id,
            voter_character_id=voter.id,
            voter_account_id=voter.account_id,
            value=value,
        )
    )
    await session.flush()


async def _make_character(
    session: AsyncSession,
    era: Era,
    *,
    faction_slug: str,
    username: str,
    email: str,
    level: int = 0,
) -> Character:
    account = Account(email=email)
    session.add(account)
    await session.flush()
    character = Character(
        account_id=account.id,
        username=username,
        display_name=username,
        faction_slug=faction_slug,
    )
    session.add(character)
    await session.flush()
    session.add(
        CharacterStats(
            character_id=character.id,
            era_id=era.id,
            score=0,
            all_time_score=0,
            level=level,
            votes_spent_this_era=0,
        )
    )
    await session.flush()
    return character


async def _ensure_faction(session: AsyncSession, slug: str) -> None:
    existing = await session.execute(select(Faction).where(Faction.slug == slug))
    if existing.scalar_one_or_none() is None:
        session.add(Faction(slug=slug, status=FactionStatus.visible))
        await session.flush()


async def _make_task(
    session: AsyncSession, creator: Character, *, faction_slug: str, points: int
) -> Task:
    task = Task(
        title=f"{faction_slug} task",
        description="proof",
        point_value=points,
        level_required=0,
        status=TaskStatus.active,
        created_by=creator.id,
        primary_faction_slug=faction_slug,
    )
    session.add(task)
    await session.flush()
    return task


async def _make_solo(
    session: AsyncSession, task: Task, author: Character
) -> Praxis:
    praxis = Praxis(
        task_id=task.id,
        created_by_id=author.id,
        type=PraxisType.solo,
        status=PraxisStatus.submitted,
        title="solo",
        body_text="proof",
    )
    session.add(praxis)
    await session.flush()
    session.add(PraxisMember(praxis_id=praxis.id, character_id=author.id))
    await session.flush()
    return praxis


# ---------------------------------------------------------------------------
# solo
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_solo_multiplier_not_one_surfaces_faction_modifier(
    db_session: AsyncSession, era: Era, faction_ua: Faction
):
    """Solo with faction_multiplier != 1.0 → display_multiplier = that modifier.

    Uses an era override (WOW own_task_modifier = 1.1) because live Era 1
    flattens all solo multipliers to 1.0 (#452). Proves the resolved
    display_multiplier is the faction multiplier, not a hardcoded 1.0.
    """
    custom_era = _era_with_wow_own_modifier(1.1)
    await _ensure_faction(db_session, "wow")
    author = await _make_character(
        db_session, era, faction_slug="wow", username="wowauthor", email="wow@x.com"
    )
    voter = await _make_character(
        db_session, era, faction_slug="ua", username="wowvoter", email="wowvoter@x.com"
    )
    task = await _make_task(db_session, author, faction_slug="wow", points=10)
    praxis = await _make_solo(db_session, task, author)
    await _cast_vote(db_session, praxis, voter, 4)

    card = await _load_card(db_session, praxis.id, era=custom_era)

    assert card.base_points == 10
    assert card.metatask_points == 0
    assert card.display_multiplier == pytest.approx(1.1)
    assert card.points_from_votes == 4
    # total = (10 + 0) × 1.1 × 1.0 + 4 = 15.0
    assert card.total == pytest.approx(15.0)
    # score stays Merit = base + votes (unchanged; ADR-0014)
    assert card.score == pytest.approx(14.0)


@pytest.mark.asyncio
async def test_solo_multiplier_one_ua_own_task(
    db_session: AsyncSession, era: Era, faction_ua: Faction, character: Character
):
    """UA author on a UA task → display_multiplier = 1.0 (frontend hides the row)."""
    voter = await _make_character(
        db_session, era, faction_slug="ua", username="uavoter", email="uavoter@x.com"
    )
    task = await _make_task(db_session, character, faction_slug="ua", points=10)
    praxis = await _make_solo(db_session, task, character)
    await _cast_vote(db_session, praxis, voter, 4)

    card = await _load_card(db_session, praxis.id)

    assert card.base_points == 10
    assert card.metatask_points == 0
    assert card.display_multiplier == pytest.approx(1.0)
    assert card.points_from_votes == 4
    # total = 10 × 1.0 + 4 = 14.0, equal to Merit here
    assert card.total == pytest.approx(14.0)
    assert card.score == pytest.approx(14.0)


# ---------------------------------------------------------------------------
# collab
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_collab_multi_faction_multiplier_null_total_is_merit(
    db_session: AsyncSession, era: Era, faction_ua: Faction
):
    """Multi-faction collab → display_multiplier is None, total = Merit (base+votes)."""
    await _ensure_faction(db_session, "wow")
    author = await _make_character(
        db_session, era, faction_slug="wow", username="collabwow", email="cw@x.com"
    )
    member = await _make_character(
        db_session, era, faction_slug="ua", username="collabua", email="cu@x.com"
    )
    voter = await _make_character(
        db_session, era, faction_slug="ua", username="collabvoter", email="cv@x.com"
    )
    task = await _make_task(db_session, author, faction_slug="ua", points=10)
    praxis = Praxis(
        task_id=task.id,
        created_by_id=author.id,
        type=PraxisType.collab,
        status=PraxisStatus.submitted,
        title="collab",
        body_text="proof",
    )
    db_session.add(praxis)
    await db_session.flush()
    db_session.add_all(
        [
            PraxisMember(praxis_id=praxis.id, character_id=author.id),
            PraxisMember(praxis_id=praxis.id, character_id=member.id),
        ]
    )
    await db_session.flush()
    await _cast_vote(db_session, praxis, voter, 3)

    card = await _load_card(db_session, praxis.id)

    assert card.base_points == 10
    assert card.metatask_points == 0
    assert card.display_multiplier is None
    assert card.points_from_votes == 3
    # Merit = 10 + 3 = 13.0 (no multiplier)
    assert card.total == pytest.approx(13.0)
    assert card.score == pytest.approx(13.0)


# ---------------------------------------------------------------------------
# duel — each side its own resolved total (ADR-0011 / ADR-0047)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_duel_winner_and_loser_resolved_totals(
    db_session: AsyncSession, era: Era, faction_ua: Faction
):
    """Duel sides show combined faction×duel multiplier; winner boosted, loser reduced.

    UA: own_task_modifier = 1.0, duel_win_modifier = 1.5, duel_loss_modifier = 0.5.
    """
    challenger = await _make_character(
        db_session, era, faction_slug="ua", username="challenger", email="ch@x.com"
    )
    opponent = await _make_character(
        db_session, era, faction_slug="ua", username="opponent", email="op@x.com"
    )
    voter = await _make_character(
        db_session, era, faction_slug="ua", username="duelvoter", email="dv@x.com"
    )
    task = await _make_task(db_session, challenger, faction_slug="ua", points=10)
    challenger_praxis = await _make_solo(db_session, task, challenger)
    opponent_praxis = await _make_solo(db_session, task, opponent)

    # Non-participant votes: challenger wins (5 > 2).
    await _cast_vote(db_session, challenger_praxis, voter, 5)
    await _cast_vote(db_session, opponent_praxis, voter, 2)

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

    winner_card = await _load_card(db_session, challenger_praxis.id)
    loser_card = await _load_card(db_session, opponent_praxis.id)

    # Winner: faction 1.0 × duel_win 1.5 = 1.5; total = 10 × 1.5 + 5 = 20.0
    assert winner_card.base_points == 10
    assert winner_card.metatask_points == 0
    assert winner_card.display_multiplier == pytest.approx(1.5)
    assert winner_card.points_from_votes == 5
    assert winner_card.total == pytest.approx(20.0)

    # Loser: faction 1.0 × duel_loss 0.5 = 0.5; total = 10 × 0.5 + 2 = 7.0
    assert loser_card.base_points == 10
    assert loser_card.metatask_points == 0
    assert loser_card.display_multiplier == pytest.approx(0.5)
    assert loser_card.points_from_votes == 2
    assert loser_card.total == pytest.approx(7.0)

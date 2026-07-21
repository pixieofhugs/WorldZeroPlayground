"""Integration tests for the praxis score payload (ADR-0053, #881).

A praxis has exactly ONE number: ``score``, the computed total, resolved for
the praxis AUTHOR. The payload also carries the terms behind it so the frontend
score stamp can render the arithmetic without re-deriving it:

    score = (task_point_value + metatask_points) × display_multiplier
            + points_from_votes

That invariant holds for EVERY praxis type with no carve-out — a collab praxis
has exactly one author, hence one faction and one multiplier. ADR-0053
supersedes ADR-0047, which kept ``score`` as Merit (base + votes, multipliers
discarded) and gave collab a ``None`` multiplier.

A duel side's multiplier is live and provisional (ADR-0052): it is computed
from current tallies until the era freezes the outcome, so a currently-behind
Snide side legitimately reads ×0.0.
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
from services.character_stats import recalculate_character_stats
from services.praxis import build_praxis_card_out, build_praxis_out


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


def _era_with_modifiers(slug: str, **overrides):
    """CURRENT_ERA with one faction's modifiers overridden.

    Era 1 deliberately flattens every non-duel multiplier to 1.0 (#452), so
    "multiplier != 1" is unreachable from live config. Overriding here
    exercises the resolution path without depending on a future era's tuning.
    The builders read ``era.*``, so this flows through.
    """
    tuned = dataclasses.replace(CURRENT_ERA.factions[slug], **overrides)
    factions = dict(CURRENT_ERA.factions)
    factions[slug] = tuned
    return dataclasses.replace(CURRENT_ERA, factions=factions)


def assert_invariant(payload) -> None:
    """score = (base + meta) × mult + votes — for every praxis type (ADR-0053)."""
    expected = (
        payload.task_point_value + payload.metatask_points
    ) * payload.display_multiplier + payload.points_from_votes
    assert payload.score == pytest.approx(expected)


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


async def _load_detail(session: AsyncSession, praxis_id: int, era=CURRENT_ERA):
    """Reload a praxis and build the DETAIL payload (PraxisOut)."""
    result = await session.execute(
        select(Praxis)
        .where(Praxis.id == praxis_id)
        .options(
            selectinload(Praxis.task),
            selectinload(Praxis.created_by),
            selectinload(Praxis.members),
            selectinload(Praxis.invites),
            selectinload(Praxis.media_items),
        )
    )
    praxis = result.scalar_one()
    return await build_praxis_out(praxis, session, era=era)


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


async def _make_collab(
    session: AsyncSession, task: Task, author: Character, *members: Character
) -> Praxis:
    praxis = Praxis(
        task_id=task.id,
        created_by_id=author.id,
        type=PraxisType.collab,
        status=PraxisStatus.submitted,
        title="collab",
        body_text="proof",
    )
    session.add(praxis)
    await session.flush()
    session.add_all(
        [
            PraxisMember(praxis_id=praxis.id, character_id=member.id)
            for member in (author, *members)
        ]
    )
    await session.flush()
    return praxis


async def _make_duel(
    session: AsyncSession,
    task: Task,
    challenger_praxis: Praxis,
    opponent: Character,
    opponent_praxis: Praxis,
) -> None:
    session.add(
        Duel(
            task_id=task.id,
            challenger_praxis_id=challenger_praxis.id,
            opponent_character_id=opponent.id,
            opponent_praxis_id=opponent_praxis.id,
            status=DuelStatus.settled,
        )
    )
    await session.flush()


# ---------------------------------------------------------------------------
# solo
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_plain_solo_score_is_base_plus_votes_at_one(
    db_session: AsyncSession, era: Era, faction_ua: Faction, character: Character
):
    """Plain solo, everything at ×1.0 — the common Era 1 shape."""
    voter = await _make_character(
        db_session, era, faction_slug="ua", username="uavoter", email="uavoter@x.com"
    )
    task = await _make_task(db_session, character, faction_slug="ua", points=10)
    praxis = await _make_solo(db_session, task, character)
    await _cast_vote(db_session, praxis, voter, 4)

    card = await _load_card(db_session, praxis.id)

    assert card.task_point_value == 10
    assert card.metatask_points == 0
    assert card.display_multiplier == pytest.approx(1.0)
    assert card.points_from_votes == 4
    assert card.score == pytest.approx(14.0)
    assert_invariant(card)


@pytest.mark.asyncio
async def test_solo_with_non_one_faction_multiplier(
    db_session: AsyncSession, era: Era, faction_ua: Faction
):
    """Solo with faction_multiplier != 1.0 → score carries the multiplier.

    Under ADR-0047 this praxis's ``score`` read 14.0 (Merit); the real banked
    value is 15.0.
    """
    custom_era = _era_with_modifiers("wow", own_task_modifier=1.1)
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

    assert card.display_multiplier == pytest.approx(1.1)
    assert card.points_from_votes == 4
    # (10 + 0) × 1.1 + 4 = 15.0 — NOT Merit's 14.0
    assert card.score == pytest.approx(15.0)
    assert_invariant(card)


@pytest.mark.asyncio
async def test_detail_and_card_agree(
    db_session: AsyncSession, era: Era, faction_ua: Faction
):
    """PraxisOut and PraxisCardOut resolve the same score from the same source."""
    custom_era = _era_with_modifiers("wow", own_task_modifier=1.1)
    await _ensure_faction(db_session, "wow")
    author = await _make_character(
        db_session, era, faction_slug="wow", username="bothauthor", email="both@x.com"
    )
    voter = await _make_character(
        db_session, era, faction_slug="ua", username="bothvoter", email="bothv@x.com"
    )
    task = await _make_task(db_session, author, faction_slug="wow", points=10)
    praxis = await _make_solo(db_session, task, author)
    await _cast_vote(db_session, praxis, voter, 4)

    card = await _load_card(db_session, praxis.id, era=custom_era)
    detail = await _load_detail(db_session, praxis.id, era=custom_era)

    assert detail.score == pytest.approx(card.score)
    assert detail.display_multiplier == pytest.approx(card.display_multiplier)
    assert detail.points_from_votes == card.points_from_votes
    assert detail.metatask_points == card.metatask_points
    assert_invariant(detail)


# ---------------------------------------------------------------------------
# collab — the ADR-0047 carve-out regression
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_collab_score_is_the_authors_contribution_total(
    db_session: AsyncSession, era: Era, faction_ua: Faction
):
    """Collab keeps its author's multiplier — no Merit collapse (ADR-0053).

    Regression on the deleted ``_resolve_card_scoring`` collab branch, which
    returned ``base + votes`` and a ``None`` multiplier. The author is WOW and
    the task is WOW's, so the collab_own_modifier applies — a member from
    another faction does not erase it.
    """
    custom_era = _era_with_modifiers("wow", collab_own_modifier=1.1)
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
    task = await _make_task(db_session, author, faction_slug="wow", points=10)
    praxis = await _make_collab(db_session, task, author, member)
    await _cast_vote(db_session, praxis, voter, 3)

    card = await _load_card(db_session, praxis.id, era=custom_era)

    assert card.display_multiplier == pytest.approx(1.1)
    assert card.points_from_votes == 3
    # (10 + 0) × 1.1 + 3 = 14.0 — Merit would have said 13.0
    assert card.score == pytest.approx(14.0)
    assert_invariant(card)


# ---------------------------------------------------------------------------
# duel — live, provisional, per side (ADR-0011 / ADR-0052)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_duel_winner_and_loser_scores(
    db_session: AsyncSession, era: Era, faction_ua: Faction
):
    """Each side carries its own faction×duel multiplier.

    UA: own_task_modifier 1.0, duel_win 1.5, duel_loss 0.5.
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
    await _make_duel(db_session, task, challenger_praxis, opponent, opponent_praxis)

    winner_card = await _load_card(db_session, challenger_praxis.id)
    loser_card = await _load_card(db_session, opponent_praxis.id)

    # Winner: 1.0 × 1.5 = 1.5; score = 10 × 1.5 + 5 = 20.0
    assert winner_card.display_multiplier == pytest.approx(1.5)
    assert winner_card.score == pytest.approx(20.0)
    assert_invariant(winner_card)

    # Loser: 1.0 × 0.5 = 0.5; score = 10 × 0.5 + 2 = 7.0
    assert loser_card.display_multiplier == pytest.approx(0.5)
    assert loser_card.score == pytest.approx(7.0)
    assert_invariant(loser_card)


@pytest.mark.asyncio
async def test_snide_duel_loser_scores_at_zero_multiplier(
    db_session: AsyncSession, era: Era, faction_ua: Faction
):
    """A losing Snide side reads ×0.0 — the whole base is forfeit, votes remain.

    Snide's duel_loss_modifier is 0.0 (era_1.py). This is live and provisional:
    duels do not resolve until era close (ADR-0052), so the number moves if the
    tally moves. Do not freeze it.
    """
    await _ensure_faction(db_session, "snide")
    challenger = await _make_character(
        db_session, era, faction_slug="ua", username="snidewinner", email="sw@x.com"
    )
    loser = await _make_character(
        db_session, era, faction_slug="snide", username="snideloser", email="sl@x.com"
    )
    voter = await _make_character(
        db_session, era, faction_slug="ua", username="snidevoter", email="sv@x.com"
    )
    task = await _make_task(db_session, challenger, faction_slug="ua", points=10)
    challenger_praxis = await _make_solo(db_session, task, challenger)
    loser_praxis = await _make_solo(db_session, task, loser)

    await _cast_vote(db_session, challenger_praxis, voter, 5)
    await _cast_vote(db_session, loser_praxis, voter, 2)
    await _make_duel(db_session, task, challenger_praxis, loser, loser_praxis)

    loser_card = await _load_card(db_session, loser_praxis.id)

    assert loser_card.display_multiplier == pytest.approx(0.0)
    # (10 + 0) × 0.0 + 2 = 2.0 — the votes survive the wipeout.
    assert loser_card.score == pytest.approx(2.0)
    assert_invariant(loser_card)


# ---------------------------------------------------------------------------
# banking — round(), not truncate (ADR-0053)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fractional_totals_bank_by_rounding_not_truncation(
    db_session: AsyncSession, era: Era, faction_ua: Faction
):
    """A contribution set summing to x.9 banks x+1, not x.

    ``int()`` truncated toward zero, so 48.9 banked as 48 — and ``compute_level``
    is directly downstream. Three praxes at 10 × 1.63 = 16.3 each sum to 48.9.
    """
    custom_era = _era_with_modifiers("wow", own_task_modifier=1.63)
    await _ensure_faction(db_session, "wow")
    author = await _make_character(
        db_session, era, faction_slug="wow", username="rounder", email="round@x.com"
    )
    task = await _make_task(db_session, author, faction_slug="wow", points=10)
    for _ in range(3):
        await _make_solo(db_session, task, author)
    await db_session.flush()

    await recalculate_character_stats(author.id, db_session, era=custom_era)
    await db_session.flush()

    stats_result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == author.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = stats_result.scalar_one()
    # 3 × 16.3 = 48.9 → 49, not 48.
    assert stats.score == 49

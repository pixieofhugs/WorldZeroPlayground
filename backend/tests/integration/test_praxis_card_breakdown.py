"""Praxis score payload (ADR-0053, #881).

One number, ``score``, resolved for the author, plus its terms so the stamp can
render the arithmetic: ``base × display_multiplier + meta + votes + habit``.
Only the base multiplies (ADR-0086); holds for every type, collab included.
A duel side's multiplier is live and provisional (ADR-0052): a behind Snide
side legitimately reads ×0.0.
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
from models.meta_task import PraxisMetaTask
from models.praxis import (
    ModerationStatus,
    Praxis,
    PraxisMember,
    PraxisStatus,
    PraxisType,
)
from models.task import Task, TaskStatus, TaskType
from models.vote import Vote
from services.character_stats import recalculate_character_stats
from services.praxis_out import (
    applied_metatasks_for,
    build_praxis_card_out,
    build_praxis_out,
)
from tests.integration.factories import DEFAULT_FACTION_SLUG, make_task


def _era_with_modifiers(slug: str, **overrides):
    """CURRENT_ERA with one faction's modifiers overridden.

    Era 1 flattens non-duel multipliers to 1.0 (#452), so != 1 needs an override.
    """
    tuned = dataclasses.replace(CURRENT_ERA.factions[slug], **overrides)
    factions = dict(CURRENT_ERA.factions)
    factions[slug] = tuned
    return dataclasses.replace(CURRENT_ERA, factions=factions)


def modifiers_of(character: Character, era=CURRENT_ERA):
    """Live faction config for whichever faction this character got (#2708)."""
    return era.factions[character.faction_slug]


def assert_invariant(payload) -> None:
    """score = base × mult + meta + votes + habit — every type (ADR-0053/0086)."""
    expected = (
        payload.task_point_value * payload.display_multiplier
        + payload.metatask_points
        + payload.points_from_votes
        + payload.habit_bonus_points
    )
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
    return await build_praxis_card_out(praxis, session, era=era, viewer=None)


async def _load_detail(session: AsyncSession, praxis_id: int, era=CURRENT_ERA):
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
    return await build_praxis_out(praxis, session, era=era, viewer=None)


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
    username: str,
    email: str,
    faction_slug: str = DEFAULT_FACTION_SLUG,
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
    session: AsyncSession,
    creator: Character,
    *,
    points: int,
    faction_slug: str = DEFAULT_FACTION_SLUG,
) -> Task:
    return await make_task(
        session,
        creator,
        title=f"{faction_slug} task",
        point_value=points,
        faction_slug=faction_slug,
    )
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


async def _make_metatask(
    session: AsyncSession,
    creator: Character,
    *,
    issuing_faction_slug: str = DEFAULT_FACTION_SLUG,
    points: int,
    level_required: int = 0,
) -> Task:
    """A metatask Task issued by ``issuing_faction_slug``.

    The seal follows the metatask's faction, not the host card's.
    ``level_required`` gates points: below it earns 0, the seal stays.
    """
    task = Task(
        title=f"{issuing_faction_slug} metatask",
        description="metatask",
        point_value=points,
        level_required=level_required,
        status=TaskStatus.active,
        task_type=TaskType.metatask,
        created_by=creator.id,
        primary_faction_slug=issuing_faction_slug,
        metatask_faction_slug=issuing_faction_slug,
    )
    session.add(task)
    await session.flush()
    return task


async def _apply_metatask(
    session: AsyncSession, praxis: Praxis, metatask: Task
) -> None:
    session.add(PraxisMetaTask(praxis_id=praxis.id, task_id=metatask.id))
    await session.flush()


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


@pytest.mark.asyncio
async def test_plain_solo_score_is_base_times_own_modifier_plus_votes(
    db_session: AsyncSession, era: Era, some_faction: Faction, character: Character
):
    voter = await _make_character(
        db_session, era, username="uavoter", email="uavoter@x.com"
    )
    task = await _make_task(db_session, character, points=10)
    praxis = await _make_solo(db_session, task, character)
    await _cast_vote(db_session, praxis, voter, 4)

    card = await _load_card(db_session, praxis.id)

    own = modifiers_of(character).own_task_modifier

    assert card.task_point_value == 10
    assert card.metatask_points == 0
    assert card.display_multiplier == pytest.approx(own)
    assert card.points_from_votes == 4
    assert card.score == pytest.approx(10 * own + 4)
    assert_invariant(card)


@pytest.mark.asyncio
async def test_solo_with_non_one_faction_multiplier(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    """Solo with faction_multiplier != 1.0 → score carries the multiplier."""
    custom_era = _era_with_modifiers("wow", own_task_modifier=1.1)
    await _ensure_faction(db_session, "wow")
    author = await _make_character(
        db_session, era, faction_slug="wow", username="wowauthor", email="wow@x.com"
    )
    voter = await _make_character(
        db_session, era, username="wowvoter", email="wowvoter@x.com"
    )
    task = await _make_task(db_session, author, faction_slug="wow", points=10)
    praxis = await _make_solo(db_session, task, author)
    await _cast_vote(db_session, praxis, voter, 4)

    card = await _load_card(db_session, praxis.id, era=custom_era)

    assert card.display_multiplier == pytest.approx(1.1)
    assert card.points_from_votes == 4
    # (10 + 0) × 1.1 + 4 = 15.0
    assert card.score == pytest.approx(15.0)
    assert_invariant(card)


@pytest.mark.asyncio
async def test_detail_and_card_agree(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    custom_era = _era_with_modifiers("wow", own_task_modifier=1.1)
    await _ensure_faction(db_session, "wow")
    author = await _make_character(
        db_session, era, faction_slug="wow", username="bothauthor", email="both@x.com"
    )
    voter = await _make_character(
        db_session, era, username="bothvoter", email="bothv@x.com"
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


@pytest.mark.asyncio
async def test_collab_score_is_the_authors_contribution_total(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    """Collab keeps its author's multiplier (ADR-0053); other members don't erase it."""
    custom_era = _era_with_modifiers("wow", collab_own_modifier=1.1)
    await _ensure_faction(db_session, "wow")
    author = await _make_character(
        db_session, era, faction_slug="wow", username="collabwow", email="cw@x.com"
    )
    member = await _make_character(
        db_session, era, username="collabua", email="cu@x.com"
    )
    voter = await _make_character(
        db_session, era, username="collabvoter", email="cv@x.com"
    )
    task = await _make_task(db_session, author, faction_slug="wow", points=10)
    praxis = await _make_collab(db_session, task, author, member)
    await _cast_vote(db_session, praxis, voter, 3)

    card = await _load_card(db_session, praxis.id, era=custom_era)

    assert card.display_multiplier == pytest.approx(1.1)
    assert card.points_from_votes == 3
    # (10 + 0) × 1.1 + 3 = 14.0
    assert card.score == pytest.approx(14.0)
    assert_invariant(card)


@pytest.mark.asyncio
async def test_duel_winner_and_loser_scores(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    """Each side carries its own faction×duel multiplier (same faction, so only
    the outcome differs)."""
    challenger = await _make_character(
        db_session, era, username="challenger", email="ch@x.com"
    )
    opponent = await _make_character(
        db_session, era, username="opponent", email="op@x.com"
    )
    voter = await _make_character(
        db_session, era, username="duelvoter", email="dv@x.com"
    )
    task = await _make_task(db_session, challenger, points=10)
    challenger_praxis = await _make_solo(db_session, task, challenger)
    opponent_praxis = await _make_solo(db_session, task, opponent)

    # Non-participant votes: challenger wins (5 > 2).
    await _cast_vote(db_session, challenger_praxis, voter, 5)
    await _cast_vote(db_session, opponent_praxis, voter, 2)
    await _make_duel(db_session, task, challenger_praxis, opponent, opponent_praxis)

    winner_card = await _load_card(db_session, challenger_praxis.id)
    loser_card = await _load_card(db_session, opponent_praxis.id)

    challenger_cfg = modifiers_of(challenger)
    opponent_cfg = modifiers_of(opponent)
    win = challenger_cfg.own_task_modifier * challenger_cfg.duel_win_modifier
    loss = opponent_cfg.own_task_modifier * opponent_cfg.duel_loss_modifier

    assert winner_card.display_multiplier == pytest.approx(win)
    assert winner_card.score == pytest.approx(10 * win + 5)
    assert_invariant(winner_card)

    assert loser_card.display_multiplier == pytest.approx(loss)
    assert loser_card.score == pytest.approx(10 * loss + 2)
    assert_invariant(loser_card)


@pytest.mark.asyncio
async def test_failed_duel_side_hands_the_win_to_the_opponent(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    """A praxis ruled ``failed`` cannot win, even leading 5–2 on votes (#1442).

    Settlement path; era-close freeze is in ``test_duel_era_resolution``.
    """
    challenger = await _make_character(
        db_session, era, username="failedside", email="fs@x.com"
    )
    opponent = await _make_character(
        db_session, era, username="cleanside", email="cs@x.com"
    )
    voter = await _make_character(
        db_session, era, username="failvoter", email="fv@x.com"
    )
    task = await _make_task(db_session, challenger, points=10)
    challenger_praxis = await _make_solo(db_session, task, challenger)
    opponent_praxis = await _make_solo(db_session, task, opponent)

    await _cast_vote(db_session, challenger_praxis, voter, 5)
    await _cast_vote(db_session, opponent_praxis, voter, 2)
    await _make_duel(db_session, task, challenger_praxis, opponent, opponent_praxis)

    challenger_praxis.moderation_status = ModerationStatus.failed
    await db_session.flush()

    winner_card = await _load_card(db_session, opponent_praxis.id)
    failed_card = await _load_card(db_session, challenger_praxis.id)

    opponent_cfg = modifiers_of(opponent)
    challenger_cfg = modifiers_of(challenger)
    win = opponent_cfg.own_task_modifier * opponent_cfg.duel_win_modifier
    loss = challenger_cfg.own_task_modifier * challenger_cfg.duel_loss_modifier

    # Opponent banks the win modifier off the LOWER tally: 10 × win + 2.
    assert winner_card.display_multiplier == pytest.approx(win)
    assert winner_card.score == pytest.approx(10 * win + 2)
    assert_invariant(winner_card)

    # The failed side reads the loss multiplier (its author banks nothing, #1373).
    assert failed_card.display_multiplier == pytest.approx(loss)


@pytest.mark.asyncio
async def test_snide_duel_loser_scores_at_zero_multiplier(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    """A losing Snide side reads ×0.0: base forfeit, votes remain.

    Live and provisional (ADR-0052); do not freeze it.
    """
    await _ensure_faction(db_session, "snide")
    challenger = await _make_character(
        db_session, era, username="snidewinner", email="sw@x.com"
    )
    loser = await _make_character(
        db_session, era, faction_slug="snide", username="snideloser", email="sl@x.com"
    )
    voter = await _make_character(
        db_session, era, username="snidevoter", email="sv@x.com"
    )
    task = await _make_task(db_session, challenger, points=10)
    challenger_praxis = await _make_solo(db_session, task, challenger)
    loser_praxis = await _make_solo(db_session, task, loser)

    await _cast_vote(db_session, challenger_praxis, voter, 5)
    await _cast_vote(db_session, loser_praxis, voter, 2)
    await _make_duel(db_session, task, challenger_praxis, loser, loser_praxis)

    loser_card = await _load_card(db_session, loser_praxis.id)

    assert loser_card.display_multiplier == pytest.approx(0.0)
    # (10 + 0) × 0.0 + 2 = 2.0
    assert loser_card.score == pytest.approx(2.0)
    assert_invariant(loser_card)


@pytest.mark.asyncio
async def test_fractional_totals_bank_by_rounding_not_truncation(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    """Banking rounds, not truncates: 3 × 16.3 = 48.9 banks 49 (ADR-0053)."""
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
    assert stats.score == 49


@pytest.mark.asyncio
async def test_card_carries_applied_metatask_rows_for_the_seal(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    """The card carries pinned metatasks as TaskOut rows for the seal stack (#932)."""
    await _ensure_faction(db_session, "wow")
    await _ensure_faction(db_session, "snide")
    author = await _make_character(
        db_session, era, faction_slug="wow", username="sealauthor", email="seal@x.com"
    )
    task = await _make_task(db_session, author, faction_slug="wow", points=10)
    praxis = await _make_solo(db_session, task, author)
    metatask = await _make_metatask(
        db_session, author, issuing_faction_slug="snide", points=5
    )
    await _apply_metatask(db_session, praxis, metatask)

    card = await _load_card(db_session, praxis.id)

    assert len(card.applied_metatasks) == 1
    seal = card.applied_metatasks[0]
    assert seal.id == metatask.id
    # Cross-faction: the seal dispatches on the metatask's issuing faction.
    assert seal.metatask_faction_slug == "snide"
    assert seal.task_type == TaskType.metatask.value


@pytest.mark.asyncio
async def test_card_applied_metatasks_is_empty_when_none_applied(
    db_session: AsyncSession, era: Era, some_faction: Faction, character: Character
):
    task = await _make_task(db_session, character, points=10)
    praxis = await _make_solo(db_session, task, character)

    card = await _load_card(db_session, praxis.id)

    assert card.applied_metatasks == []


@pytest.mark.asyncio
async def test_applied_metatasks_for_batches_the_page_in_one_map(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    """Page-wide helper: one join, praxis-id → rows; bare praxes are absent."""
    await _ensure_faction(db_session, "snide")
    author = await _make_character(
        db_session, era, username="batchauthor", email="batch@x.com"
    )
    task = await _make_task(db_session, author, points=10)
    sealed = await _make_solo(db_session, task, author)
    bare = await _make_solo(db_session, task, author)
    metatask = await _make_metatask(
        db_session, author, issuing_faction_slug="snide", points=5
    )
    await _apply_metatask(db_session, sealed, metatask)

    result = await applied_metatasks_for([sealed, bare], db_session)

    assert set(result.keys()) == {sealed.id}
    assert [row.id for row in result[sealed.id]] == [metatask.id]
    assert result.get(bare.id, []) == []


@pytest.mark.asyncio
async def test_collab_earns_metatask_points(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    """A collab praxis carrying a metatask scores the bonus (#882 / ADR-0051)."""
    author = await _make_character(
        db_session, era, username="collabmeta", email="cm@x.com"
    )
    member = await _make_character(
        db_session, era, username="collabmetamem", email="cmm@x.com"
    )
    task = await _make_task(db_session, author, points=10)
    praxis = await _make_collab(db_session, task, author, member)
    metatask = await _make_metatask(
        db_session, author, issuing_faction_slug=DEFAULT_FACTION_SLUG, points=5
    )
    await _apply_metatask(db_session, praxis, metatask)

    card = await _load_card(db_session, praxis.id)

    assert card.metatask_points == 5
    # 10 × 1.0 + 5 + 0 = 15.0
    assert card.score == pytest.approx(15.0)
    assert_invariant(card)


@pytest.mark.asyncio
async def test_duel_side_earns_metatask_points(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    """A duel side scores a metatask flat: the duel modifier multiplies only the
    base (ADR-0086)."""
    challenger = await _make_character(
        db_session, era, username="dmetawin", email="dmw@x.com"
    )
    opponent = await _make_character(
        db_session, era, username="dmetaopp", email="dmo@x.com"
    )
    voter = await _make_character(
        db_session, era, username="dmetavoter", email="dmv@x.com"
    )
    task = await _make_task(db_session, challenger, points=10)
    challenger_praxis = await _make_solo(db_session, task, challenger)
    opponent_praxis = await _make_solo(db_session, task, opponent)
    metatask = await _make_metatask(
        db_session, challenger, issuing_faction_slug=DEFAULT_FACTION_SLUG, points=5
    )
    await _apply_metatask(db_session, challenger_praxis, metatask)

    await _cast_vote(db_session, challenger_praxis, voter, 5)
    await _cast_vote(db_session, opponent_praxis, voter, 2)
    await _make_duel(db_session, task, challenger_praxis, opponent, opponent_praxis)

    winner_card = await _load_card(db_session, challenger_praxis.id)

    challenger_cfg = modifiers_of(challenger)
    win = challenger_cfg.own_task_modifier * challenger_cfg.duel_win_modifier

    assert winner_card.metatask_points == 5
    assert winner_card.display_multiplier == pytest.approx(win)
    # 10 × win + 5 metatask + 5 votes.
    assert winner_card.score == pytest.approx(10 * win + 5 + 5)
    assert_invariant(winner_card)


@pytest.mark.asyncio
async def test_snide_duel_loss_keeps_the_metatask(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    """A losing Snide side's ×0.0 wipes the BASE and leaves the metatask (#2633)."""
    await _ensure_faction(db_session, "snide")
    challenger = await _make_character(
        db_session, era, username="smetawin", email="smw@x.com"
    )
    loser = await _make_character(
        db_session, era, faction_slug="snide", username="smetalose", email="sml@x.com"
    )
    voter = await _make_character(
        db_session, era, username="smetavoter", email="smv@x.com"
    )
    task = await _make_task(db_session, challenger, points=10)
    challenger_praxis = await _make_solo(db_session, task, challenger)
    loser_praxis = await _make_solo(db_session, task, loser)
    metatask = await _make_metatask(
        db_session, loser, issuing_faction_slug="snide", points=5
    )
    await _apply_metatask(db_session, loser_praxis, metatask)

    await _cast_vote(db_session, challenger_praxis, voter, 5)
    await _cast_vote(db_session, loser_praxis, voter, 2)
    await _make_duel(db_session, task, challenger_praxis, loser, loser_praxis)

    loser_card = await _load_card(db_session, loser_praxis.id)

    assert loser_card.metatask_points == 5
    assert loser_card.display_multiplier == pytest.approx(0.0)
    # 10 × 0.0 + 5 + 2 = 7.0
    assert loser_card.score == pytest.approx(7.0)
    assert_invariant(loser_card)


@pytest.mark.asyncio
async def test_under_level_author_earns_zero_but_keeps_the_seal(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    """Below the metatask's level bar: ``metatask_points`` 0, seal row kept."""
    author = await _make_character(
        db_session, era, username="underlvl", email="ul@x.com", level=0
    )
    task = await _make_task(db_session, author, points=10)
    praxis = await _make_solo(db_session, task, author)
    metatask = await _make_metatask(
        db_session,
        author,
        issuing_faction_slug=DEFAULT_FACTION_SLUG,
        points=5,
        level_required=7,
    )
    await _apply_metatask(db_session, praxis, metatask)

    card = await _load_card(db_session, praxis.id)

    assert card.metatask_points == 0
    assert card.score == pytest.approx(10 * modifiers_of(author).own_task_modifier)
    assert len(card.applied_metatasks) == 1
    assert card.applied_metatasks[0].id == metatask.id
    assert_invariant(card)


# duel_id on the card (#992): a duel side is stored type='solo' (ADR-0011), so
# the card must expose duel_id for surfaces to label it "Duel".


@pytest.mark.asyncio
async def test_duel_side_card_carries_duel_id(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    challenger = await _make_character(
        db_session, era, username="dchallenger", email="dch@x.com"
    )
    opponent = await _make_character(
        db_session, era, username="dopponent", email="dop@x.com"
    )
    task = await _make_task(db_session, challenger, points=10)
    challenger_praxis = await _make_solo(db_session, task, challenger)
    opponent_praxis = await _make_solo(db_session, task, opponent)
    await _make_duel(db_session, task, challenger_praxis, opponent, opponent_praxis)

    challenger_card = await _load_card(db_session, challenger_praxis.id)
    opponent_card = await _load_card(db_session, opponent_praxis.id)

    assert challenger_card.type == PraxisType.solo
    assert challenger_card.duel_id is not None
    assert opponent_card.duel_id == challenger_card.duel_id


@pytest.mark.asyncio
async def test_non_duel_solo_card_has_null_duel_id(
    db_session: AsyncSession, era: Era, some_faction: Faction, character: Character
):
    task = await _make_task(db_session, character, points=10)
    praxis = await _make_solo(db_session, task, character)

    card = await _load_card(db_session, praxis.id)

    assert card.duel_id is None

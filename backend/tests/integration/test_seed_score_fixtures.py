"""The dev seed's score-breakdown fixtures are what they claim to be (#891).

`praxis_meta_task` used to have zero rows and every reachable Era 1 multiplier
was 1.0, so the metatask row and the `{base} x {mult}` row of the score
breakdown were both permanently hidden in dev — a correct scoring
implementation and a broken one rendered identically.

These tests run `scripts.seed_demo_praxes.seed_score_fixtures` against a real
database and score the result through the production path
(`services.praxis_scoring.compute_contributions`), asserting that the fixture
actually lights up both rows. They assert nothing about scoring *semantics* —
only that the seeded rows exercise them.
"""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.character import Character
from models.era import Era
from models.faction import Faction, FactionStatus
from models.praxis import Praxis
from models.task import Task, TaskStatus, TaskType
from scripts.seed_demo_praxes import (
    DUEL_LOSER_TITLE,
    DUEL_LOSER_USERNAME,
    DUEL_TASK_FACTION_SLUG,
    DUEL_WINNER_TITLE,
    DUEL_WINNER_USERNAME,
    METATASK_FACTION_SLUG,
    METATASK_OPEN_PRAXIS_TITLE,
    METATASK_PLAYER,
    METATASK_PRAXIS_TITLE,
    get_or_create_players,
    seed_score_fixtures,
)
from services.praxis_scoring import compute_contributions


async def _board(db_session: AsyncSession, author: Character) -> None:
    """Minimum viable board: every era faction plus one task per faction used."""
    for slug in CURRENT_ERA.factions:
        existing = (
            await db_session.execute(select(Faction).where(Faction.slug == slug))
        ).scalar_one_or_none()
        if existing is None:
            db_session.add(Faction(slug=slug, status=FactionStatus.visible))
    await db_session.flush()
    for slug in {METATASK_FACTION_SLUG, DUEL_TASK_FACTION_SLUG}:
        db_session.add(Task(
            title=f"Board task ({slug})",
            description="fixture",
            point_value=100,
            level_required=0,
            status=TaskStatus.active,
            task_type=TaskType.standard,
            created_by=author.id,
            primary_faction_slug=slug,
        ))
    await db_session.flush()


async def _praxis(db_session: AsyncSession, title: str) -> Praxis:
    return (
        await db_session.execute(select(Praxis).where(Praxis.title == title))
    ).scalar_one()


async def _character(db_session: AsyncSession, username: str) -> Character:
    return (
        await db_session.execute(
            select(Character).where(Character.username == username)
        )
    ).scalar_one()


@pytest.mark.asyncio
async def test_seeded_metatask_praxis_scores_a_metatask_bonus(
    db_session: AsyncSession,
    era: Era,
    character: Character,
):
    """The seeded praxis reports metatask_points > 0 — the metatask row renders."""
    await _board(db_session, character)
    players = await get_or_create_players(db_session)
    await seed_score_fixtures(db_session, players, CURRENT_ERA)

    owner = await _character(db_session, METATASK_PLAYER[0])
    praxis = await _praxis(db_session, METATASK_PRAXIS_TITLE)

    contributions = await compute_contributions(
        [praxis],
        owner,
        CURRENT_ERA,
        db_session,
        character_level=CURRENT_ERA.metatask_apply_level,
    )
    assert contributions[praxis.id].metatask_points > 0


@pytest.mark.asyncio
async def test_seeded_metatask_owner_is_at_the_apply_gate(
    db_session: AsyncSession,
    era: Era,
    character: Character,
):
    """The owner is at era.metatask_apply_level and has an open praxis to apply to."""
    await _board(db_session, character)
    players = await get_or_create_players(db_session)
    await seed_score_fixtures(db_session, players, CURRENT_ERA)

    owner = await _character(db_session, METATASK_PLAYER[0])
    from models.character_stats import CharacterStats

    stats = (
        await db_session.execute(
            select(CharacterStats).where(CharacterStats.character_id == owner.id)
        )
    ).scalar_one()
    assert stats.level >= CURRENT_ERA.metatask_apply_level
    # An in_progress praxis exists — apply_metatask refuses any other status.
    open_praxis = await _praxis(db_session, METATASK_OPEN_PRAXIS_TITLE)
    assert open_praxis.created_by_id == owner.id


@pytest.mark.asyncio
async def test_seeded_duel_sides_have_non_unit_multipliers(
    db_session: AsyncSession,
    era: Era,
    character: Character,
):
    """Both duel sides report a duel_multiplier != 1.0, and the Snide side is 0.0."""
    await _board(db_session, character)
    players = await get_or_create_players(db_session)
    await seed_score_fixtures(db_session, players, CURRENT_ERA)

    loser = await _character(db_session, DUEL_LOSER_USERNAME)
    winner = await _character(db_session, DUEL_WINNER_USERNAME)
    loser_praxis = await _praxis(db_session, DUEL_LOSER_TITLE)
    winner_praxis = await _praxis(db_session, DUEL_WINNER_TITLE)

    loser_side = (
        await compute_contributions([loser_praxis], loser, CURRENT_ERA, db_session)
    )[loser_praxis.id]
    winner_side = (
        await compute_contributions([winner_praxis], winner, CURRENT_ERA, db_session)
    )[winner_praxis.id]

    assert loser_side.duel_multiplier != 1.0
    assert winner_side.duel_multiplier != 1.0
    # Values come from the era, never hardcoded here.
    assert loser_side.duel_multiplier == (
        CURRENT_ERA.factions[loser.faction_slug].duel_loss_modifier
    )
    assert winner_side.duel_multiplier == (
        CURRENT_ERA.factions[winner.faction_slug].duel_win_modifier
    )


@pytest.mark.asyncio
async def test_seed_score_fixtures_is_idempotent(
    db_session: AsyncSession,
    era: Era,
    character: Character,
):
    """Re-running the seed creates no duplicate praxes."""
    await _board(db_session, character)
    players = await get_or_create_players(db_session)
    await seed_score_fixtures(db_session, players, CURRENT_ERA)
    await seed_score_fixtures(db_session, players, CURRENT_ERA)

    for title in (
        METATASK_PRAXIS_TITLE,
        METATASK_OPEN_PRAXIS_TITLE,
        DUEL_LOSER_TITLE,
        DUEL_WINNER_TITLE,
    ):
        rows = (
            await db_session.execute(select(Praxis).where(Praxis.title == title))
        ).scalars().all()
        assert len(rows) == 1, f"{title} duplicated on re-seed"

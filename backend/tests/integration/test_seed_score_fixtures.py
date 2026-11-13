"""The dev seed's score fixtures light up the metatask and `{base} x {mult}`
breakdown rows (#891). Not a test of scoring semantics.
"""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from eras.era_2 import ERA_2
from faction_slugs import ALBESCENT_FACTION_SLUG, UNAFFILIATED_FACTION_SLUG
from game_config import CURRENT_ERA, EraConfig
from models.character import Character
from models.era import Era
from models.faction import Faction, FactionStatus
from models.praxis import Praxis
from models.task import Task, TaskStatus, TaskType
from scripts.seed_demo_praxes import (
    COLLAB_AUTHOR_USERNAME,
    COLLAB_SECOND_USERNAME,
    COLLAB_TITLE,
    DUEL_LOSER_TITLE,
    DUEL_LOSER_USERNAME,
    DUEL_WINNER_TITLE,
    DUEL_WINNER_USERNAME,
    METATASK_OPEN_PRAXIS_TITLE,
    METATASK_PLAYER,
    METATASK_PRAXIS_TITLE,
    fixture_faction_slugs,
    get_or_create_players,
    print_login_recipe,
    seed_score_fixtures,
)
from services.praxis_scoring import compute_contributions


async def _board(
    db_session: AsyncSession, author: Character, era: EraConfig = CURRENT_ERA
) -> None:
    """Takes the era so a test can build another era's board (#2710)."""
    for slug in era.factions:
        existing = (
            await db_session.execute(select(Faction).where(Faction.slug == slug))
        ).scalar_one_or_none()
        if existing is None:
            db_session.add(Faction(slug=slug, status=FactionStatus.visible))
    await db_session.flush()
    for slug in set(fixture_faction_slugs(era)):
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
    # apply_metatask needs in_progress.
    open_praxis = await _praxis(db_session, METATASK_OPEN_PRAXIS_TITLE)
    assert open_praxis.created_by_id == owner.id


@pytest.mark.asyncio
async def test_seeded_duel_sides_have_non_unit_multipliers(
    db_session: AsyncSession,
    era: Era,
    character: Character,
):
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
    assert loser_side.duel_multiplier == (
        CURRENT_ERA.factions[loser.faction_slug].duel_loss_modifier
    )
    assert winner_side.duel_multiplier == (
        CURRENT_ERA.factions[winner.faction_slug].duel_win_modifier
    )


@pytest.mark.asyncio
async def test_seeded_duel_sides_keep_their_metatask_at_both_outcomes(
    db_session: AsyncSession,
    era: Era,
    character: Character,
):
    """#2633 / ADR-0086: a metatask is flat, so a x0.0 duel loss can't delete it."""
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

    assert loser_side.metatask_points > 0
    assert winner_side.metatask_points > 0
    assert loser_side.duel_multiplier == 0.0
    assert loser_side.total == (
        loser_side.metatask_points
        + loser_side.points_from_votes
        + loser_side.habit_bonus_points
    )
    assert winner_side.total == (
        winner_side.base_points
        * winner_side.faction_multiplier
        * winner_side.duel_multiplier
        + winner_side.metatask_points
        + winner_side.points_from_votes
        + winner_side.habit_bonus_points
    )


@pytest.mark.asyncio
async def test_seeded_collab_carries_the_own_faction_collab_modifier(
    db_session: AsyncSession,
    era: Era,
    character: Character,
):
    """Pins which modifier is read, not its value (Era 2 has none) (#2710)."""
    await _board(db_session, character)
    players = await get_or_create_players(db_session)
    await seed_score_fixtures(db_session, players, CURRENT_ERA)

    praxis = await _praxis(db_session, COLLAB_TITLE)
    _, _, collab_slug = fixture_faction_slugs(CURRENT_ERA)
    expected = CURRENT_ERA.factions[collab_slug].collab_own_modifier

    for username in (COLLAB_AUTHOR_USERNAME, COLLAB_SECOND_USERNAME):
        member = await _character(db_session, username)
        assert member.faction_slug == collab_slug, username
        contribution = (
            await compute_contributions([praxis], member, CURRENT_ERA, db_session)
        )[praxis.id]
        assert contribution.faction_multiplier == expected, username
        assert contribution.duel_multiplier == 1.0, username


@pytest.mark.asyncio
async def test_collab_fixture_skips_when_the_board_has_no_collab_task(
    db_session: AsyncSession,
    era: Era,
    character: Character,
):
    """The board lives only in the DB, so the task may not exist (#2710)."""
    metatask_slug, duel_slug, _ = fixture_faction_slugs(CURRENT_ERA)
    for slug in CURRENT_ERA.factions:
        existing = (
            await db_session.execute(select(Faction).where(Faction.slug == slug))
        ).scalar_one_or_none()
        if existing is None:
            db_session.add(Faction(slug=slug, status=FactionStatus.visible))
    await db_session.flush()
    for slug in {metatask_slug, duel_slug}:
        db_session.add(Task(
            title=f"Board task ({slug})",
            description="fixture",
            point_value=100,
            level_required=0,
            status=TaskStatus.active,
            task_type=TaskType.standard,
            created_by=character.id,
            primary_faction_slug=slug,
        ))
    await db_session.flush()

    players = await get_or_create_players(db_session)
    await seed_score_fixtures(db_session, players, CURRENT_ERA)

    rows = (
        await db_session.execute(select(Praxis).where(Praxis.title == COLLAB_TITLE))
    ).scalars().all()
    assert rows == []
    await _praxis(db_session, METATASK_PRAXIS_TITLE)
    await _praxis(db_session, DUEL_LOSER_TITLE)
    print_login_recipe(CURRENT_ERA)


@pytest.mark.asyncio
async def test_seed_score_fixtures_is_idempotent(
    db_session: AsyncSession,
    era: Era,
    character: Character,
):
    await _board(db_session, character)
    players = await get_or_create_players(db_session)
    await seed_score_fixtures(db_session, players, CURRENT_ERA)
    await seed_score_fixtures(db_session, players, CURRENT_ERA)

    for title in (
        METATASK_PRAXIS_TITLE,
        METATASK_OPEN_PRAXIS_TITLE,
        DUEL_LOSER_TITLE,
        DUEL_WINNER_TITLE,
        COLLAB_TITLE,
    ):
        rows = (
            await db_session.execute(select(Praxis).where(Praxis.title == title))
        ).scalars().all()
        assert len(rows) == 1, f"{title} duplicated on re-seed"


@pytest.mark.asyncio
async def test_fixtures_seed_on_an_era_that_drops_their_original_factions(
    db_session: AsyncSession,
    era: Era,
    character: Character,
):
    """#2710: Era 2 lacks `ua` and `coven`; once an FK violation and a KeyError."""
    await _board(db_session, character, ERA_2)
    players = await get_or_create_players(db_session, ERA_2)
    await seed_score_fixtures(db_session, players, ERA_2)
    print_login_recipe(ERA_2)

    assert set(fixture_faction_slugs(ERA_2)) <= set(ERA_2.factions)
    for title in (METATASK_PRAXIS_TITLE, DUEL_LOSER_TITLE, COLLAB_TITLE):
        await _praxis(db_session, title)
    for player in players.values():
        assert player.faction_slug in ERA_2.factions, player.username


def test_fixture_factions_are_never_sentinels_and_are_era_read():
    """ADR-0087 sentinels are not demo skins."""
    for era_config in (CURRENT_ERA, ERA_2):
        slugs = fixture_faction_slugs(era_config)
        assert len(slugs) == 3
        for slug in slugs:
            assert slug in era_config.factions
            assert slug not in (UNAFFILIATED_FACTION_SLUG, ALBESCENT_FACTION_SLUG)
    # Distinct slugs: each fixture needs its own board task.
    assert len(set(fixture_faction_slugs(CURRENT_ERA))) == 3
    assert len(set(fixture_faction_slugs(ERA_2))) == 3

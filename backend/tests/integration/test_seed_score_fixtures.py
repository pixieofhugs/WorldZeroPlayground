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
    """Minimum viable board: every era faction plus one task per faction used.

    Takes the era so a test can build the board a *different* era would seed —
    which is the only way to reach the case #2710 is about, where the slugs the
    fixtures used to hardcode have no faction row at all.
    """
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
async def test_seeded_duel_sides_keep_their_metatask_at_both_outcomes(
    db_session: AsyncSession,
    era: Era,
    character: Character,
):
    """#2633: a metatask is flat, so a x0.0 duel loss cannot delete it.

    Scored through the production path, both sides, at the two modifiers that
    bracket the rule — Snide's duel_loss_modifier (0.0, the only one in the game
    that can zero a base) and the winner's duel_win_modifier. This is the fixture
    the issue asks for: without the metatask on the duel pair, the old formula
    and ADR-0086's produce identical numbers everywhere in dev.
    """
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
    # The losing side's base is annihilated; the metatask and the votes are not.
    assert loser_side.duel_multiplier == 0.0
    assert loser_side.total == (
        loser_side.metatask_points
        + loser_side.points_from_votes
        + loser_side.habit_bonus_points
    )
    # The winning side multiplies the base ALONE — the metatask is not doubled.
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
    """The seeded collab is scored through ``collab_own_modifier``, whatever it is.

    Derived from the slug the fixture actually used, never named and never
    compared against a written-down product (#2710). The fixture no longer
    promises a non-1.0 bonus — Era 2 has none to give — so what is pinned here
    is the arrangement that decides *which* modifier scoring reads: both members
    standing in the collab task's own faction.
    """
    await _board(db_session, character)
    players = await get_or_create_players(db_session)
    await seed_score_fixtures(db_session, players, CURRENT_ERA)

    praxis = await _praxis(db_session, COLLAB_TITLE)
    _, _, collab_slug = fixture_faction_slugs(CURRENT_ERA)
    expected = CURRENT_ERA.factions[collab_slug].collab_own_modifier

    # Both members are in the task's own faction, so either side shows it.
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
    """No task in the collab fixture's faction is a skip, not a crash.

    ERA_1_TASKS is empty by design — the board lives only in the DB — so on a
    freshly seeded database there may be no such task at all. The fixture must
    behave like its metatask/duel siblings and skip rather than invent one, and
    ``print_login_recipe`` must survive reporting that skip (#2710).
    """
    metatask_slug, duel_slug, _ = fixture_faction_slugs(CURRENT_ERA)
    for slug in CURRENT_ERA.factions:
        existing = (
            await db_session.execute(select(Faction).where(Faction.slug == slug))
        ).scalar_one_or_none()
        if existing is None:
            db_session.add(Faction(slug=slug, status=FactionStatus.visible))
    await db_session.flush()
    # Deliberately no task in the collab fixture's faction.
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
    # The siblings still landed — one missing task does not sink the whole seed.
    await _praxis(db_session, METATASK_PRAXIS_TITLE)
    await _praxis(db_session, DUEL_LOSER_TITLE)
    # ...and the summary can say so without raising.
    print_login_recipe(CURRENT_ERA)


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
    """#2710: an era without `ua` or `coven` still seeds, and still reports itself.

    Era 2 carries five factions and neither of the two these fixtures used to
    name. A fresh dev database under it failed twice over: the demo cast went in
    against faction rows the era never seeded (an FK violation), and then
    ``print_login_recipe`` raised ``KeyError: 'coven'`` while composing the line
    that says the collab was *skipped*.

    Only ERA_2's factions get rows here, so a slug this era does not carry has
    nothing to point at — which is what makes the assertion mean something.
    """
    await _board(db_session, character, ERA_2)
    players = await get_or_create_players(db_session, ERA_2)
    await seed_score_fixtures(db_session, players, ERA_2)
    print_login_recipe(ERA_2)  # the crash site

    assert set(fixture_faction_slugs(ERA_2)) <= set(ERA_2.factions)
    for title in (METATASK_PRAXIS_TITLE, DUEL_LOSER_TITLE, COLLAB_TITLE):
        await _praxis(db_session, title)
    for player in players.values():
        assert player.faction_slug in ERA_2.factions, player.username


def test_fixture_factions_are_never_sentinels_and_are_era_read():
    """The slugs are real factions of whichever era is asked, not literals.

    `na` is "no faction" and Albescent is the secret society (ADR-0087) — a demo
    fixture skinned as either is not a demo of anything.
    """
    for era_config in (CURRENT_ERA, ERA_2):
        slugs = fixture_faction_slugs(era_config)
        assert len(slugs) == 3
        for slug in slugs:
            assert slug in era_config.factions
            assert slug not in (UNAFFILIATED_FACTION_SLUG, ALBESCENT_FACTION_SLUG)
    # Three distinct fixtures get three distinct slugs while the era can afford
    # it — each needs a task on the board carrying its slug, so three tries beat
    # one. Both eras can.
    assert len(set(fixture_faction_slugs(CURRENT_ERA))) == 3
    assert len(set(fixture_faction_slugs(ERA_2))) == 3

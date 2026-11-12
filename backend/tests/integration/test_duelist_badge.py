"""The duelist badge — won *or* ahead in a duel (#748, ADR-0033, ADR-0011).

Live wins are provisional (ADR-0011); a `resolved` duel reads the frozen
`Duel.winner_character_id` and never recomputes, so the badge survives era close.
"""

import pytest
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession

from faction_slugs import real_faction_slugs
from game_config import CURRENT_ERA
from models.character import Character
from models.duel import DuelStatus
from models.era import Era
from models.faction import Faction
from models.praxis import (
    ModerationStatus,
)
from services.badge import build_badge_contexts, list_badges_for_character
from tests.integration.factories import (
    make_duel,
)

DUELIST_BADGE = {"key": "duelist", "name": "Duelist"}

#: Lone-tie-taker sides, derived from the perk (see test_duel_era_resolution.py).
TIE_TAKER = next(
    (
        slug
        for slug in real_faction_slugs(CURRENT_ERA)
        if CURRENT_ERA.factions[slug].takes_duel_ties
    ),
    None,
)
NOT_TIE_TAKER = next(
    slug
    for slug in real_faction_slugs(CURRENT_ERA)
    if not CURRENT_ERA.factions[slug].takes_duel_ties
)


async def _badge_keys(
    session: AsyncSession, character: Character
) -> list[str]:
    return [badge.key for badge in await list_badges_for_character(character, session)]


@pytest.mark.asyncio
async def test_strictly_leading_side_is_a_duelist(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    _, challenger, opponent = await make_duel(
        db_session, era, label="lead", challenger_votes=4, opponent_votes=3, commit=True)
    assert await _badge_keys(db_session, challenger) == ["duelist"]
    assert await _badge_keys(db_session, opponent) == []


@pytest.mark.asyncio
async def test_a_tie_is_not_a_win(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    _, challenger, opponent = await make_duel(
        db_session, era, label="tie", challenger_votes=3, opponent_votes=3, commit=True)
    assert await _badge_keys(db_session, challenger) == []
    assert await _badge_keys(db_session, opponent) == []


@pytest.mark.asyncio
async def test_snide_wins_the_tie_and_earns_the_badge(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    """The tie-taker wins the tie; the badge must agree with the multiplier (#748)."""
    if TIE_TAKER is None:
        pytest.skip(f"no faction in {CURRENT_ERA.config_key} takes duel ties")
    _, challenger, opponent = await make_duel(
        db_session,
        era,
        label="snidetie",
        challenger_votes=3,
        opponent_votes=3,
        challenger_faction=TIE_TAKER,
        opponent_faction=NOT_TIE_TAKER, commit=True)
    assert await _badge_keys(db_session, challenger) == ["duelist"]
    assert await _badge_keys(db_session, opponent) == []


@pytest.mark.asyncio
async def test_an_unvoted_duel_has_no_duelist(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    _, challenger, opponent = await make_duel(db_session, era, label="quiet", commit=True)
    assert await _badge_keys(db_session, challenger) == []
    assert await _badge_keys(db_session, opponent) == []


@pytest.mark.asyncio
async def test_forfeit_hands_the_badge_to_the_other_side(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    _, challenger, opponent = await make_duel(
        db_session,
        era,
        label="ff",
        challenger_votes=9,
        opponent_votes=1,
        forfeiter="challenger", commit=True)
    assert await _badge_keys(db_session, challenger) == []
    assert await _badge_keys(db_session, opponent) == ["duelist"]


@pytest.mark.asyncio
async def test_resolved_duel_grants_the_badge_to_its_frozen_winner(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    duel, challenger, opponent = await make_duel(
        db_session,
        era,
        label="past",
        challenger_votes=5,
        opponent_votes=0,
        status=DuelStatus.active, commit=True)
    duel.status = DuelStatus.resolved
    duel.winner_character_id = challenger.id
    await db_session.commit()

    assert await _badge_keys(db_session, challenger) == ["duelist"]
    assert await _badge_keys(db_session, opponent) == []


@pytest.mark.asyncio
async def test_resolved_duel_frozen_to_the_opponent_leaves_the_loser_bare(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    duel, challenger, opponent = await make_duel(
        db_session,
        era,
        label="lost",
        challenger_votes=0,
        opponent_votes=5,
        status=DuelStatus.active, commit=True)
    duel.status = DuelStatus.resolved
    duel.winner_character_id = opponent.id
    await db_session.commit()

    assert await _badge_keys(db_session, challenger) == []
    assert await _badge_keys(db_session, opponent) == ["duelist"]


@pytest.mark.asyncio
async def test_resolved_duel_with_no_frozen_winner_grants_nothing(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    duel, challenger, opponent = await make_duel(
        db_session,
        era,
        label="draw",
        challenger_votes=3,
        opponent_votes=3,
        status=DuelStatus.active, commit=True)
    duel.status = DuelStatus.resolved
    duel.winner_character_id = None
    await db_session.commit()

    assert await _badge_keys(db_session, challenger) == []
    assert await _badge_keys(db_session, opponent) == []


@pytest.mark.asyncio
async def test_resolved_forfeit_winner_with_the_lower_score_keeps_the_badge(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    duel, challenger, opponent = await make_duel(
        db_session,
        era,
        label="ffpast",
        challenger_votes=1,
        opponent_votes=9,
        status=DuelStatus.active,
        forfeiter="opponent", commit=True)
    duel.status = DuelStatus.resolved
    duel.winner_character_id = challenger.id
    await db_session.commit()

    assert await _badge_keys(db_session, challenger) == ["duelist"]
    assert await _badge_keys(db_session, opponent) == []


@pytest.mark.asyncio
async def test_resolved_duel_ignores_a_live_tally_that_disagrees(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    """No forfeit: recomputing via `duel_winner` would name the opponent."""
    duel, challenger, opponent = await make_duel(
        db_session,
        era,
        label="drift",
        challenger_votes=1,
        opponent_votes=9,
        status=DuelStatus.active, commit=True)
    duel.status = DuelStatus.resolved
    duel.winner_character_id = challenger.id
    await db_session.commit()

    assert await _badge_keys(db_session, challenger) == ["duelist"]
    assert await _badge_keys(db_session, opponent) == []


@pytest.mark.asyncio
async def test_active_forfeited_duel_still_counts(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    _, challenger, opponent = await make_duel(
        db_session,
        era,
        label="act",
        status=DuelStatus.active,
        forfeiter="opponent", commit=True)
    assert await _badge_keys(db_session, challenger) == ["duelist"]
    assert await _badge_keys(db_session, opponent) == []


@pytest.mark.asyncio
async def test_failed_side_is_not_a_duelist_even_while_leading(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    """Same ``duel_winner`` rule as the multiplier (#1442)."""
    _, challenger, opponent = await make_duel(
        db_session,
        era,
        label="failbadge",
        challenger_votes=9,
        opponent_votes=1,
        challenger_moderation=ModerationStatus.failed, commit=True)
    assert await _badge_keys(db_session, challenger) == []
    assert await _badge_keys(db_session, opponent) == ["duelist"]


@pytest.mark.asyncio
async def test_uninvolved_character_earns_nothing(
    db_session: AsyncSession, era: Era, character: Character, some_faction: Faction
):
    await make_duel(
        db_session, era, label="else", challenger_votes=4, opponent_votes=1, commit=True)
    assert await _badge_keys(db_session, character) == []


@pytest.mark.asyncio
async def test_endpoint_surfaces_the_duelist_badge(
    client, db_session: AsyncSession, era: Era, some_faction: Faction
):
    _, challenger, _opponent = await make_duel(
        db_session, era, label="api", challenger_votes=4, opponent_votes=2, commit=True)
    resp = await client.get(f"/characters/{challenger.id}")
    assert resp.status_code == 200
    assert resp.json()["badges"] == [DUELIST_BADGE]


@pytest.mark.asyncio
async def test_batch_path_is_constant_query_count(
    db_connection, db_session: AsyncSession, era: Era, some_faction: Faction
):
    """ADR-0033: query count is constant in page size, live and resolved mixed."""
    _, one_challenger, one_opponent = await make_duel(
        db_session, era, label="b1", challenger_votes=5, opponent_votes=1, commit=True)
    _, two_challenger, two_opponent = await make_duel(
        db_session, era, label="b2", challenger_votes=1, opponent_votes=5, commit=True)
    _, three_challenger, three_opponent = await make_duel(
        db_session, era, label="b3", forfeiter="challenger", commit=True)
    four_duel, four_challenger, four_opponent = await make_duel(
        db_session, era, label="b4", challenger_votes=2, opponent_votes=7, commit=True)
    four_duel.status = DuelStatus.resolved
    four_duel.winner_character_id = four_challenger.id
    await db_session.commit()

    statements: list[str] = []

    @event.listens_for(db_connection.sync_connection, "before_cursor_execute")
    def record(conn, cursor, statement, parameters, context, executemany):
        # Skip SAVEPOINT/RELEASE harness churn.
        if statement.lstrip().upper().startswith("SELECT"):
            statements.append(statement)

    try:
        statements.clear()
        small = await build_badge_contexts([one_challenger, one_opponent], db_session)
        small_query_count = len(statements)

        statements.clear()
        large = await build_badge_contexts(
            [
                one_challenger,
                one_opponent,
                two_challenger,
                two_opponent,
                three_challenger,
                three_opponent,
                four_challenger,
                four_opponent,
            ],
            db_session,
        )
        large_query_count = len(statements)
    finally:
        event.remove(db_connection.sync_connection, "before_cursor_execute", record)

    assert large_query_count == small_query_count
    # account roll-up, duel rows, live tally, previous era (#823), factions (#748)
    assert small_query_count <= 5, statements

    assert small[one_challenger.id].is_duel_winner is True
    assert small[one_opponent.id].is_duel_winner is False
    assert large[two_opponent.id].is_duel_winner is True
    assert large[two_challenger.id].is_duel_winner is False
    assert large[three_opponent.id].is_duel_winner is True
    assert large[three_challenger.id].is_duel_winner is False
    assert large[four_challenger.id].is_duel_winner is True
    assert large[four_opponent.id].is_duel_winner is False

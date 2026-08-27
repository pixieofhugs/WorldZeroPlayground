"""The duelist badge — having won *or* being ahead in a duel (#748, ADR-0033, ADR-0011).

The badge holds when a character is currently ahead on votes in a live duel,
holds a forfeit win, or is the frozen winner of a `resolved` duel. Live wins are
provisional by design (ADR-0011: mid-era the tally floats); the resolved case is
the frozen one — owner ruling 2026-07-21 made the badge survive era close, so a
win does not silently vanish when #824 resolves every live duel at reset.

The resolved case reads `Duel.winner_character_id` and never recomputes: a
forfeit winner can hold the *lower* frozen score, which is what
`test_resolved_forfeit_winner_with_the_lower_score_keeps_the_badge` pins.

The last test is the load-bearing one: the per-character duel fact must resolve
in a fixed number of set-based queries, not one per character (ADR-0033's
amended batch rule — the Constellation roster is a list path).
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

#: The two sides of a lone-tie-taker tie, derived from the PERK and never named
#: (#2664, extending #2708). The rule is "the SOLE holder of `takes_duel_ties`
#: takes the tie", so a fixture that hardcoded "snide" would stop naming the
#: rule the moment an era moved the ability — and a fixture default could pick
#: a second holder and silently turn the case under test into a real tie.
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


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


async def _badge_keys(
    session: AsyncSession, character: Character
) -> list[str]:
    return [badge.key for badge in await list_badges_for_character(character, session)]


# ---------------------------------------------------------------------------
# the badge
# ---------------------------------------------------------------------------


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
    """Snide takes ties (#748): the badge must agree with the 2.0× multiplier.

    A tied duel names no winner by votes, but Snide's ability wins ties, so the
    Snide side reads as the duel winner everywhere the tiebreak applies — the
    live multiplier already did this; the badge was the straggler.
    """
    # Every era faction's row is seeded by ``some_faction``. The side named
    # here is the one holding ``takes_duel_ties``, i.e. the faction
    # ``services.scoring.sole_tie_taker_slug`` picks out — so this names the
    # rule, not a roster (#2708, #2664).
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
    """Zero-zero is a tie, not a challenger win."""
    _, challenger, opponent = await make_duel(db_session, era, label="quiet", commit=True)
    assert await _badge_keys(db_session, challenger) == []
    assert await _badge_keys(db_session, opponent) == []


@pytest.mark.asyncio
async def test_forfeit_hands_the_badge_to_the_other_side(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    """The forfeiter loses even while holding the *higher* tally (#824 finding)."""
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
    """The badge survives era close: "won or winning" (owner ruling 2026-07-21)."""
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
    """A tie / no-contest froze `winner_character_id` as NULL — nobody won."""
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
    """The frozen field is authoritative — never inferred from the snapshot points.

    The opponent forfeited while holding the *higher* tally, so #824 froze the
    challenger as winner on the lower score. Comparing points would hand the
    badge to the wrong side.
    """
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
    """Recomputing at all is the bug: the frozen winner trails on live votes.

    No forfeit is recorded, so `duel_winner` over the tally would name the
    opponent. Only reading `Duel.winner_character_id` gets this right.
    """
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
    """The badge reads the same rule as the multiplier (#1442).

    ``services.badge`` is the third caller of ``duel_winner`` — the issue named
    two. If it kept deciding on the tally alone, a praxis an admin ruled failed
    would still wear "Duelist" while its score said it lost.
    """
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


# ---------------------------------------------------------------------------
# the batch rule
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_batch_path_is_constant_query_count(
    db_connection, db_session: AsyncSession, era: Era, some_faction: Faction
):
    """An 8-character page costs the same number of queries as a 2-character one.

    Guards ADR-0033's amended rule: the per-character duel fact must fold into
    set-based queries, never one query per character in the loop. The large page
    mixes live and `resolved` duels, so the frozen-vs-live split must not cost a
    query either.
    """
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
        # SAVEPOINT / RELEASE churn from the test harness is not a query.
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
    # Five: the account roll-up, the duel rows, the live tally, the previous-era
    # lookup (#823), and the live sides' faction lookup (#748 Snide tiebreak). The
    # guard that matters is the equality above — this bound only keeps the fixed
    # cost visible.
    assert small_query_count <= 5, statements

    assert small[one_challenger.id].is_duel_winner is True
    assert small[one_opponent.id].is_duel_winner is False
    assert large[two_opponent.id].is_duel_winner is True
    assert large[two_challenger.id].is_duel_winner is False
    assert large[three_opponent.id].is_duel_winner is True
    assert large[three_challenger.id].is_duel_winner is False
    # Frozen winner, despite trailing the live tally 2-7.
    assert large[four_challenger.id].is_duel_winner is True
    assert large[four_opponent.id].is_duel_winner is False

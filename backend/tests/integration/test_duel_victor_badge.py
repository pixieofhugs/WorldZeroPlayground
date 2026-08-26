"""The duel_victor badge — won a duel *last era* (#823, ADR-0033, ADR-0052).

These tests are the entire safety net for this badge. Era 1 is live and **no era
has ever closed**, so no ``resolved`` duel exists in any environment: the badge
cannot render anywhere in the running app and cannot be checked by looking at it.

The badge holds only for a character frozen as ``Duel.winner_character_id`` on a
duel whose ``resolved_era_id`` is the era immediately before the current one.
That column exists because ``resolved_at`` cannot answer the question: the reset
inserts the new ``Era`` row *before* stamping ``resolved_at``, so a frozen duel
timestamps microseconds *after* the incoming era's ``started_at`` and a boundary
comparison files it under the era it did not belong to. The last test walks the
real ``apply_era_reset`` to pin that end to end.

Sibling ``duelist`` (#748) is "won *or* winning" and does not lapse; this one is
the narrow finalized-last-era case, so a last-era winner holds both.
"""
from typing import Optional

import pytest
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.duel import Duel, DuelStatus
from models.era import Era
from models.faction import Faction
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import Task, TaskStatus
from models.vote import Vote
from services.badge import build_badge_contexts, list_badges_for_character
from services.era import apply_era_reset
from tests.integration.factories import (
    cast_vote,
    make_character,
    make_duel,
    make_solo_praxis,
    make_task,
)

DUEL_VICTOR_BADGE = {"key": "duel_victor", "name": "Duel Victor"}


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


async def _next_era(session: AsyncSession, account: Account, *, name: str) -> Era:
    """Append an Era row — the reset's own insert, without the reset."""
    era_row = Era(name=name, config_key=CURRENT_ERA.config_key, started_by=account.id)
    session.add(era_row)
    await session.commit()
    await session.refresh(era_row)
    return era_row


async def _freeze(
    session: AsyncSession,
    duel: Duel,
    *,
    winner: Optional[Character],
    resolved_era: Optional[Era],
) -> None:
    """Stamp the frozen outcome by hand — what ``apply_era_reset`` writes."""
    duel.status = DuelStatus.resolved
    duel.winner_character_id = winner.id if winner else None
    duel.resolved_era_id = resolved_era.id if resolved_era else None
    await session.commit()


async def _badge_keys(session: AsyncSession, character: Character) -> list[str]:
    return [badge.key for badge in await list_badges_for_character(character, session)]


# ---------------------------------------------------------------------------
# the badge
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_frozen_win_in_the_previous_era_earns_the_badge(
    db_session: AsyncSession, era: Era, account: Account, some_faction: Faction
):
    """The whole point: a finalized win in the era that just closed."""
    duel, challenger, opponent = await make_duel(
        db_session, era, label="won", challenger_votes=5, opponent_votes=1, commit=True)
    await _freeze(db_session, duel, winner=challenger, resolved_era=era)
    await _next_era(db_session, account, name="Era 2")

    # `duelist` never lapses, so a last-era victor holds both duel badges.
    assert await _badge_keys(db_session, challenger) == ["duelist", "duel_victor"]
    assert await _badge_keys(db_session, opponent) == []


@pytest.mark.asyncio
async def test_forfeit_winner_on_the_lower_frozen_score_still_earns_it(
    db_session: AsyncSession, era: Era, account: Account, some_faction: Faction
):
    """Read `winner_character_id`; never infer the winner from the points.

    The opponent forfeited while ahead 9-1, so the freeze names the challenger on
    the *lower* score. Comparing tallies would decorate the wrong side.
    """
    duel, challenger, opponent = await make_duel(
        db_session,
        era,
        label="ff",
        challenger_votes=1,
        opponent_votes=9,
        forfeiter="opponent", commit=True)
    await _freeze(db_session, duel, winner=challenger, resolved_era=era)
    await _next_era(db_session, account, name="Era 2")

    assert "duel_victor" in await _badge_keys(db_session, challenger)
    assert "duel_victor" not in await _badge_keys(db_session, opponent)


@pytest.mark.asyncio
async def test_frozen_win_in_the_current_era_does_not_earn_it(
    db_session: AsyncSession, era: Era, account: Account, some_faction: Faction
):
    """A win stamped with the *live* era is not "last era" — that is `duelist`.

    The reset cannot produce this (it stamps the era it is closing), but nothing
    in the schema forbids it, and the badge must filter on the era rather than on
    "is resolved at all" — otherwise it is indistinguishable from `duelist`.
    """
    duel, challenger, opponent = await make_duel(
        db_session, era, label="cur", challenger_votes=5, opponent_votes=1, commit=True)
    current_era = await _next_era(db_session, account, name="Era 2")
    await _freeze(db_session, duel, winner=challenger, resolved_era=current_era)

    assert await _badge_keys(db_session, challenger) == ["duelist"]
    assert await _badge_keys(db_session, opponent) == []


@pytest.mark.asyncio
async def test_a_frozen_win_two_eras_ago_has_lapsed(
    db_session: AsyncSession, era: Era, account: Account, some_faction: Faction
):
    """"Last era" is a window, not a permanent record — it closes behind you."""
    duel, challenger, opponent = await make_duel(
        db_session, era, label="old", challenger_votes=5, opponent_votes=1, commit=True)
    await _freeze(db_session, duel, winner=challenger, resolved_era=era)
    await _next_era(db_session, account, name="Era 2")
    await _next_era(db_session, account, name="Era 3")

    assert await _badge_keys(db_session, challenger) == ["duelist"]
    assert await _badge_keys(db_session, opponent) == []


@pytest.mark.asyncio
async def test_null_frozen_winner_grants_nothing_to_either_side(
    db_session: AsyncSession, era: Era, account: Account, some_faction: Faction
):
    """A tie or a no-contest froze NULL — nobody won it (ADR-0052)."""
    duel, challenger, opponent = await make_duel(
        db_session, era, label="tie", challenger_votes=3, opponent_votes=3, commit=True)
    await _freeze(db_session, duel, winner=None, resolved_era=era)
    await _next_era(db_session, account, name="Era 2")

    assert await _badge_keys(db_session, challenger) == []
    assert await _badge_keys(db_session, opponent) == []


@pytest.mark.asyncio
async def test_a_live_duel_never_earns_it(
    db_session: AsyncSession, era: Era, account: Account, some_faction: Faction
):
    """Leading a *settled* duel is provisional (ADR-0011) — `duelist`, not this."""
    _duel, challenger, opponent = await make_duel(
        db_session, era, label="live", challenger_votes=5, opponent_votes=1, commit=True)
    await _next_era(db_session, account, name="Era 2")

    assert await _badge_keys(db_session, challenger) == ["duelist"]
    assert await _badge_keys(db_session, opponent) == []


@pytest.mark.asyncio
async def test_no_era_has_closed_so_nobody_is_a_victor(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    """Today's state: one Era row, so there is no previous era to have won in."""
    duel, challenger, opponent = await make_duel(
        db_session, era, label="era1", challenger_votes=5, opponent_votes=1, commit=True)
    await _freeze(db_session, duel, winner=challenger, resolved_era=era)

    assert await _badge_keys(db_session, challenger) == ["duelist"]
    assert await _badge_keys(db_session, opponent) == []


@pytest.mark.asyncio
async def test_a_frozen_win_with_no_recorded_era_grants_nothing(
    db_session: AsyncSession, era: Era, account: Account, some_faction: Faction
):
    """`resolved_era_id` is nullable; an unstamped freeze must not fall through."""
    duel, challenger, opponent = await make_duel(
        db_session, era, label="unstamped", challenger_votes=5, opponent_votes=1, commit=True)
    await _freeze(db_session, duel, winner=challenger, resolved_era=None)
    await _next_era(db_session, account, name="Era 2")

    assert await _badge_keys(db_session, challenger) == ["duelist"]
    assert await _badge_keys(db_session, opponent) == []


@pytest.mark.asyncio
async def test_a_character_with_no_duels_earns_nothing(
    db_session: AsyncSession, era: Era, account: Account, character: Character,
    some_faction: Faction,
):
    duel, challenger, _opponent = await make_duel(
        db_session, era, label="other", challenger_votes=5, opponent_votes=1, commit=True)
    await _freeze(db_session, duel, winner=challenger, resolved_era=era)
    await _next_era(db_session, account, name="Era 2")

    assert await _badge_keys(db_session, character) == []


@pytest.mark.asyncio
async def test_endpoint_surfaces_the_duel_victor_badge(
    client, db_session: AsyncSession, era: Era, account: Account, some_faction: Faction
):
    duel, challenger, _opponent = await make_duel(
        db_session, era, label="api", challenger_votes=4, opponent_votes=2, commit=True)
    await _freeze(db_session, duel, winner=challenger, resolved_era=era)
    await _next_era(db_session, account, name="Era 2")

    resp = await client.get(f"/characters/{challenger.id}")
    assert resp.status_code == 200
    assert DUEL_VICTOR_BADGE in resp.json()["badges"]


# ---------------------------------------------------------------------------
# end to end through the real era close
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_the_real_era_reset_produces_the_badge(
    db_session: AsyncSession, era: Era, account: Account, some_faction: Faction
):
    """The load-bearing test: no hand-stamped fixture anywhere in the chain.

    ``apply_era_reset`` freezes the duel and stamps the *closing* era, and the
    badge reads it back. A ``resolved_at`` comparison would fail here — the new
    Era row is inserted first, so the freeze timestamps after the new era began.
    """
    duel, challenger, opponent = await make_duel(
        db_session, era, label="reset", challenger_votes=6, opponent_votes=2, commit=True)

    new_era_row = Era(
        name="Era 2", config_key=CURRENT_ERA.config_key, started_by=account.id
    )
    db_session.add(new_era_row)
    await db_session.flush()
    await apply_era_reset([challenger, opponent], new_era_row, db_session)
    await db_session.commit()

    await db_session.refresh(duel)
    assert duel.status == DuelStatus.resolved
    assert duel.winner_character_id == challenger.id
    assert duel.resolved_era_id == era.id
    # The trap this column exists for: the freeze lands *after* the new era began.
    assert duel.resolved_at >= new_era_row.started_at

    assert "duel_victor" in await _badge_keys(db_session, challenger)
    assert "duel_victor" not in await _badge_keys(db_session, opponent)


# ---------------------------------------------------------------------------
# the batch rule
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_last_era_fact_costs_no_extra_query_per_character(
    db_connection, db_session: AsyncSession, era: Era, account: Account,
    some_faction: Faction,
):
    """ADR-0033's batch rule, extended to the first cross-era fact.

    A 6-character page costs exactly what a 2-character one does. The era lookup
    is one query for the whole page, and the last-era filter rides the duel rows
    the duelist fact already fetched.
    """
    one_duel, one_challenger, one_opponent = await make_duel(
        db_session, era, label="q1", challenger_votes=5, opponent_votes=1, commit=True)
    two_duel, two_challenger, two_opponent = await make_duel(
        db_session, era, label="q2", challenger_votes=1, opponent_votes=5, commit=True)
    three_duel, three_challenger, three_opponent = await make_duel(
        db_session, era, label="q3", challenger_votes=4, opponent_votes=0, commit=True)
    await _freeze(db_session, one_duel, winner=one_challenger, resolved_era=era)
    await _freeze(db_session, two_duel, winner=two_opponent, resolved_era=era)
    current_era = await _next_era(db_session, account, name="Era 2")
    # Frozen in the *live* era: present in the same page, must not qualify.
    await _freeze(db_session, three_duel, winner=three_challenger,
                  resolved_era=current_era)

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
            ],
            db_session,
        )
        large_query_count = len(statements)
    finally:
        event.remove(db_connection.sync_connection, "before_cursor_execute", record)

    assert large_query_count == small_query_count
    assert small_query_count <= 4, statements

    assert small[one_challenger.id].won_duel_last_era is True
    assert small[one_opponent.id].won_duel_last_era is False
    assert large[two_opponent.id].won_duel_last_era is True
    assert large[two_challenger.id].won_duel_last_era is False
    # Frozen in the current era, so `duelist` only.
    assert large[three_challenger.id].is_duel_winner is True
    assert large[three_challenger.id].won_duel_last_era is False

"""The duelist badge — winning a *live* duel (#748, ADR-0033, ADR-0011).

The badge holds when a character is currently ahead on votes in a live duel, or
holds a forfeit win. It is provisional by design (ADR-0011: mid-era the tally
floats); a `resolved` duel is a frozen past-era fact and belongs to the deferred
"won a duel last era" badge (#823), so it must NOT grant this one.

The last test is the load-bearing one: the per-character duel fact must resolve
in a fixed number of set-based queries, not one per character (ADR-0033's
amended batch rule — the Constellation roster is a list path).
"""
from typing import Optional

import pytest
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession

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

DUELIST_BADGE = {"key": "duelist", "name": "Duelist"}


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


async def _make_character(
    session: AsyncSession, era: Era, *, username: str
) -> Character:
    account = Account(email=f"{username}@example.com")
    session.add(account)
    await session.flush()
    character = Character(
        account_id=account.id,
        username=username,
        display_name=username,
        faction_slug="ua",
    )
    session.add(character)
    await session.flush()
    session.add(
        CharacterStats(
            character_id=character.id,
            era_id=era.id,
            score=0,
            all_time_score=0,
            level=0,
            votes_spent_this_era=0,
        )
    )
    await session.flush()
    return character


async def _make_task(session: AsyncSession, creator: Character) -> Task:
    task = Task(
        title="duel task",
        description="proof",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=creator.id,
        primary_faction_slug="ua",
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
        title="side",
        body_text="proof",
    )
    session.add(praxis)
    await session.flush()
    session.add(PraxisMember(praxis_id=praxis.id, character_id=author.id))
    await session.flush()
    return praxis


async def _cast_vote(
    session: AsyncSession, praxis: Praxis, voter: Character, value: int
) -> None:
    session.add(
        Vote(
            praxis_id=praxis.id,
            voter_character_id=voter.id,
            voter_account_id=voter.account_id,
            value=value,
        )
    )
    await session.flush()


async def _make_duel(
    session: AsyncSession,
    era: Era,
    *,
    label: str,
    challenger_votes: int = 0,
    opponent_votes: int = 0,
    status: DuelStatus = DuelStatus.settled,
    forfeiter: Optional[str] = None,
    winner_character_id: Optional[int] = None,
) -> tuple[Duel, Character, Character]:
    """Two fresh characters + their two solo praxes, linked as one duel."""
    challenger = await _make_character(session, era, username=f"{label}ch")
    opponent = await _make_character(session, era, username=f"{label}op")
    voter = await _make_character(session, era, username=f"{label}v")
    task = await _make_task(session, challenger)
    challenger_praxis = await _make_solo(session, task, challenger)
    opponent_praxis = await _make_solo(session, task, opponent)

    if challenger_votes:
        await _cast_vote(session, challenger_praxis, voter, challenger_votes)
    if opponent_votes:
        await _cast_vote(session, opponent_praxis, voter, opponent_votes)

    forfeited_by = None
    if forfeiter == "challenger":
        forfeited_by = challenger.id
    elif forfeiter == "opponent":
        forfeited_by = opponent.id

    duel = Duel(
        task_id=task.id,
        challenger_praxis_id=challenger_praxis.id,
        opponent_character_id=opponent.id,
        opponent_praxis_id=opponent_praxis.id,
        status=status,
        forfeited_by_character_id=forfeited_by,
        winner_character_id=winner_character_id,
    )
    session.add(duel)
    await session.commit()
    return duel, challenger, opponent


async def _badge_keys(
    session: AsyncSession, character: Character
) -> list[str]:
    return [badge.key for badge in await list_badges_for_character(character, session)]


# ---------------------------------------------------------------------------
# the badge
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_strictly_leading_side_is_a_duelist(
    db_session: AsyncSession, era: Era, faction_ua: Faction
):
    _, challenger, opponent = await _make_duel(
        db_session, era, label="lead", challenger_votes=4, opponent_votes=3
    )
    assert await _badge_keys(db_session, challenger) == ["duelist"]
    assert await _badge_keys(db_session, opponent) == []


@pytest.mark.asyncio
async def test_a_tie_is_not_a_win(
    db_session: AsyncSession, era: Era, faction_ua: Faction
):
    _, challenger, opponent = await _make_duel(
        db_session, era, label="tie", challenger_votes=3, opponent_votes=3
    )
    assert await _badge_keys(db_session, challenger) == []
    assert await _badge_keys(db_session, opponent) == []


@pytest.mark.asyncio
async def test_an_unvoted_duel_has_no_duelist(
    db_session: AsyncSession, era: Era, faction_ua: Faction
):
    """Zero-zero is a tie, not a challenger win."""
    _, challenger, opponent = await _make_duel(db_session, era, label="quiet")
    assert await _badge_keys(db_session, challenger) == []
    assert await _badge_keys(db_session, opponent) == []


@pytest.mark.asyncio
async def test_forfeit_hands_the_badge_to_the_other_side(
    db_session: AsyncSession, era: Era, faction_ua: Faction
):
    """The forfeiter loses even while holding the *higher* tally (#824 finding)."""
    _, challenger, opponent = await _make_duel(
        db_session,
        era,
        label="ff",
        challenger_votes=9,
        opponent_votes=1,
        forfeiter="challenger",
    )
    assert await _badge_keys(db_session, challenger) == []
    assert await _badge_keys(db_session, opponent) == ["duelist"]


@pytest.mark.asyncio
async def test_resolved_duel_does_not_grant_the_badge(
    db_session: AsyncSession, era: Era, faction_ua: Faction
):
    """A frozen past-era win is #823's badge, not this one."""
    duel, challenger, opponent = await _make_duel(
        db_session,
        era,
        label="past",
        challenger_votes=5,
        opponent_votes=0,
        status=DuelStatus.active,
    )
    duel.status = DuelStatus.resolved
    duel.winner_character_id = challenger.id
    await db_session.commit()

    assert await _badge_keys(db_session, challenger) == []
    assert await _badge_keys(db_session, opponent) == []


@pytest.mark.asyncio
async def test_active_forfeited_duel_still_counts(
    db_session: AsyncSession, era: Era, faction_ua: Faction
):
    _, challenger, opponent = await _make_duel(
        db_session,
        era,
        label="act",
        status=DuelStatus.active,
        forfeiter="opponent",
    )
    assert await _badge_keys(db_session, challenger) == ["duelist"]
    assert await _badge_keys(db_session, opponent) == []


@pytest.mark.asyncio
async def test_uninvolved_character_earns_nothing(
    db_session: AsyncSession, era: Era, character: Character, faction_ua: Faction
):
    await _make_duel(
        db_session, era, label="else", challenger_votes=4, opponent_votes=1
    )
    assert await _badge_keys(db_session, character) == []


@pytest.mark.asyncio
async def test_endpoint_surfaces_the_duelist_badge(
    client, db_session: AsyncSession, era: Era, faction_ua: Faction
):
    _, challenger, _opponent = await _make_duel(
        db_session, era, label="api", challenger_votes=4, opponent_votes=2
    )
    resp = await client.get(f"/characters/{challenger.id}")
    assert resp.status_code == 200
    assert resp.json()["badges"] == [DUELIST_BADGE]


# ---------------------------------------------------------------------------
# the batch rule
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_batch_path_is_constant_query_count(
    db_connection, db_session: AsyncSession, era: Era, faction_ua: Faction
):
    """A 6-character page costs the same number of queries as a 2-character one.

    Guards ADR-0033's amended rule: the per-character duel fact must fold into
    set-based queries, never one query per character in the loop.
    """
    _, one_challenger, one_opponent = await _make_duel(
        db_session, era, label="b1", challenger_votes=5, opponent_votes=1
    )
    _, two_challenger, two_opponent = await _make_duel(
        db_session, era, label="b2", challenger_votes=1, opponent_votes=5
    )
    _, three_challenger, three_opponent = await _make_duel(
        db_session, era, label="b3", forfeiter="challenger"
    )

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
    assert small_query_count <= 3, statements

    assert small[one_challenger.id].is_duel_winner is True
    assert small[one_opponent.id].is_duel_winner is False
    assert large[two_opponent.id].is_duel_winner is True
    assert large[two_challenger.id].is_duel_winner is False
    assert large[three_opponent.id].is_duel_winner is True
    assert large[three_challenger.id].is_duel_winner is False

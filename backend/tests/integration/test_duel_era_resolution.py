"""Era close freezes every duel outcome (ADR-0052, #824).

ADR-0011 says a duel's winner floats with the votes and "a definitive winner
only exists at era close". These tests exercise that close: ``apply_era_reset``
resolves a *mix* of duels in one pass — clear leader, forfeit win, tie, and an
incomplete ``active`` duel — asserting ``winner_character_id``, the frozen
per-side vote snapshot, and the terminal ``resolved`` status.
"""

import pytest
from sqlalchemy import select
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
from services.duel_outcome import duel_winner
from services.era import apply_era_reset


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


async def _make_character(
    session: AsyncSession, era: Era, *, username: str, email: str
) -> Character:
    account = Account(email=email)
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
    session: AsyncSession,
    task: Task,
    author: Character,
    *,
    status: PraxisStatus = PraxisStatus.submitted,
) -> Praxis:
    praxis = Praxis(
        task_id=task.id,
        created_by_id=author.id,
        type=PraxisType.solo,
        status=status,
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


async def _make_duel(
    session: AsyncSession,
    era: Era,
    *,
    label: str,
    status: DuelStatus,
    challenger_votes: int | None,
    opponent_votes: int | None,
    forfeiter: str | None = None,
) -> tuple[Duel, Character, Character]:
    """Build a full duel: two characters, two solo praxes, optional votes."""
    challenger = await _make_character(
        session, era, username=f"{label}_ch", email=f"{label}_ch@x.com"
    )
    opponent = await _make_character(
        session, era, username=f"{label}_op", email=f"{label}_op@x.com"
    )
    voter = await _make_character(
        session, era, username=f"{label}_v", email=f"{label}_v@x.com"
    )
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
    )
    session.add(duel)
    await session.flush()
    return duel, challenger, opponent


async def _close_the_era(session: AsyncSession, starter: Account) -> Era:
    new_era_row = Era(
        name=CURRENT_ERA.name,
        config_key=CURRENT_ERA.config_key,
        started_by=starter.id,
    )
    session.add(new_era_row)
    await session.flush()
    await apply_era_reset([], new_era_row, session)
    return new_era_row


# ---------------------------------------------------------------------------
# the pure rule
# ---------------------------------------------------------------------------


def test_duel_winner_prefers_forfeit_over_the_tally():
    """A forfeit decides the duel even when the forfeiter is far ahead on votes."""
    assert (
        duel_winner(
            challenger_character_id=1,
            opponent_character_id=2,
            challenger_points=99,
            opponent_points=0,
            forfeited_by_character_id=1,
        )
        == 2
    )


def test_duel_winner_needs_strictly_greater_points():
    assert (
        duel_winner(
            challenger_character_id=1,
            opponent_character_id=2,
            challenger_points=4,
            opponent_points=3,
        )
        == 1
    )
    assert (
        duel_winner(
            challenger_character_id=1,
            opponent_character_id=2,
            challenger_points=3,
            opponent_points=3,
        )
        is None
    )


# ---------------------------------------------------------------------------
# era close over a mix of duels
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_era_reset_freezes_a_mix_of_duels(
    db_session: AsyncSession, era: Era, account: Account, faction_ua: Faction
):
    """One reset resolves clear-leader, forfeit, tie and incomplete duels together."""
    leader_duel, leader_ch, leader_op = await _make_duel(
        db_session, era, label="lead", status=DuelStatus.settled,
        challenger_votes=5, opponent_votes=2,
    )
    forfeit_duel, forfeit_ch, forfeit_op = await _make_duel(
        db_session, era, label="forf", status=DuelStatus.settled,
        challenger_votes=5, opponent_votes=1, forfeiter="challenger",
    )
    tie_duel, tie_ch, tie_op = await _make_duel(
        db_session, era, label="tie", status=DuelStatus.settled,
        challenger_votes=3, opponent_votes=3,
    )
    incomplete_duel, incomplete_ch, incomplete_op = await _make_duel(
        db_session, era, label="inc", status=DuelStatus.active,
        challenger_votes=None, opponent_votes=None,
    )

    await _close_the_era(db_session, account)

    # ── clear leader: more vote points wins, both sides snapshotted ─────────
    await db_session.refresh(leader_duel)
    assert leader_duel.status == DuelStatus.resolved
    assert leader_duel.winner_character_id == leader_ch.id
    assert leader_duel.challenger_final_points == 5
    assert leader_duel.opponent_final_points == 2
    assert leader_duel.resolved_at is not None

    # ── forfeit: the non-forfeiter wins despite trailing on votes ──────────
    await db_session.refresh(forfeit_duel)
    assert forfeit_duel.status == DuelStatus.resolved
    assert forfeit_duel.winner_character_id == forfeit_op.id
    # The snapshot still records what the tally actually said.
    assert forfeit_duel.challenger_final_points == 5
    assert forfeit_duel.opponent_final_points == 1

    # ── tie: null winner, equal snapshots ──────────────────────────────────
    await db_session.refresh(tie_duel)
    assert tie_duel.status == DuelStatus.resolved
    assert tie_duel.winner_character_id is None
    assert tie_duel.challenger_final_points == 3
    assert tie_duel.opponent_final_points == 3

    # ── incomplete `active` duel: no-contest, never became votable ──────────
    await db_session.refresh(incomplete_duel)
    assert incomplete_duel.status == DuelStatus.resolved
    assert incomplete_duel.winner_character_id is None
    assert incomplete_duel.challenger_final_points == 0
    assert incomplete_duel.opponent_final_points == 0


@pytest.mark.asyncio
async def test_era_reset_wins_for_the_opponent_side_too(
    db_session: AsyncSession, era: Era, account: Account, faction_ua: Faction
):
    """The winner is not biased to the challenger — the opponent can win outright."""
    duel, challenger, opponent = await _make_duel(
        db_session, era, label="opwin", status=DuelStatus.settled,
        challenger_votes=1, opponent_votes=4,
    )

    await _close_the_era(db_session, account)

    await db_session.refresh(duel)
    assert duel.winner_character_id == opponent.id
    assert duel.challenger_final_points == 1
    assert duel.opponent_final_points == 4


@pytest.mark.asyncio
async def test_era_reset_leaves_pending_and_declined_duels_untouched(
    db_session: AsyncSession, era: Era, account: Account, faction_ua: Faction
):
    """A duel that was never accepted was never a contest — it is not resolved."""
    pending_duel, _, _ = await _make_duel(
        db_session, era, label="pend", status=DuelStatus.pending,
        challenger_votes=None, opponent_votes=None,
    )
    declined_duel, _, _ = await _make_duel(
        db_session, era, label="decl", status=DuelStatus.declined,
        challenger_votes=None, opponent_votes=None,
    )

    await _close_the_era(db_session, account)

    await db_session.refresh(pending_duel)
    await db_session.refresh(declined_duel)
    assert pending_duel.status == DuelStatus.pending
    assert pending_duel.resolved_at is None
    assert declined_duel.status == DuelStatus.declined
    assert declined_duel.resolved_at is None


@pytest.mark.asyncio
async def test_resolution_is_sticky_across_a_second_era_close(
    db_session: AsyncSession, era: Era, account: Account, faction_ua: Faction
):
    """A resolved duel is terminal: later votes and later resets never move it."""
    duel, challenger, opponent = await _make_duel(
        db_session, era, label="stick", status=DuelStatus.settled,
        challenger_votes=5, opponent_votes=2,
    )

    await _close_the_era(db_session, account)
    await db_session.refresh(duel)
    frozen_at = duel.resolved_at

    # Votes keep arriving (they are never reset) — the frozen outcome must hold.
    late_voter = await _make_character(
        db_session, era, username="late", email="late@x.com"
    )
    opponent_praxis = await db_session.get(Praxis, duel.opponent_praxis_id)
    await _cast_vote(db_session, opponent_praxis, late_voter, 5)

    await _close_the_era(db_session, account)

    await db_session.refresh(duel)
    assert duel.winner_character_id == challenger.id
    assert duel.opponent_final_points == 2
    assert duel.resolved_at == frozen_at


@pytest.mark.asyncio
async def test_admin_era_reset_endpoint_resolves_duels(
    client, account: Account, auth_headers: dict, db_session: AsyncSession,
    era: Era, faction_ua: Faction,
):
    """The freeze runs through the real admin endpoint, not just the service."""
    from tests.integration.test_admin import _make_admin

    await _make_admin(account, db_session)
    duel, challenger, _ = await _make_duel(
        db_session, era, label="api", status=DuelStatus.settled,
        challenger_votes=4, opponent_votes=1,
    )
    await db_session.commit()

    response = await client.put("/admin/era/reset", headers=auth_headers)
    assert response.status_code == 200

    result = await db_session.execute(select(Duel).where(Duel.id == duel.id))
    resolved = result.scalar_one()
    await db_session.refresh(resolved)
    assert resolved.status == DuelStatus.resolved
    assert resolved.winner_character_id == challenger.id

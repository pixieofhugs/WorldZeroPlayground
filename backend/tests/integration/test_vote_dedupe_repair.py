"""The two derived numbers migration ``0011`` left stale (#1531).

Follow-up to the 2026-08-02 production incident. ``0011_vote_unique_per_account``
deleted the surplus rows of 13 duplicated ``(praxis, account)`` vote pairs — the
owner ruled the most recent vote survives — and deliberately repaired neither of
the two numbers that fall out of a vote row:

1. ``votes_spent_this_era``, a STORED counter, so the caster of a deleted vote
   stays charged for it forever (``services.vote.cast_or_update_vote``).
2. the recipient's ``score``, which includes ``total_stars``
   (``services.scoring.compute_praxis_score``) — and ``all_time_score``, which is
   lifetime-cumulative and moved by delta rather than recomputed.

These tests pin the repair for both, and — just as importantly — pin the PREMISE
each repair rests on, because a recompute that is only sometimes right invents or
destroys vote budget silently.
"""
from dataclasses import replace
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from httpx import AsyncClient
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.roles import AccountRole, Role
from models.task import Task
from models.vote import Vote
from services.character_stats import recompute_votes_spent_this_era


async def _grant_admin(account: Account, session: AsyncSession) -> None:
    """Give ``account`` the admin role so it can reach ``/admin/*``."""
    role = Role(name="admin", description="Administrator")
    session.add(role)
    await session.flush()
    session.add(
        AccountRole(account_id=account.id, role_id=role.id, granted_by=account.id)
    )
    await session.commit()


async def _load_stats(
    session: AsyncSession, character_id: int, era_id: int
) -> CharacterStats:
    """Fresh (not identity-mapped-stale) stats row for a (character, era).

    ``populate_existing`` rather than ``expire_all``: the fixtures share this
    session, and expiring them makes a later ``character.id`` attempt IO from a
    sync context.
    """
    result = await session.execute(
        select(CharacterStats)
        .where(
            CharacterStats.character_id == character_id,
            CharacterStats.era_id == era_id,
        )
        .execution_options(populate_existing=True)
    )
    return result.scalar_one()


async def _drop_vote_like_the_migration(session: AsyncSession, vote_id: int) -> None:
    """Delete a vote row behind the service's back, as migration 0011 did.

    Bulk DELETE, no recalculation and no counter adjustment — that is exactly the
    state production was left in.
    """
    await session.execute(delete(Vote).where(Vote.id == vote_id))
    await session.commit()


# ---------------------------------------------------------------------------
# 1. votes_spent_this_era — the premise, then the repair
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_a_deleted_vote_leaves_its_caster_charged(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    praxis_solo: Praxis,
    era: Era,
    auth_headers2: dict,
):
    """The defect itself: the counter does not follow the row out of the table.

    Without this the repair below has nothing to prove — it is what makes every
    caster of one of the 13 deleted votes permanently down a vote.
    """
    resp = await client.post(
        f"/praxes/{praxis_solo.id}/vote", json={"value": 5}, headers=auth_headers2
    )
    assert resp.status_code == 200, resp.text
    vote_id = resp.json()["id"]

    assert (await _load_stats(db_session, character2.id, era.id)).votes_spent_this_era == 1

    await _drop_vote_like_the_migration(db_session, vote_id)

    stats = await _load_stats(db_session, character2.id, era.id)
    assert stats.votes_spent_this_era == 1  # still charged for a row that is gone


@pytest.mark.asyncio
async def test_recompute_refunds_a_deleted_vote(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    praxis_solo: Praxis,
    era: Era,
    auth_headers2: dict,
):
    """The repair: rebuilding from the vote table hands the vote back."""
    resp = await client.post(
        f"/praxes/{praxis_solo.id}/vote", json={"value": 5}, headers=auth_headers2
    )
    assert resp.status_code == 200, resp.text
    await _drop_vote_like_the_migration(db_session, resp.json()["id"])

    repairs = await recompute_votes_spent_this_era(db_session, era_row=era)
    await db_session.commit()

    assert [(r.character_id, r.before, r.after) for r in repairs] == [
        (character2.id, 1, 0)
    ]
    assert (await _load_stats(db_session, character2.id, era.id)).votes_spent_this_era == 0


@pytest.mark.asyncio
async def test_recompute_invents_nothing_when_no_vote_was_deleted(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    praxis_solo: Praxis,
    era: Era,
    auth_headers: dict,
    auth_headers2: dict,
):
    """The identity: counter == surviving vote rows in the era window.

    Two genuine casts by one character stay two. If this ever fails, the
    recompute is handing out budget nobody earned back — and the endpoint must
    not be run against production until it is understood.
    """
    second_praxis = Praxis(
        task_id=active_task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        status=PraxisStatus.submitted,
        title="Second",
        body_text="proof",
    )
    db_session.add(second_praxis)
    await db_session.flush()
    db_session.add(
        PraxisMember(praxis_id=second_praxis.id, character_id=character.id)
    )
    await db_session.commit()

    for praxis_id in (praxis_solo.id, second_praxis.id):
        cast = await client.post(
            f"/praxes/{praxis_id}/vote", json={"value": 3}, headers=auth_headers2
        )
        assert cast.status_code == 200, cast.text

    assert (await _load_stats(db_session, character2.id, era.id)).votes_spent_this_era == 2

    assert await recompute_votes_spent_this_era(db_session, era_row=era) == []
    assert (await _load_stats(db_session, character2.id, era.id)).votes_spent_this_era == 2


@pytest.mark.asyncio
async def test_a_re_rate_is_free_and_the_recompute_agrees(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    praxis_solo: Praxis,
    era: Era,
    auth_headers2: dict,
):
    """The other half of the identity: a re-rate updates one row and charges nothing.

    ``cast_or_update_vote`` increments only on the new-cast branch, so one row
    and one charge is the correct pair however many times the value moves.
    """
    for value in (2, 4, 1):
        cast = await client.post(
            f"/praxes/{praxis_solo.id}/vote", json={"value": value}, headers=auth_headers2
        )
        assert cast.status_code == 200, cast.text

    rows = (
        await db_session.execute(select(Vote).where(Vote.praxis_id == praxis_solo.id))
    ).scalars().all()
    assert len(rows) == 1

    assert (await _load_stats(db_session, character2.id, era.id)).votes_spent_this_era == 1
    assert await recompute_votes_spent_this_era(db_session, era_row=era) == []


@pytest.mark.asyncio
async def test_dry_run_reports_the_refund_without_writing_it(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    praxis_solo: Praxis,
    era: Era,
    auth_headers2: dict,
):
    """``dry_run`` is how an operator spots an admin budget grant before reverting it.

    ``set_character_stats`` writes this same counter to translate a desired
    ``votes_available``, and nothing on the row says it was hand-set — so the
    diff has to be readable before it is applied.
    """
    resp = await client.post(
        f"/praxes/{praxis_solo.id}/vote", json={"value": 5}, headers=auth_headers2
    )
    assert resp.status_code == 200, resp.text
    await _drop_vote_like_the_migration(db_session, resp.json()["id"])

    repairs = await recompute_votes_spent_this_era(db_session, era_row=era, dry_run=True)
    await db_session.commit()

    assert [(r.character_id, r.before, r.after) for r in repairs] == [
        (character2.id, 1, 0)
    ]
    assert (await _load_stats(db_session, character2.id, era.id)).votes_spent_this_era == 1


@pytest.mark.asyncio
async def test_the_window_is_the_cast_time_not_the_seal_time(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    character2: Character,
    praxis_solo: Praxis,
    era: Era,
):
    """A vote counts against the era it was CAST in, whatever era its praxis is from.

    ``cast_or_update_vote`` charges the voter's *current* era even when the
    praxis is a closed era's (#1345), so the recompute has to bound
    ``Vote.created_at`` — bounding the praxis seal instead would refund every
    vote anyone ever cast on old work.

    Timestamps are set explicitly because ``func.now()`` is the transaction
    timestamp, and the whole test runs inside one transaction.
    """
    era_one_start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    era_two_start = datetime(2026, 6, 1, tzinfo=timezone.utc)
    era.started_at = era_one_start
    era_two = Era(
        name=CURRENT_ERA.name,
        config_key=CURRENT_ERA.config_key,
        started_by=account.id,
        started_at=era_two_start,
    )
    db_session.add(era_two)
    await db_session.flush()

    # One vote in each era, both on the SAME praxis-era (praxis_solo is era one's).
    db_session.add_all(
        [
            Vote(
                praxis_id=praxis_solo.id,
                voter_character_id=character2.id,
                voter_account_id=character2.account_id,
                value=4,
                created_at=era_one_start + timedelta(days=1),
            ),
            Vote(
                praxis_id=praxis_solo.id,
                voter_character_id=character2.id,
                voter_account_id=account.id,  # a different account: one row per pair
                value=2,
                created_at=era_two_start + timedelta(days=1),
            ),
        ]
    )
    # Both era rows start deliberately wrong, so a correct answer is visible.
    era_one_stats = await _load_stats(db_session, character2.id, era.id)
    era_one_stats.votes_spent_this_era = 9
    db_session.add(
        CharacterStats(
            character_id=character2.id,
            era_id=era_two.id,
            votes_spent_this_era=9,
        )
    )
    await db_session.commit()

    await recompute_votes_spent_this_era(db_session, era_row=era)
    await recompute_votes_spent_this_era(db_session, era_row=era_two)
    await db_session.commit()

    # Era one is now CLOSED, so its window has an upper bound: the later vote is
    # excluded. Era two is live, so the earlier vote is excluded by its lower one.
    assert (await _load_stats(db_session, character2.id, era.id)).votes_spent_this_era == 1
    assert (
        await _load_stats(db_session, character2.id, era_two.id)
    ).votes_spent_this_era == 1


@pytest.mark.asyncio
async def test_recompute_refuses_an_era_that_carries_spend_forward(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
):
    """``reset_vote_budget=False`` breaks the identity, so the repair refuses to run.

    ``apply_era_reset`` seeds such an era's row with the PREVIOUS era's count, so
    the counter is no longer the number of votes cast inside this era's window
    and no recompute can reproduce it. Refusing beats silently zeroing everyone's
    carried-over spend. Era 1 sets ``reset_vote_budget=True``, so the live era is
    unaffected.
    """
    era_two = Era(
        name=CURRENT_ERA.name,
        config_key=CURRENT_ERA.config_key,
        started_by=account.id,
    )
    db_session.add(era_two)
    await db_session.commit()

    carrying_era = replace(CURRENT_ERA, reset_vote_budget=False)
    with pytest.raises(HTTPException) as raised:
        await recompute_votes_spent_this_era(db_session, carrying_era, era_row=era_two)
    assert raised.value.status_code == 409

    # An era with no predecessor cannot have carried anything in, so it is fine
    # even under the same flag.
    assert (
        await recompute_votes_spent_this_era(db_session, carrying_era, era_row=era) == []
    )


@pytest.mark.asyncio
async def test_admin_endpoint_applies_the_refund(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    character2: Character,
    praxis_solo: Praxis,
    era: Era,
    auth_headers: dict,
    auth_headers2: dict,
):
    """What an operator actually runs: dry run, read the diff, then apply."""
    resp = await client.post(
        f"/praxes/{praxis_solo.id}/vote", json={"value": 5}, headers=auth_headers2
    )
    assert resp.status_code == 200, resp.text
    await _drop_vote_like_the_migration(db_session, resp.json()["id"])
    await _grant_admin(account, db_session)

    preview = await client.post(
        "/admin/characters/backfill-vote-budget?dry_run=true", headers=auth_headers
    )
    assert preview.status_code == 200, preview.text
    assert preview.json()["dry_run"] is True
    assert preview.json()["changes"] == [
        {"character_id": character2.id, "before": 1, "after": 0}
    ]
    assert (await _load_stats(db_session, character2.id, era.id)).votes_spent_this_era == 1

    applied = await client.post(
        "/admin/characters/backfill-vote-budget", headers=auth_headers
    )
    assert applied.status_code == 200, applied.text
    assert applied.json()["changed"] == 1
    assert (await _load_stats(db_session, character2.id, era.id)).votes_spent_this_era == 0

    # Idempotent: a second run has nothing left to say.
    again = await client.post(
        "/admin/characters/backfill-vote-budget", headers=auth_headers
    )
    assert again.status_code == 200
    assert again.json()["changed"] == 0


# ---------------------------------------------------------------------------
# 2. Score and all_time_score — does the existing backfill repair both?
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_backfill_stats_repairs_score_and_all_time_score(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    character2: Character,
    praxis_solo: Praxis,
    era: Era,
    auth_headers: dict,
    auth_headers2: dict,
):
    """``/admin/characters/backfill-stats`` repairs BOTH — via the delta, not a recompute.

    ``all_time_score`` is lifetime-cumulative and is never re-derived
    (``_credit_all_time_score`` explains why: an era may declare a fresh
    lifetime, and re-deriving would undo that baseline). But
    ``recalculate_character_stats`` credits it the same ``score_delta`` it just
    computed — so when a removed star drops the era score by five, lifetime falls
    by five too. This is the test that answers #1531's "check whether it also
    repairs ``all_time_score``": it does, and no extra endpoint is needed.
    """
    resp = await client.post(
        f"/praxes/{praxis_solo.id}/vote", json={"value": 5}, headers=auth_headers2
    )
    assert resp.status_code == 200, resp.text

    author_before = await _load_stats(db_session, character.id, era.id)
    score_before = author_before.score
    all_time_before = author_before.all_time_score
    assert score_before > 5  # base task points plus the five stars

    await _drop_vote_like_the_migration(db_session, resp.json()["id"])
    await _grant_admin(account, db_session)

    # Stale until something recomputes: the migration touched no stats row.
    stale = await _load_stats(db_session, character.id, era.id)
    assert stale.score == score_before
    assert stale.all_time_score == all_time_before

    backfill = await client.post(
        "/admin/characters/backfill-stats", headers=auth_headers
    )
    assert backfill.status_code == 200, backfill.text

    repaired = await _load_stats(db_session, character.id, era.id)
    assert score_before - repaired.score == 5
    assert all_time_before - repaired.all_time_score == 5


@pytest.mark.asyncio
async def test_backfill_stats_repair_is_idempotent(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    character2: Character,
    praxis_solo: Praxis,
    era: Era,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Running the score backfill twice must not charge the delta twice.

    The delta is ``total_score - stats.score``, so the second pass computes zero
    and ``all_time_score`` stands still. Worth pinning: a delta applied to a
    lifetime total is exactly the shape of bug that double-counts on a re-run,
    and an operator repairing production will re-run it.
    """
    resp = await client.post(
        f"/praxes/{praxis_solo.id}/vote", json={"value": 5}, headers=auth_headers2
    )
    assert resp.status_code == 200, resp.text
    await _drop_vote_like_the_migration(db_session, resp.json()["id"])
    await _grant_admin(account, db_session)

    first = await client.post("/admin/characters/backfill-stats", headers=auth_headers)
    assert first.status_code == 200, first.text
    after_first = await _load_stats(db_session, character.id, era.id)
    settled_score = after_first.score
    settled_all_time = after_first.all_time_score

    second = await client.post("/admin/characters/backfill-stats", headers=auth_headers)
    assert second.status_code == 200, second.text
    after_second = await _load_stats(db_session, character.id, era.id)
    assert after_second.score == settled_score
    assert after_second.all_time_score == settled_all_time

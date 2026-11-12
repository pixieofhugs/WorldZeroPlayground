"""Repairing the two numbers migration ``0011`` left stale by deleting votes (#1531).

1. ``votes_spent_this_era``, a stored counter. 2. The recipient's ``score`` and
``all_time_score`` (moved by delta). Each repair's premise is pinned too: a
recompute that is only sometimes right silently invents or destroys budget.
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
from models.task import Task
from models.vote import Vote
from scripts.backfill_character_stats import backfill_character_stats
from services.character_stats import recompute_votes_spent_this_era


async def _load_stats(
    session: AsyncSession, character_id: int, era_id: int
) -> CharacterStats:
    """``populate_existing``, not ``expire_all``: expiring the shared fixtures makes
    a later ``character.id`` attempt IO from a sync context."""
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
    """Bulk DELETE with no recalculation, as migration 0011 did."""
    await session.execute(delete(Vote).where(Vote.id == vote_id))
    await session.commit()


# 1. votes_spent_this_era


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
    """The premise the repair below rests on."""
    resp = await client.post(
        f"/praxes/{praxis_solo.id}/vote", json={"value": 5}, headers=auth_headers2
    )
    assert resp.status_code == 200, resp.text
    vote_id = resp.json()["id"]

    assert (await _load_stats(db_session, character2.id, era.id)).votes_spent_this_era == 1

    await _drop_vote_like_the_migration(db_session, vote_id)

    stats = await _load_stats(db_session, character2.id, era.id)
    assert stats.votes_spent_this_era == 1


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
    """Identity: counter == surviving votes in the era window. If this fails, do
    not run the recompute against production."""
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
    """``set_character_stats`` hand-sets this counter unmarked, so an operator needs
    the diff before applying it."""
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
    """Votes charge the voter's current era (#1345), so bound ``Vote.created_at``.

    Explicit timestamps: ``func.now()`` is fixed for the test's one transaction.
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

    # One vote per era, both on era one's praxis.
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
                voter_account_id=account.id,  # one row per (praxis, account)
                value=2,
                created_at=era_two_start + timedelta(days=1),
            ),
        ]
    )
    # Deliberately wrong start values.
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

    # Closed era one has an upper bound; live era two a lower one.
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
    """Carried-over spend can't be recomputed; refusing beats zeroing it."""
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

    # No predecessor, nothing carried in.
    assert (
        await recompute_votes_spent_this_era(db_session, carrying_era, era_row=era) == []
    )


# 2. Score and all_time_score


@pytest.mark.asyncio
async def test_backfill_stats_repairs_score_and_all_time_score(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    praxis_solo: Praxis,
    era: Era,
    auth_headers2: dict,
):
    """Both repaired: ``all_time_score`` gets the same ``score_delta``
    (never re-derived; see ``_credit_all_time_score``)."""
    resp = await client.post(
        f"/praxes/{praxis_solo.id}/vote", json={"value": 5}, headers=auth_headers2
    )
    assert resp.status_code == 200, resp.text

    author_before = await _load_stats(db_session, character.id, era.id)
    score_before = author_before.score
    all_time_before = author_before.all_time_score
    assert score_before > 5  # base task points plus the five stars

    await _drop_vote_like_the_migration(db_session, resp.json()["id"])

    stale = await _load_stats(db_session, character.id, era.id)
    assert stale.score == score_before
    assert stale.all_time_score == all_time_before

    assert await backfill_character_stats(db_session) == 0

    repaired = await _load_stats(db_session, character.id, era.id)
    assert score_before - repaired.score == 5
    assert all_time_before - repaired.all_time_score == 5


@pytest.mark.asyncio
async def test_backfill_stats_repair_is_idempotent(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    praxis_solo: Praxis,
    era: Era,
    auth_headers2: dict,
):
    """A delta on a lifetime total double-counts on re-run if wrong."""
    resp = await client.post(
        f"/praxes/{praxis_solo.id}/vote", json={"value": 5}, headers=auth_headers2
    )
    assert resp.status_code == 200, resp.text
    await _drop_vote_like_the_migration(db_session, resp.json()["id"])

    assert await backfill_character_stats(db_session) == 0
    after_first = await _load_stats(db_session, character.id, era.id)
    settled_score = after_first.score
    settled_all_time = after_first.all_time_score

    assert await backfill_character_stats(db_session) == 0
    after_second = await _load_stats(db_session, character.id, era.id)
    assert after_second.score == settled_score
    assert after_second.all_time_score == settled_all_time

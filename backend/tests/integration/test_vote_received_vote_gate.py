"""Voting needs a vote received from another account (#3475), on top of the level."""
import pytest
from fastapi import HTTPException
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode
from models.account import Account
from models.era import Era
from models.praxis import ModerationStatus
from models.roles import AccountRole, Role
from services.auth import create_jwt
from services.vote import cast_vote_on_praxis, void_account_vote_on_join
from tests.integration.factories import (
    cast_vote,
    make_admin,
    make_character,
    make_solo_praxis,
    make_task,
)

pytestmark = [
    pytest.mark.usefixtures("some_faction"),
    pytest.mark.received_vote_rule,
]


async def _target(session: AsyncSession, era: Era, name: str = "rv_author"):
    author = await make_character(session, era, username=name, level=5)
    task = await make_task(session, author, title=f"{name} task")
    praxis = await make_solo_praxis(session, task, author)
    await session.refresh(praxis)
    return praxis


async def _voter_with_praxis(session: AsyncSession, era: Era, username: str):
    voter = await make_character(session, era, username=username, level=1)
    task = await make_task(session, voter, title=f"{username} task")
    return voter, await make_solo_praxis(session, task, voter)


async def _assert_locked(voter, praxis, session) -> None:
    with pytest.raises(HTTPException) as refusal:
        await cast_vote_on_praxis(voter, praxis.id, 4, session)
    assert refusal.value.status_code == 403
    assert refusal.value.detail["code"] == ErrorCode.vote_needs_received_vote.value


@pytest.mark.asyncio
async def test_unrated_account_is_refused_then_allowed_once_rated(
    client: AsyncClient, db_session: AsyncSession, era: Era
):
    target = await _target(db_session, era)
    voter, voter_praxis = await _voter_with_praxis(db_session, era, "rv_voter")
    rater = await make_character(db_session, era, username="rv_rater", level=1)
    await db_session.commit()
    headers = {"Authorization": f"Bearer {create_jwt(voter.account_id)}"}

    await _assert_locked(voter, target, db_session)
    me = (await client.get("/auth/me", headers=headers)).json()
    assert (me["can_vote"], me["vote_lock_reason"]) == (False, "no_received_vote")

    await cast_vote(db_session, voter_praxis, rater, 3)
    await db_session.commit()
    assert (await cast_vote_on_praxis(voter, target.id, 4, db_session)).vote.value == 4
    me = (await client.get("/auth/me", headers=headers)).json()
    assert (me["can_vote"], me["vote_lock_reason"]) == (True, None)


@pytest.mark.asyncio
async def test_a_vote_received_by_a_sibling_character_counts(
    db_session: AsyncSession, era: Era
):
    target = await _target(db_session, era)
    main = await make_character(db_session, era, username="rv_main", level=1)
    sibling = await make_character(
        db_session,
        era,
        username="rv_sibling",
        account=await db_session.get(Account, main.account_id),
        level=1,
    )
    sibling_task = await make_task(db_session, sibling, title="sibling task")
    sibling_praxis = await make_solo_praxis(db_session, sibling_task, sibling)
    rater = await make_character(db_session, era, username="rv_rater2", level=1)
    await cast_vote(db_session, sibling_praxis, rater, 5)

    assert (await cast_vote_on_praxis(main, target.id, 4, db_session)).vote.value == 4


@pytest.mark.asyncio
async def test_voided_or_hidden_votes_do_not_count(db_session: AsyncSession, era: Era):
    voter, voter_praxis = await _voter_with_praxis(db_session, era, "rv_live")
    rater = await make_character(db_session, era, username="rv_rater3", level=1)
    await cast_vote(db_session, voter_praxis, rater, 4)
    other = await _target(db_session, era, "rv_author2")

    voter_praxis.moderation_status = ModerationStatus.hidden
    await db_session.flush()
    await _assert_locked(voter, other, db_session)

    voter_praxis.moderation_status = ModerationStatus.visible
    await db_session.flush()
    assert (await cast_vote_on_praxis(voter, other.id, 4, db_session)).vote.value == 4

    await db_session.refresh(voter_praxis)
    await void_account_vote_on_join(voter_praxis, rater, db_session)
    third = await _target(db_session, era, "rv_author3")
    await _assert_locked(voter, third, db_session)


@pytest.mark.asyncio
async def test_admin_skips_this_rule_but_not_the_level(
    db_session: AsyncSession, era: Era
):
    target = await _target(db_session, era)
    admin = await make_character(db_session, era, username="rv_admin", level=1)
    admin_account = await db_session.get(Account, admin.account_id)
    await make_admin(db_session, admin_account, commit=False)
    assert (await cast_vote_on_praxis(admin, target.id, 4, db_session)).vote.value == 4

    low = await make_character(db_session, era, username="rv_admin_low", level=0)
    # make_admin creates the role row; a second admin only needs the link.
    role = await db_session.scalar(select(Role).where(Role.name == "admin"))
    db_session.add(
        AccountRole(
            account_id=low.account_id, role_id=role.id, granted_by=low.account_id
        )
    )
    await db_session.flush()
    with pytest.raises(HTTPException) as refusal:
        await cast_vote_on_praxis(low, target.id, 4, db_session)
    assert refusal.value.detail["code"] == ErrorCode.vote_level_too_low.value

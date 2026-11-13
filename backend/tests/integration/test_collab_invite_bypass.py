"""The collab door's deliberate eligibility bypasses (#1511).

A character who could never claim a task (wrong faction, too low a level) may be
invited into a collab on it and submit — an intentional Easter egg. Pins both the
bypasses and the gates that still close (``collab_invite_bypasses_*``).
Duel bypass: ADR-0051.
"""
from dataclasses import replace

import pytest
from fastapi import HTTPException
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode
from faction_slugs import real_faction_slugs
from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction
from models.praxis import PraxisType
from models.task import Task, TaskStatus
from services.auth import create_jwt
from services.praxis import create_praxis, invite_to_praxis, respond_to_invite
from tests.integration.factories import DEFAULT_FACTION_SLUG

TASK_LEVEL_REQUIRED = 6
TASK_FACTION_SLUG = DEFAULT_FACTION_SLUG
INVITEE_FACTION_SLUG = next(
    slug
    for slug in real_faction_slugs(CURRENT_ERA)
    if slug != TASK_FACTION_SLUG
)
INVITEE_LEVEL = 1


async def _make_character(
    session: AsyncSession,
    era: Era,
    email: str,
    username: str,
    faction_slug: str,
    level: int,
) -> Character:
    account = Account(email=email)
    session.add(account)
    await session.flush()
    character = Character(
        account_id=account.id,
        username=username,
        display_name=username,
        faction_slug=faction_slug,
    )
    session.add(character)
    await session.flush()
    session.add(
        CharacterStats(
            character_id=character.id,
            era_id=era.id,
            score=0,
            all_time_score=0,
            level=level,
            votes_spent_this_era=0,
        )
    )
    await session.commit()
    await session.refresh(character)
    return character


def _headers(character: Character) -> dict:
    return {"Authorization": f"Bearer {create_jwt(character.account_id)}"}


@pytest.fixture
def inviter_headers(inviter: Character) -> dict:
    return _headers(inviter)


@pytest.fixture
def invitee_headers(invitee: Character) -> dict:
    return _headers(invitee)


@pytest.fixture
def second_inviter_headers(second_inviter: Character) -> dict:
    return _headers(second_inviter)


@pytest.fixture
async def inviter(
    db_session: AsyncSession, era: Era, some_faction: Faction
) -> Character:
    return await _make_character(
        db_session, era, "inviter@example.com", "inviter", TASK_FACTION_SLUG, 6
    )


@pytest.fixture
async def second_inviter(
    db_session: AsyncSession, era: Era, some_faction: Faction
) -> Character:
    """One praxis per task per character, so a second collab needs a second creator."""
    return await _make_character(
        db_session, era, "inviter2@example.com", "inviter2", TASK_FACTION_SLUG, 6
    )


@pytest.fixture
async def invitee(
    db_session: AsyncSession, era: Era, some_faction: Faction
) -> Character:
    return await _make_character(
        db_session,
        era,
        "invitee@example.com",
        "invitee",
        INVITEE_FACTION_SLUG,
        INVITEE_LEVEL,
    )


@pytest.fixture
async def high_level_task(db_session: AsyncSession, inviter: Character) -> Task:
    task = Task(
        title="Summit Task",
        description="Well above a level-1 character",
        point_value=100,
        level_required=TASK_LEVEL_REQUIRED,
        status=TaskStatus.active,
        created_by=inviter.id,
        primary_faction_slug=TASK_FACTION_SLUG,
    )
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)
    return task


async def _create_collab(client: AsyncClient, task: Task, headers: dict) -> int:
    resp = await client.post(
        "/praxes",
        json={"task_id": task.id, "type": "collab", "title": "Cross-faction collab"},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_wrong_faction_low_level_character_can_be_invited_and_submit(
    client: AsyncClient,
    inviter: Character,
    invitee: Character,
    high_level_task: Task,
    inviter_headers: dict,
    invitee_headers: dict,
):
    """Refused at sign-up first, so this tests a bypass rather than an absent gate."""
    signup_resp = await client.post(
        "/praxes",
        json={"task_id": high_level_task.id, "type": "solo"},
        headers=invitee_headers,
    )
    assert signup_resp.status_code == 403, signup_resp.text
    signup_detail = signup_resp.json()["detail"]
    assert signup_detail["code"] == ErrorCode.task_level_too_low.value
    assert str(TASK_LEVEL_REQUIRED) in signup_detail["message"]

    praxis_id = await _create_collab(client, high_level_task, inviter_headers)
    invite_resp = await client.post(
        f"/praxes/{praxis_id}/invite",
        json={"invitee_id": invitee.id},
        headers=inviter_headers,
    )
    assert invite_resp.status_code == 200, invite_resp.text
    invite_id = invite_resp.json()["id"]

    accept_resp = await client.post(
        f"/praxes/{praxis_id}/invite/{invite_id}/respond",
        json={"accept": True},
        headers=invitee_headers,
    )
    assert accept_resp.status_code == 200, accept_resp.text
    # The route answers an ack (#1383); membership must be read off the praxis.
    assert accept_resp.json() == {"praxis_id": praxis_id, "accepted": True}

    detail_resp = await client.get(f"/praxes/{praxis_id}", headers=inviter_headers)
    assert detail_resp.status_code == 200, detail_resp.text
    assert invitee.id in [m["character_id"] for m in detail_resp.json()["members"]]

    submit_resp = await client.post(
        f"/praxes/{praxis_id}/submit", headers=invitee_headers
    )
    assert submit_resp.status_code == 200, submit_resp.text
    submitted = {
        member["character_id"]: member["has_submitted"]
        for member in submit_resp.json()["members"]
    }
    assert submitted[invitee.id] is True


@pytest.mark.asyncio
async def test_full_task_bank_still_refuses_on_accept(
    client: AsyncClient,
    db_session: AsyncSession,
    inviter: Character,
    invitee: Character,
    high_level_task: Task,
    active_task: Task,
    inviter_headers: dict,
):
    """Era 1 does not bypass the bank cap; it is charged on accept.

    Service-level so the cap can be 1 instead of 20 fixture rows.
    """
    tight_bank = replace(CURRENT_ERA, max_task_signups=1)

    await create_praxis(
        task_id=active_task.id,
        praxis_type=PraxisType.solo,
        character_id=invitee.id,
        session=db_session,
        era=tight_bank,
    )

    praxis_id = await _create_collab(client, high_level_task, inviter_headers)
    invite = await invite_to_praxis(
        praxis_id=praxis_id,
        invitee_id=invitee.id,
        inviter_id=inviter.id,
        session=db_session,
        era=tight_bank,
    )

    with pytest.raises(HTTPException) as excinfo:
        await respond_to_invite(
            invite_id=invite.id,
            character_id=invitee.id,
            accept=True,
            session=db_session,
            era=tight_bank,
        )
    assert excinfo.value.status_code == 409
    # `FeedCardCollabInvite` keys its drop-to-accept modal off the code (#1598);
    # the prose is the fallback for clients that don't know it.
    assert excinfo.value.detail["code"] == ErrorCode.task_bank_full.value
    assert "bank" in excinfo.value.detail["message"].lower()


@pytest.mark.asyncio
async def test_existing_active_membership_still_refuses_the_invite(
    client: AsyncClient,
    db_session: AsyncSession,
    inviter: Character,
    second_inviter: Character,
    invitee: Character,
    high_level_task: Task,
    inviter_headers: dict,
    second_inviter_headers: dict,
    invitee_headers: dict,
):
    """One active membership per task per character survives the bypasses (409)."""
    first_praxis_id = await _create_collab(client, high_level_task, inviter_headers)
    first_invite = await client.post(
        f"/praxes/{first_praxis_id}/invite",
        json={"invitee_id": invitee.id},
        headers=inviter_headers,
    )
    assert first_invite.status_code == 200, first_invite.text
    accept = await client.post(
        f"/praxes/{first_praxis_id}/invite/{first_invite.json()['id']}/respond",
        json={"accept": True},
        headers=invitee_headers,
    )
    assert accept.status_code == 200, accept.text

    second_praxis_id = await _create_collab(
        client, high_level_task, second_inviter_headers
    )
    refused = await client.post(
        f"/praxes/{second_praxis_id}/invite",
        json={"invitee_id": invitee.id},
        headers=second_inviter_headers,
    )
    assert refused.status_code == 409, refused.text
    refused_detail = refused.json()["detail"]
    assert refused_detail["code"] == ErrorCode.invite_target_has_active_praxis.value
    assert "active praxis" in refused_detail["message"].lower()


@pytest.mark.asyncio
async def test_level_bypass_flag_off_refuses_the_invite(
    client: AsyncClient,
    db_session: AsyncSession,
    inviter: Character,
    invitee: Character,
    high_level_task: Task,
    inviter_headers: dict,
):
    """Proves the bypass is read from config, not hardcoded by omission."""
    praxis_id = await _create_collab(client, high_level_task, inviter_headers)
    strict = replace(CURRENT_ERA, collab_invite_bypasses_level=False)

    with pytest.raises(HTTPException) as excinfo:
        await invite_to_praxis(
            praxis_id=praxis_id,
            invitee_id=invitee.id,
            inviter_id=inviter.id,
            session=db_session,
            era=strict,
        )
    assert excinfo.value.status_code == 403
    assert excinfo.value.detail["code"] == ErrorCode.task_level_too_low.value
    assert str(TASK_LEVEL_REQUIRED) in excinfo.value.detail["message"]


@pytest.mark.asyncio
async def test_faction_bypass_flag_off_routes_through_faction_permits(
    client: AsyncClient,
    db_session: AsyncSession,
    inviter: Character,
    invitee: Character,
    high_level_task: Task,
    inviter_headers: dict,
):
    """Faction is deferred to ``faction_permits``, which permits everyone (ADR-0029).

    Pins where the answer comes from, not that faction never matters.
    """
    praxis_id = await _create_collab(client, high_level_task, inviter_headers)
    strict = replace(
        CURRENT_ERA,
        collab_invite_bypasses_faction=False,
        collab_invite_bypasses_level=True,
    )

    invite = await invite_to_praxis(
        praxis_id=praxis_id,
        invitee_id=invitee.id,
        inviter_id=inviter.id,
        session=db_session,
        era=strict,
    )
    assert invite.invitee_id == invitee.id

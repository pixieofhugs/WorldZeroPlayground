"""The collab door's deliberate eligibility bypasses (#1511).

Sign-up eligibility and the ability to submit a praxis are different questions.
A character who could never claim a task themselves — wrong faction, too low a
level — **may be invited into a collab on it and submit**. That is intentional
(owner ruling, 2026-08-01): an Easter egg encouraging collaboration across
factions and character levels.

Until this file the rule was enforced by *absence* — :func:`invite_to_praxis`
bypassed level and faction simply by never checking them, so no test failed if
someone "tidied up" by adding an eligibility check. These tests pin both halves:
the bypasses that are deliberate, and the gates that still close. The seam is
:func:`services.praxis.invite_to_praxis` plus the accept path
(:func:`services.praxis.respond_to_invite`); the era fields that drive them are
``collab_invite_bypasses_{level,faction,task_bank}``.

The duel door has its own bypass and its own home (ADR-0051) — not tested here.
"""
from dataclasses import replace

import pytest
from fastapi import HTTPException
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode
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

# The task the Easter egg is measured against: high enough that a level-1
# character is nowhere near it, and owned by a faction the invitee is not in.
TASK_LEVEL_REQUIRED = 6
TASK_FACTION_SLUG = "ua"
INVITEE_FACTION_SLUG = "ephemerists"
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
    """A character who *can* claim the level-6 task — the collab's creator."""
    return await _make_character(
        db_session, era, "inviter@example.com", "inviter", TASK_FACTION_SLUG, 6
    )


@pytest.fixture
async def second_inviter(
    db_session: AsyncSession, era: Era, some_faction: Faction
) -> Character:
    """A second eligible claimant — one character may only hold one praxis per task,
    so a second collab on the same task needs a different creator."""
    return await _make_character(
        db_session, era, "inviter2@example.com", "inviter2", TASK_FACTION_SLUG, 6
    )


@pytest.fixture
async def invitee(
    db_session: AsyncSession, era: Era, some_faction: Faction
) -> Character:
    """Level 1, wrong faction — could never sign up for the task themselves."""
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
    """The Easter egg, end to end — and the sign-up door it is measured against.

    The same character, the same task: refused at sign-up, welcomed through the
    invite. Asserting the refusal first is what makes this a test of a *bypass*
    rather than a test of an absent gate.
    """
    # The door that is closed: they cannot claim this task themselves.
    signup_resp = await client.post(
        "/praxes",
        json={"task_id": high_level_task.id, "type": "solo"},
        headers=invitee_headers,
    )
    assert signup_resp.status_code == 403, signup_resp.text
    signup_detail = signup_resp.json()["detail"]
    assert signup_detail["code"] == ErrorCode.task_level_too_low.value
    assert str(TASK_LEVEL_REQUIRED) in signup_detail["message"]

    # The door that is open: invited into someone else's collab on it.
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
    # The respond route answers an ack (#1383). The Easter egg's claim is that
    # the invitee BECAME A MEMBER of a task they could not claim, so that still
    # has to be read off the praxis rather than inferred from the 200.
    assert accept_resp.json() == {"praxis_id": praxis_id, "accepted": True}

    detail_resp = await client.get(f"/praxes/{praxis_id}", headers=inviter_headers)
    assert detail_resp.status_code == 200, detail_resp.text
    assert invitee.id in [m["character_id"] for m in detail_resp.json()["members"]]

    # ...and they may submit, which is the whole point of the carve-out.
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
    """Era 1 does **not** bypass the bank cap — the accept is where it is charged.

    Driven at the service so the cap can be a plausible 1 rather than 20 rows of
    fixture; ``collab_invite_bypasses_task_bank`` stays False, exactly as Era 1.
    """
    tight_bank = replace(CURRENT_ERA, max_task_signups=1)

    # The invitee spends their one bank slot on a task they *can* claim.
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
    # Coded as of #1598 — the last phase-1 raise, held back only until the
    # client stopped substring-matching this response's prose.
    # `FeedCardCollabInvite` opens its drop-to-accept modal off this code now,
    # so the code is the contract and the prose is the fallback, not the
    # reverse. The prose is still asserted because it is what a player reads
    # on any client that does not know the code.
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
    """One active membership per task per character survives the bypasses (409).

    The invitee gets onto the task the only way they can — a collab invite — and
    a second invite to a second praxis on the same task is refused.
    """
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
    """``collab_invite_bypasses_level=False`` actually closes the door.

    Without this the field would be decorative: the Era 1 tests above pass
    whether the bypass is read from config or hardcoded by omission.
    """
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
    """Enforcing the faction axis is deferred to ``faction_permits`` — which today
    permits everyone (ADR-0029), so the invite still succeeds.

    This is not a test of "faction never matters"; it pins *where* the answer
    comes from. The day a faction rule lands in that one function, this test
    changes with it — which is the point of the seam.
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

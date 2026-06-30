"""Integration tests for *second-character* behaviour.

Covers two readings of "a second character":

* **Different account** (``character2`` on ``account2``) — a separate player. This
  is the baseline that should already work today.
* **Same account, second life** (a second character created on ``account`` and
  switched to via ``POST /me/active-character``) — the multi-life surface added by
  the recent "multi-life plumbing" work (#270, #280, #283).

Each test asserts the *intended* behaviour (the second character acts as itself),
so any broken write path shows up as a failing test rather than a silent no-op.

Known gap under test: every write endpoint resolves the acting character through
``dependencies.get_current_character``, which returns the **oldest active
character by created_at** and ignores ``account.active_character_id``. The
same-account-second-life tests below therefore pin down whether switching the
carried life actually governs task signup, collaboration, and profile edits.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character, CharacterStatus
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction
from models.task import Task


async def _add_character(
    db_session: AsyncSession,
    account: Account,
    era: Era,
    *,
    username: str,
    level: int = 0,
    status: CharacterStatus = CharacterStatus.active,
    faction_slug: str = "ua",
) -> Character:
    """Seed an extra character (with current-era stats) directly on ``account``.

    Bypasses the ``POST /characters`` level gate so a same-account second life can
    be set up at an arbitrary level — the behaviour under test here is *acting as*
    the second life, not the creation gate (that lives in ``test_characters.py``).
    """
    ch = Character(
        account_id=account.id,
        username=username,
        display_name=username.title(),
        faction_slug=faction_slug,
        status=status,
    )
    db_session.add(ch)
    await db_session.flush()
    db_session.add(
        CharacterStats(
            character_id=ch.id,
            era_id=era.id,
            level=level,
            votes_spent_this_era=0,
        )
    )
    await db_session.commit()
    await db_session.refresh(ch)
    return ch


# ===========================================================================
# A. Different-account second character (baseline — expected to pass)
# ===========================================================================


@pytest.mark.asyncio
async def test_other_account_character_signs_up_for_task(
    client: AsyncClient,
    character2: Character,
    active_task: Task,
    auth_headers2: dict,
):
    """A different player's character can sign up for a task (create a praxis)."""
    resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "My attempt"},
        headers=auth_headers2,
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["task_id"] == active_task.id
    assert data["created_by_id"] == character2.id
    member_ids = [m["character_id"] for m in data["members"]]
    assert member_ids == [character2.id]


@pytest.mark.asyncio
async def test_other_account_character_collaborates_on_praxis(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
    era: Era,
):
    """Full cross-account collab flow: create → invite → accept.

    ``character2`` (level 5) opens a collab praxis and invites ``character``
    (acct1), who accepts. Both end up as members.
    """
    # collab creation requires level >= era.collaboration_level_required.
    create = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "Team up"},
        headers=auth_headers2,
    )
    assert create.status_code == 201, create.text
    praxis = create.json()
    assert praxis["type"] == "collab"
    praxis_id = praxis["id"]

    invite = await client.post(
        f"/praxes/{praxis_id}/invite",
        json={"invitee_id": character.id},
        headers=auth_headers2,
    )
    assert invite.status_code == 200, invite.text
    invite_id = invite.json()["id"]

    accept = await client.post(
        f"/praxes/{praxis_id}/invite/{invite_id}/respond",
        json={"accept": True},
        headers=auth_headers,
    )
    assert accept.status_code == 200, accept.text
    member_ids = {m["character_id"] for m in accept.json()["members"]}
    assert member_ids == {character.id, character2.id}


@pytest.mark.asyncio
async def test_other_account_character_views_own_profile(
    client: AsyncClient,
    character2: Character,
):
    """A character's profile is publicly viewable by id."""
    resp = await client.get(f"/characters/{character2.id}")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["id"] == character2.id
    assert data["username"] == character2.username
    assert data["display_name"] == character2.display_name


@pytest.mark.asyncio
async def test_other_account_character_edits_own_profile(
    client: AsyncClient,
    character2: Character,
    auth_headers2: dict,
):
    """A different player's character can edit its own profile and the edit sticks."""
    resp = await client.put(
        f"/characters/{character2.id}",
        json={"display_name": "Renamed Two", "bio": "A fresh bio", "location": "Earth"},
        headers=auth_headers2,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["display_name"] == "Renamed Two"
    assert data["bio"] == "A fresh bio"
    assert data["location"] == "Earth"

    # Re-read confirms persistence.
    after = await client.get(f"/characters/{character2.id}")
    assert after.json()["display_name"] == "Renamed Two"
    assert after.json()["bio"] == "A fresh bio"


@pytest.mark.asyncio
async def test_other_account_character_cannot_edit_someone_elses_profile(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers2: dict,
):
    """Editing another account's character is forbidden."""
    resp = await client.put(
        f"/characters/{character.id}",
        json={"display_name": "Hijacked"},
        headers=auth_headers2,
    )
    assert resp.status_code == 403, resp.text


# ===========================================================================
# B. Same-account second life (the multi-life surface)
# ===========================================================================

# Known gap: write endpoints resolve the actor via
# ``dependencies.get_current_character``, which returns the OLDEST active
# character and ignores ``account.active_character_id``. So after switching the
# carried life, task signup / collaboration / profile edits still act as the
# account's first life. The three tests below assert the *intended* behaviour and
# are marked xfail(strict=True) — when the resolver is fixed to honour the carried
# life, they will xpass and force these markers to be removed.
_CARRIED_LIFE_NOT_HONOURED = pytest.mark.xfail(
    reason=(
        "get_current_character ignores account.active_character_id, so write "
        "paths act as the account's first life rather than the carried second life."
    ),
    strict=True,
)


@pytest.mark.asyncio
async def test_second_life_is_carried_after_switch(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    faction_ua: Faction,
    auth_headers: dict,
):
    """Switching the active character is reflected by /auth/me (sanity)."""
    second = await _add_character(db_session, account, era, username="secondlife", level=5)

    switch = await client.post(
        "/me/active-character",
        json={"character_id": second.id},
        headers=auth_headers,
    )
    assert switch.status_code == 200, switch.text
    assert switch.json()["character"]["id"] == second.id

    me = await client.get("/auth/me", headers=auth_headers)
    assert me.json()["character"]["id"] == second.id


@pytest.mark.asyncio
async def test_second_life_views_own_profile(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    faction_ua: Faction,
):
    """A second life's profile is publicly viewable by id."""
    second = await _add_character(db_session, account, era, username="secondlife", level=5)
    resp = await client.get(f"/characters/{second.id}")
    assert resp.status_code == 200, resp.text
    assert resp.json()["id"] == second.id


@_CARRIED_LIFE_NOT_HONOURED
@pytest.mark.asyncio
async def test_second_life_signs_up_for_task_as_itself(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    faction_ua: Faction,
    active_task: Task,
    auth_headers: dict,
):
    """After switching to the second life, signing up for a task should sign up
    *that* life — not the account's first life."""
    second = await _add_character(db_session, account, era, username="secondlife", level=5)
    await client.post(
        "/me/active-character",
        json={"character_id": second.id},
        headers=auth_headers,
    )

    resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Second life attempt"},
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    # The carried life should be the author/member, not the first life.
    assert data["created_by_id"] == second.id, (
        "Task signup was attributed to the wrong character: expected the carried "
        f"second life {second.id}, got {data['created_by_id']} (first life {character.id})."
    )
    member_ids = [m["character_id"] for m in data["members"]]
    assert member_ids == [second.id]


@_CARRIED_LIFE_NOT_HONOURED
@pytest.mark.asyncio
async def test_second_life_edits_own_profile(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    faction_ua: Faction,
    auth_headers: dict,
):
    """After switching to the second life, that life can edit its own profile."""
    second = await _add_character(db_session, account, era, username="secondlife", level=5)
    await client.post(
        "/me/active-character",
        json={"character_id": second.id},
        headers=auth_headers,
    )

    resp = await client.put(
        f"/characters/{second.id}",
        json={"display_name": "Second Renamed", "bio": "Second life bio"},
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["display_name"] == "Second Renamed"

    after = await client.get(f"/characters/{second.id}")
    assert after.json()["display_name"] == "Second Renamed"
    assert after.json()["bio"] == "Second life bio"


@_CARRIED_LIFE_NOT_HONOURED
@pytest.mark.asyncio
async def test_second_life_collaborates_on_praxis(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    character2: Character,
    era: Era,
    faction_ua: Faction,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """A second life can accept a collab invite addressed to it.

    ``character2`` (acct2) opens a collab and invites the second life on acct1.
    After acct1 switches its carried life to the second life, accepting the invite
    should add the *second life* as a member.
    """
    second = await _add_character(db_session, account, era, username="secondlife", level=5)

    create = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "Team up"},
        headers=auth_headers2,
    )
    assert create.status_code == 201, create.text
    praxis_id = create.json()["id"]

    invite = await client.post(
        f"/praxes/{praxis_id}/invite",
        json={"invitee_id": second.id},
        headers=auth_headers2,
    )
    assert invite.status_code == 200, invite.text
    invite_id = invite.json()["id"]

    # Carry the second life, then accept as it.
    await client.post(
        "/me/active-character",
        json={"character_id": second.id},
        headers=auth_headers,
    )
    accept = await client.post(
        f"/praxes/{praxis_id}/invite/{invite_id}/respond",
        json={"accept": True},
        headers=auth_headers,
    )
    assert accept.status_code == 200, accept.text
    member_ids = {m["character_id"] for m in accept.json()["members"]}
    assert second.id in member_ids, (
        "Collab accept did not add the carried second life as a member: "
        f"expected {second.id} in {member_ids}."
    )
    assert member_ids == {character2.id, second.id}

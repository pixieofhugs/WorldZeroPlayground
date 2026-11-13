"""Second-character behaviour: a different account, and a second life on the same one.

ADR-0025: writes act as ``account.active_character_id`` via
``get_current_character``.
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
from tests.integration.factories import DEFAULT_FACTION_SLUG


async def _add_character(
    db_session: AsyncSession,
    account: Account,
    era: Era,
    *,
    username: str,
    level: int = 0,
    status: CharacterStatus = CharacterStatus.active,
    faction_slug: str = DEFAULT_FACTION_SLUG,
) -> Character:
    """Bypasses the ``POST /characters`` level gate (see ``test_characters.py``)."""
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


@pytest.mark.asyncio
async def test_other_account_character_signs_up_for_task(
    client: AsyncClient,
    character2: Character,
    active_task: Task,
    auth_headers2: dict,
):
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
    """``character2`` (level 5) opens: collab needs ``collaboration_level_required``."""
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
    # respond answers an ack (#1383).
    assert accept.json() == {"praxis_id": praxis_id, "accepted": True}

    detail = await client.get(f"/praxes/{praxis_id}", headers=auth_headers2)
    assert detail.status_code == 200, detail.text
    member_ids = {m["character_id"] for m in detail.json()["members"]}
    assert member_ids == {character.id, character2.id}


@pytest.mark.asyncio
async def test_other_account_character_views_own_profile(
    client: AsyncClient,
    character2: Character,
):
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
    resp = await client.put(
        f"/characters/{character2.id}",
        json={"display_name": "Renamed Two", "bio": "A fresh bio", "location": "ERT"},
        headers=auth_headers2,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["display_name"] == "Renamed Two"
    assert data["bio"] == "A fresh bio"
    assert data["location"] == "ERT"

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
    resp = await client.put(
        f"/characters/{character.id}",
        json={"display_name": "Hijacked"},
        headers=auth_headers2,
    )
    assert resp.status_code == 403, resp.text


# Same-account second life.


@pytest.mark.asyncio
async def test_second_life_is_carried_after_switch(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    some_faction: Faction,
    auth_headers: dict,
):
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
    some_faction: Faction,
):
    second = await _add_character(db_session, account, era, username="secondlife", level=5)
    resp = await client.get(f"/characters/{second.id}")
    assert resp.status_code == 200, resp.text
    assert resp.json()["id"] == second.id


@pytest.mark.asyncio
async def test_second_life_signs_up_for_task_as_itself(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    some_faction: Faction,
    active_task: Task,
    auth_headers: dict,
):
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
    assert data["created_by_id"] == second.id, (
        "Task signup was attributed to the wrong character: expected the carried "
        f"second life {second.id}, got {data['created_by_id']} (first life {character.id})."
    )
    member_ids = [m["character_id"] for m in data["members"]]
    assert member_ids == [second.id]


@pytest.mark.asyncio
async def test_second_life_edits_own_profile(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    some_faction: Faction,
    auth_headers: dict,
):
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


@pytest.mark.asyncio
async def test_second_life_carried_cannot_edit_sibling_first_life(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    some_faction: Faction,
    auth_headers: dict,
):
    """Profile edits are carried-character-only (ADR-0025 decision 3)."""
    second = await _add_character(db_session, account, era, username="secondlife", level=5)
    await client.post(
        "/me/active-character",
        json={"character_id": second.id},
        headers=auth_headers,
    )

    resp = await client.put(
        f"/characters/{character.id}",
        json={"display_name": "Hijacked sibling"},
        headers=auth_headers,
    )
    assert resp.status_code == 403, resp.text


@pytest.mark.asyncio
async def test_second_life_governs_viewer_flags_on_read(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    character2: Character,
    era: Era,
    some_faction: Faction,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """The optional viewer resolver honours the carried life's level for ``can_flag``.

    Target is on another account: anti-self-flag is account-scoped (#328).
    """
    create = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Rival work"},
        headers=auth_headers2,
    )
    assert create.status_code == 201, create.text
    praxis_id = create.json()["id"]
    assert (await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)).status_code == 200

    as_first = await client.get(f"/praxes/{praxis_id}", headers=auth_headers)
    assert as_first.json()["can_flag"] is False

    second = await _add_character(
        db_session, account, era, username="secondlife",
        level=CURRENT_ERA.flag_level_required,
    )
    await client.post(
        "/me/active-character",
        json={"character_id": second.id},
        headers=auth_headers,
    )
    as_second = await client.get(f"/praxes/{praxis_id}", headers=auth_headers)
    assert as_second.json()["can_flag"] is True, (
        "Optional viewer resolver ignored the carried life: can_flag should reflect "
        "the carried second life's level once it is carried."
    )


@pytest.mark.asyncio
async def test_second_life_collaborates_on_praxis(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    character2: Character,
    era: Era,
    some_faction: Faction,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
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
    assert accept.json() == {"praxis_id": praxis_id, "accepted": True}

    detail = await client.get(f"/praxes/{praxis_id}", headers=auth_headers2)
    assert detail.status_code == 200, detail.text
    member_ids = {m["character_id"] for m in detail.json()["members"]}
    assert second.id in member_ids, (
        "Collab accept did not add the carried second life as a member: "
        f"expected {second.id} in {member_ids}."
    )
    assert member_ids == {character2.id, second.id}

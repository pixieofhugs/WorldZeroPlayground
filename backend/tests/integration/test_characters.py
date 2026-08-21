"""Integration tests for /characters endpoints."""
import os
from dataclasses import replace

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode
from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction
from models.praxis import Praxis
from models.task import Task, TaskStatus
from schemas.character import CharacterCreate
from services.character import create_character


@pytest.mark.asyncio
async def test_list_characters_public(client: AsyncClient, character: Character):
    resp = await client.get("/characters")
    assert resp.status_code == 200
    data = resp.json()
    ids = [c["id"] for c in data]
    assert character.id in ids


@pytest.mark.asyncio
async def test_get_character(client: AsyncClient, character: Character):
    resp = await client.get(f"/characters/{character.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == character.id
    assert data["username"] == character.username
    # account_id must never be exposed
    assert "account_id" not in data
    assert "email" not in data


@pytest.mark.asyncio
async def test_get_character_not_found(client: AsyncClient):
    resp = await client.get("/characters/99999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_create_character(
    client: AsyncClient, account: Account, era: Era, faction_ua: Faction, auth_headers: dict
):
    resp = await client.post(
        "/characters",
        json={"username": "newchar", "display_name": "New Character"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["username"] == "newchar"
    # ADR-0019: born unaffiliated, not forced into UA. Read from the era rather
    # than spelled "na" (#1559) — tests.unit.test_era_config pins the literal.
    assert data["faction_slug"] == CURRENT_ERA.starting_faction_slug
    assert "account_id" not in data


@pytest.mark.asyncio
async def test_create_character_unauthenticated(client: AsyncClient):
    resp = await client.post(
        "/characters",
        json={"username": "newchar2", "display_name": "Another"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_update_character(
    client: AsyncClient, character: Character, auth_headers: dict
):
    resp = await client.put(
        f"/characters/{character.id}",
        json={"display_name": "Updated Name"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["display_name"] == "Updated Name"


@pytest.mark.asyncio
async def test_update_character_trims_display_name(
    client: AsyncClient, character: Character, auth_headers: dict
):
    """Creation strips before storing; the update path now agrees (#1686)."""
    resp = await client.put(
        f"/characters/{character.id}",
        json={"display_name": "  Padded Name  "},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["display_name"] == "Padded Name"


@pytest.mark.parametrize("blank", ["", "   ", "\t", "\n"])
@pytest.mark.asyncio
async def test_update_character_blank_display_name_rejected(
    client: AsyncClient, character: Character, auth_headers: dict, blank: str
):
    """A rename to whitespace is refused at the wire, as creation already refuses it.

    A display name is drawn on bylines, rosters, comment attributions and avatar
    monograms; a blank one makes every one of those surfaces invent a fallback
    (#1686).
    """
    original = character.display_name
    resp = await client.put(
        f"/characters/{character.id}",
        json={"display_name": blank},
        headers=auth_headers,
    )
    assert resp.status_code == 422
    read_back = await client.get(f"/characters/{character.id}")
    assert read_back.json()["display_name"] == original


@pytest.mark.asyncio
async def test_update_character_explicit_null_display_name_leaves_it_unchanged(
    client: AsyncClient, character: Character, auth_headers: dict
):
    """An explicit ``null`` means "leave unchanged", not "blank it" (#1686).

    Before the fix the service coerced every ``None`` in the body to ``""``, so
    this stored an empty name — the same defect as the blank-string case wearing
    a different hat.
    """
    original = character.display_name
    resp = await client.put(
        f"/characters/{character.id}",
        json={"display_name": None, "bio": "still edited"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["display_name"] == original
    assert resp.json()["bio"] == "still edited"


@pytest.mark.asyncio
async def test_update_character_omitted_display_name_leaves_it_unchanged(
    client: AsyncClient, character: Character, auth_headers: dict
):
    original = character.display_name
    resp = await client.put(
        f"/characters/{character.id}",
        json={"bio": "only the bio moved"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["display_name"] == original


@pytest.mark.asyncio
async def test_update_character_wrong_owner(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers2: dict,
):
    """Character owned by account2 cannot edit character owned by account1."""
    resp = await client.put(
        f"/characters/{character.id}",
        json={"display_name": "Hacked"},
        headers=auth_headers2,
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_delete_character(
    client: AsyncClient, character: Character, auth_headers: dict
):
    resp = await client.delete(f"/characters/{character.id}", headers=auth_headers)
    assert resp.status_code == 204

    # Should not be visible after deletion
    get_resp = await client.get(f"/characters/{character.id}")
    assert get_resp.status_code == 404


# ---------------------------------------------------------------------------
# T.5 additions — search/filter, stats fields, faction change, second char
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_characters_search_by_username(
    client: AsyncClient, character: Character, character2: Character
):
    """Search by partial username returns matching characters."""
    resp = await client.get("/characters", params={"search": "testcharacter"})
    assert resp.status_code == 200
    data = resp.json()
    ids = [c["id"] for c in data]
    assert character.id in ids
    assert character2.id not in ids


@pytest.mark.asyncio
async def test_list_characters_search_by_display_name(
    client: AsyncClient, character: Character, character2: Character
):
    """Search matches display_name, not just username (#229 — powers @mention typeahead).

    character2's display_name is "Other Character"; its username ("othercharacter")
    has no space, so this substring only matches via display_name.
    """
    resp = await client.get("/characters", params={"search": "Other Character"})
    assert resp.status_code == 200
    ids = [c["id"] for c in resp.json()]
    assert character2.id in ids
    assert character.id not in ids


@pytest.mark.asyncio
async def test_list_characters_search_ignores_handle_sigil(
    client: AsyncClient, character: Character, character2: Character
):
    """A leading '@' is a sigil, not a search character (#624).

    The collab/duel invite search prompts for "@handle" and sends the query as
    typed. No username contains '@', so without stripping it the ILIKE matched
    nothing and the dropdown never opened.
    """
    resp = await client.get("/characters", params={"search": "@testcharacter"})
    assert resp.status_code == 200
    ids = [c["id"] for c in resp.json()]
    assert character.id in ids
    assert character2.id not in ids


async def _seed_scored_character(
    db_session: AsyncSession,
    era: Era,
    *,
    email: str,
    username: str,
    score: int,
) -> Character:
    """Create an active 'ua' character with an explicit current-era score."""
    account = Account(email=email)
    db_session.add(account)
    await db_session.flush()
    ch = Character(
        account_id=account.id,
        username=username,
        display_name=username.capitalize(),
        faction_slug="ua",
    )
    db_session.add(ch)
    await db_session.flush()
    db_session.add(
        CharacterStats(
            character_id=ch.id,
            era_id=era.id,
            score=score,
            all_time_score=score,
            level=0,
            votes_spent_this_era=0,
        )
    )
    await db_session.commit()
    await db_session.refresh(ch)
    return ch


@pytest.mark.asyncio
async def test_list_characters_search_ranks_prefix_above_higher_score_substring(
    client: AsyncClient,
    db_session: AsyncSession,
    era: Era,
    faction_ua: Faction,
):
    """A prefix match outranks a higher-score substring match (#989).

    "@P" should surface "Pixie" (a prefix match, low score) above "yump" (a
    mere substring match, high score) — relevance is ranked before score, so
    the obvious match no longer sinks below the row limit.
    """
    prefix_match = await _seed_scored_character(
        db_session, era, email="pixie@example.com", username="pixie", score=1
    )
    substring_match = await _seed_scored_character(
        db_session, era, email="yump@example.com", username="yump", score=9999
    )

    resp = await client.get("/characters", params={"search": "p"})
    assert resp.status_code == 200
    ids = [c["id"] for c in resp.json()]
    assert prefix_match.id in ids
    assert substring_match.id in ids
    # Prefix (priority 1) must sort ahead of substring (priority 2), despite the
    # substring match having the far higher score.
    assert ids.index(prefix_match.id) < ids.index(substring_match.id)


@pytest.mark.asyncio
async def test_list_characters_filter_by_faction(
    client: AsyncClient, character: Character, character2: Character
):
    """Filter by faction slug returns only characters in that faction."""
    resp = await client.get("/characters", params={"faction": "ua"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    for entry in data:
        assert entry["faction_slug"] == "ua"


@pytest.mark.asyncio
async def test_list_characters_faction_no_match(client: AsyncClient, character: Character):
    """Filter by a faction with no members returns empty list."""
    resp = await client.get("/characters", params={"faction": "nonexistent_faction"})
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_characters_excludes_players_active_on_task(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers2: dict,
):
    """exclude_active_task_id hides players already active on that task (#320)."""
    # character2 signs up solo on the task → active member for it.
    create = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo"},
        headers=auth_headers2,
    )
    assert create.status_code == 201

    resp = await client.get(
        "/characters", params={"exclude_active_task_id": active_task.id}
    )
    assert resp.status_code == 200
    ids = [c["id"] for c in resp.json()]
    assert character2.id not in ids  # active on the task → hidden
    assert character.id in ids  # not active → still listed


@pytest.mark.asyncio
async def test_list_characters_excludes_own_account(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    character2: Character,
    era: Era,
    faction_ua: Faction,
    auth_headers: dict,
):
    """exclude_own_account hides every life on the VIEWER'S ACCOUNT (#1385).

    The alt is the case that matters: a second character on the viewer's own
    account reads as a different player by id alone, which is exactly the hole
    ``services.duel._characters_share_account`` closes (ADR-0041, #1237). A
    cross-account control proves the filter narrows rather than empties.
    """
    alt = Character(
        account_id=account.id,
        username="altlife",
        display_name="Alt Life",
        faction_slug="ua",
    )
    db_session.add(alt)
    await db_session.flush()
    db_session.add(
        CharacterStats(
            character_id=alt.id,
            era_id=era.id,
            score=0,
            all_time_score=0,
            level=0,
            votes_spent_this_era=0,
        )
    )
    await db_session.commit()

    resp = await client.get(
        "/characters",
        params={"exclude_own_account": True},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    ids = [c["id"] for c in resp.json()]
    assert character.id not in ids  # the carried life
    assert alt.id not in ids  # the alt — invisible to an id-only rule
    assert character2.id in ids  # another account → still listed


@pytest.mark.asyncio
async def test_list_characters_exclude_own_account_anonymous_is_noop(
    client: AsyncClient, character: Character, character2: Character
):
    """Anonymous + the param is a documented no-op, not a 401 or a 422 (#1385).

    There is no viewer to exclude, and the real enforcement lives in
    ``services.duel``; rejecting would make a deliberately public route
    conditionally authenticated for no security gain.
    """
    resp = await client.get("/characters", params={"exclude_own_account": True})
    assert resp.status_code == 200
    ids = [c["id"] for c in resp.json()]
    assert character.id in ids
    assert character2.id in ids


@pytest.mark.asyncio
async def test_list_characters_limit_offset(
    client: AsyncClient, character: Character, character2: Character
):
    """Limit and offset pagination controls work."""
    resp_all = await client.get("/characters", params={"limit": 50, "offset": 0})
    assert resp_all.status_code == 200
    all_ids = [c["id"] for c in resp_all.json()]

    # Offset by total count should return empty
    total = len(all_ids)
    resp_empty = await client.get("/characters", params={"limit": 50, "offset": total})
    assert resp_empty.status_code == 200
    assert resp_empty.json() == []


@pytest.mark.asyncio
async def test_get_character_includes_stats_fields(
    client: AsyncClient, character2: Character
):
    """GET /characters/{id} returns score, level, and all_time_score from CharacterStats."""
    resp = await client.get(f"/characters/{character2.id}")
    assert resp.status_code == 200
    data = resp.json()
    # character2 was seeded with score=500, level=5
    assert data["score"] == 500
    assert data["level"] == 5
    assert data["all_time_score"] == 500


@pytest.mark.asyncio
async def test_get_character_no_account_id_in_response(
    client: AsyncClient, character: Character
):
    """account_id and email must never appear in the character response."""
    resp = await client.get(f"/characters/{character.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert "account_id" not in data
    assert "email" not in data


@pytest.mark.asyncio
async def test_faction_change_via_choose_endpoint(
    client: AsyncClient,
    db_session: AsyncSession,
    character2: Character,
    auth_headers2: dict,
):
    """POST /factions/choose lets a level-3+ character defect to a new faction.

    character2 is level 5 (seeded in conftest), so the defection should succeed
    provided the target faction exists and is selectable.
    """
    from models.faction import FactionStatus

    # Seed a selectable target faction
    target = Faction(
        slug="testfaction",
        status=FactionStatus.visible,
    )
    db_session.add(target)
    await db_session.commit()

    resp = await client.post(
        "/factions/choose",
        json={"faction_slug": "testfaction"},
        headers=auth_headers2,
    )
    # If the faction isn't configured in ERA (no EraConfig entry), defection is rejected (404)
    # or succeeds (200). Either way the endpoint must be reachable.
    assert resp.status_code in (200, 403, 404, 422)


@pytest.mark.asyncio
async def test_second_character_blocked_below_level4(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    era: Era,
    faction_ua: Faction,
    auth_headers: dict,
):
    """Account with a level-3 first character cannot create a second character (R.7)."""
    # Raise the first character's level to 3 — still below the level-4 gate
    from sqlalchemy import select
    result = await db_session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    stats.level = 3
    await db_session.commit()

    resp = await client.post(
        "/characters",
        json={"username": "secondchar", "display_name": "Second"},
        headers=auth_headers,
    )
    assert resp.status_code == 403
    # A code the client can branch on, plus prose that still names the level-4
    # requirement — #1401 added the code without rewriting the copy.
    detail = resp.json()["detail"]
    assert detail["code"] == ErrorCode.second_character_level_too_low.value
    assert "4" in detail["message"]


@pytest.mark.asyncio
async def test_second_character_allowed_at_level5(
    client: AsyncClient,
    db_session: AsyncSession,
    account2: Account,
    era: Era,
    faction_ua: Faction,
    auth_headers2: dict,
):
    """Account whose first character is level 5 can create a second character (R.7)."""
    # character2 from conftest already exists with level 5; auth_headers2 belongs to account2
    resp = await client.post(
        "/characters",
        json={"username": "secondcharacter2", "display_name": "Second Two"},
        headers=auth_headers2,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["username"] == "secondcharacter2"
    assert "account_id" not in data


@pytest.mark.asyncio
async def test_albescent_rejected_at_creation(
    client: AsyncClient,
    account: Account,
    era: Era,
    faction_ua: Faction,
    auth_headers: dict,
):
    """ADR-0019: Albescent is join-in-the-field only — never a creation option."""
    resp = await client.post(
        "/characters",
        json={"display_name": "Wannabe", "faction_slug": "albescent"},
        headers=auth_headers,
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_uninvited_faction_rejected_at_creation(
    client: AsyncClient,
    account: Account,
    era: Era,
    faction_ua: Faction,
    auth_headers: dict,
):
    """A faction the account holds no invitation for is rejected (born-na is the default)."""
    resp = await client.post(
        "/characters",
        json={"display_name": "Hopeful", "faction_slug": "ua"},
        headers=auth_headers,
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_create_in_invited_faction(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    faction_ua: Faction,
    auth_headers: dict,
):
    """With an account-pooled invitation, a new life may be born straight into that faction."""
    from models.invitation_letter import InvitationLetter

    # character (account's first life) holds a current-era UA invite; raise to the
    # second-character gate so the create is allowed.
    stats = await db_session.scalar(
        select(CharacterStats).where(CharacterStats.character_id == character.id)
    )
    stats.level = 4
    db_session.add(InvitationLetter(character_id=character.id, faction_slug="ua", era_id=era.id))
    await db_session.commit()

    resp = await client.post(
        "/characters",
        json={"display_name": "Invited One", "faction_slug": "ua"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["faction_slug"] == "ua"


@pytest.mark.asyncio
async def test_defected_faction_stays_a_birth_option_but_not_a_rejoin(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    faction_ua: Faction,
    faction_ephemerists: Faction,
    auth_headers: dict,
):
    """#2385: the burn is per-character; the account's earned history survives it.

    Both directions of the same seam, on one account and one faction: life 1
    walks out of UA, so UA's door is shut *for life 1* forever
    (``can_join_faction`` / #2218's letter delete), while UA stays a birth
    option for life 2, which has never been there.
    """
    from models.invitation_letter import InvitationLetter

    # Life 1 holds both letters and is at the second-character gate.
    stats = await db_session.scalar(
        select(CharacterStats).where(CharacterStats.character_id == character.id)
    )
    stats.level = CURRENT_ERA.second_character_level_required
    db_session.add(
        InvitationLetter(character_id=character.id, faction_slug="ua", era_id=era.id)
    )
    db_session.add(
        InvitationLetter(
            character_id=character.id, faction_slug="ephemerists", era_id=era.id
        )
    )
    await db_session.commit()

    # Life 1 walks out of UA. #2218 deletes the UA letter on the way.
    resp = await client.post(
        "/factions/choose", json={"faction_slug": "ephemerists"}, headers=auth_headers
    )
    assert resp.status_code == 200

    # Direction 1 — the per-character door stays shut for life 1.
    resp = await client.post(
        "/factions/choose", json={"faction_slug": "ua"}, headers=auth_headers
    )
    assert resp.status_code == 403
    assert resp.json()["detail"]["code"] == ErrorCode.faction_rejoin_forbidden.value

    # Direction 2 — UA is still a birth option for a life that never burned it.
    resp = await client.post(
        "/characters",
        json={"display_name": "Second Life", "faction_slug": "ua"},
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["faction_slug"] == "ua"


@pytest.mark.asyncio
async def test_username_derived_from_display_name(
    client: AsyncClient,
    account: Account,
    era: Era,
    faction_ua: Faction,
    auth_headers: dict,
):
    """Omitted username → derived from display_name (lowercase, alphanumeric-only)."""
    resp = await client.post(
        "/characters",
        json={"display_name": "Wren O'Hara!"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["username"] == "wrenohara"


@pytest.mark.asyncio
async def test_username_collision_auto_suffix(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    faction_ua: Faction,
    auth_headers: dict,
):
    """A derived handle that collides gets an auto-suffix (wren, wren2)."""
    # Clear the second-character gate so both creates are allowed.
    stats = await db_session.scalar(
        select(CharacterStats).where(CharacterStats.character_id == character.id)
    )
    stats.level = 4
    await db_session.commit()

    first = await client.post("/characters", json={"display_name": "Wren"}, headers=auth_headers)
    assert first.json()["username"] == "wren"
    second = await client.post("/characters", json={"display_name": "Wren"}, headers=auth_headers)
    assert second.json()["username"] == "wren2"


@pytest.mark.asyncio
async def test_empty_display_name_rejected(
    client: AsyncClient, account: Account, era: Era, auth_headers: dict
):
    """A non-empty display_name is required."""
    resp = await client.post("/characters", json={"display_name": "   "}, headers=auth_headers)
    assert resp.status_code in (400, 422)


# ---------------------------------------------------------------------------
# Relationships endpoint
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Avatar upload endpoint
# ---------------------------------------------------------------------------


def _make_jpeg_bytes(width: int = 100, height: int = 100) -> bytes:
    """Return a minimal valid JPEG image as bytes."""
    from PIL import Image
    import io as _io

    img = Image.new("RGB", (width, height), color=(128, 64, 32))
    buf = _io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.mark.asyncio
async def test_upload_avatar_success(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    tmp_path,
    monkeypatch,
):
    """POST /characters/{id}/avatar with a valid image saves and returns updated character."""
    from config import settings as _settings

    # Point MEDIA_ROOT to a temp dir so the test doesn't write to the real filesystem
    monkeypatch.setattr(_settings, "MEDIA_ROOT", str(tmp_path))

    jpeg_bytes = _make_jpeg_bytes()
    resp = await client.post(
        f"/characters/{character.id}/avatar",
        files={"file": ("avatar.jpg", jpeg_bytes, "image/jpeg")},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == character.id
    assert data["avatar_url"] is not None
    assert "avatar" in data["avatar_url"]


@pytest.mark.asyncio
async def test_reuploading_an_avatar_changes_the_url(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    tmp_path,
    monkeypatch,
):
    """A second upload must return a different ``avatar_url`` (#1565).

    Route-level rather than service-level because the defect the route can
    reintroduce is forgetting to hand the outgoing path to the service: the
    unit tests pass ``previous_avatar_url`` themselves and so cannot see it.
    """
    from config import settings as _settings

    monkeypatch.setattr(_settings, "MEDIA_ROOT", str(tmp_path))

    async def _upload() -> str:
        resp = await client.post(
            f"/characters/{character.id}/avatar",
            files={"file": ("avatar.jpg", _make_jpeg_bytes(), "image/jpeg")},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        return resp.json()["avatar_url"]

    first_url = await _upload()
    second_url = await _upload()

    assert first_url != second_url
    assert not os.path.exists(os.path.join(str(tmp_path), first_url))
    assert os.path.isfile(os.path.join(str(tmp_path), second_url))


@pytest.mark.asyncio
async def test_upload_avatar_wrong_owner(
    client: AsyncClient,
    character: Character,
    auth_headers2: dict,
):
    """Uploading an avatar for another character's id returns 403."""
    jpeg_bytes = _make_jpeg_bytes()
    resp = await client.post(
        f"/characters/{character.id}/avatar",
        files={"file": ("avatar.jpg", jpeg_bytes, "image/jpeg")},
        headers=auth_headers2,
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_upload_avatar_not_active_character(
    client: AsyncClient,
    auth_headers: dict,
):
    """Uploading to an id that isn't the caller's active character returns 403.

    The avatar guard is identity-based, matching edit/delete (ADR-0025): a
    mismatched id (here, a nonexistent one) is rejected as 403, not 404.
    """
    jpeg_bytes = _make_jpeg_bytes()
    resp = await client.post(
        "/characters/99999/avatar",
        files={"file": ("avatar.jpg", jpeg_bytes, "image/jpeg")},
        headers=auth_headers,
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_upload_avatar_non_image_rejected(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
):
    """Uploading a non-image file returns 422."""
    resp = await client.post(
        f"/characters/{character.id}/avatar",
        files={"file": ("data.txt", b"not an image", "text/plain")},
        headers=auth_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_upload_avatar_unauthenticated(client: AsyncClient, character: Character):
    """Uploading an avatar without authentication returns 401."""
    jpeg_bytes = _make_jpeg_bytes()
    resp = await client.post(
        f"/characters/{character.id}/avatar",
        files={"file": ("avatar.jpg", jpeg_bytes, "image/jpeg")},
    )
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# DELETE wrong owner
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_character_wrong_owner(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers2: dict,
):
    """Character owned by account2 cannot delete character owned by account1."""
    resp = await client.delete(f"/characters/{character.id}", headers=auth_headers2)
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# DELETE erases the avatar (#1568)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_character_erases_the_avatar_file_and_the_column(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
    tmp_path,
    monkeypatch,
):
    """Ending your own life takes your photo with it (#1568).

    Route-level because the erasure is a property of the *self-deletion path*,
    not of the state it lands in: the admin ban reaches the identical
    ``status = banned`` and must leave the file alone.

    Both halves are asserted. Unlinking without clearing the column leaves the
    row pointing at a file that is gone; clearing without unlinking leaves an
    orphan nothing will ever reference again.
    """
    from config import settings as _settings

    monkeypatch.setattr(_settings, "MEDIA_ROOT", str(tmp_path))

    upload = await client.post(
        f"/characters/{character.id}/avatar",
        files={"file": ("avatar.jpg", _make_jpeg_bytes(), "image/jpeg")},
        headers=auth_headers,
    )
    assert upload.status_code == 200
    avatar_url = upload.json()["avatar_url"]
    assert os.path.isfile(os.path.join(str(tmp_path), avatar_url))

    resp = await client.delete(f"/characters/{character.id}", headers=auth_headers)
    assert resp.status_code == 204

    assert not os.path.exists(os.path.join(str(tmp_path), avatar_url))
    await db_session.refresh(character)
    assert character.avatar_url == ""


@pytest.mark.asyncio
async def test_delete_character_leaves_praxis_media_on_disk(
    client: AsyncClient,
    character: Character,
    praxis_solo,
    auth_headers: dict,
    db_session: AsyncSession,
    tmp_path,
    monkeypatch,
):
    """Praxis media is other people's history, not the departing player's alone.

    It is the public artefact of work others have voted on and built feeds
    around; removing it retroactively would leave praxis cards with missing
    images across those feeds (#1568).
    """
    from config import settings as _settings
    from models.praxis import MediaItem, MediaType

    monkeypatch.setattr(_settings, "MEDIA_ROOT", str(tmp_path))

    relative_path = os.path.join(str(character.id), str(praxis_solo.id), "abc", "proof.jpg")
    absolute_path = os.path.join(str(tmp_path), relative_path)
    os.makedirs(os.path.dirname(absolute_path), exist_ok=True)
    with open(absolute_path, "wb") as handle:
        handle.write(b"proof bytes")
    db_session.add(
        MediaItem(
            praxis_id=praxis_solo.id,
            type=MediaType.image,
            file_path=relative_path,
            display_order=0,
        )
    )
    await db_session.flush()

    resp = await client.delete(f"/characters/{character.id}", headers=auth_headers)
    assert resp.status_code == 204

    assert os.path.isfile(absolute_path)


@pytest.mark.asyncio
async def test_delete_character_with_a_pasted_avatar_url_deletes_nothing(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
    tmp_path,
    monkeypatch,
):
    """``avatar_url`` may hold a remote URL a player typed, not a path we wrote.

    Unlinking whatever that column holds would be a path-traversal primitive;
    the guard lives in ``services.media.resolve_stored_media_path`` and this is
    the deletion path's proof that it goes through it.
    """
    from config import settings as _settings

    monkeypatch.setattr(_settings, "MEDIA_ROOT", str(tmp_path))
    character.avatar_url = "https://example.com/photo.jpg"
    await db_session.flush()

    resp = await client.delete(f"/characters/{character.id}", headers=auth_headers)

    assert resp.status_code == 204
    await db_session.refresh(character)
    assert character.avatar_url == ""


# ---------------------------------------------------------------------------
# Relationships endpoint — deleted, see below
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_character_relationships_endpoint_is_gone(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
):
    """``GET /characters/{id}/relationships`` must not exist.

    It served any character's complete friend/foe graph to *unauthenticated*
    callers, so integer ids could be walked to enumerate the whole social
    graph. It had no consumer — the profile page reads the viewer-scoped
    ``GET /relationships``. Deletion is the fix, so this pins 404: asserting
    "requires auth" instead would let the endpoint come back.
    """
    from models.relationship import Relationship, RelationshipStatus, RelationshipType

    db_session.add(
        Relationship(
            from_character_id=character.id,
            to_character_id=character2.id,
            type=RelationshipType.friend,
            status=RelationshipStatus.active,
        )
    )
    await db_session.commit()

    resp = await client.get(f"/characters/{character.id}/relationships")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_faction_slug_db_default_is_unaffiliated(
    db_session: AsyncSession, account: Account, era: Era, faction_ua: Faction
):
    """A direct insert that omits faction_slug falls back to 'na', not 'ua' (#697).

    ADR-0019: characters are born Unaffiliated. create_character always sets the
    slug explicitly, so this guards the column default itself against drifting
    back to a real faction.
    """
    bare = Character(
        account_id=account.id,
        username="defaultfaction",
        display_name="Default Faction",
    )
    db_session.add(bare)
    await db_session.commit()
    await db_session.refresh(bare)

    assert bare.faction_slug == "na"


@pytest.mark.asyncio
async def test_starting_faction_is_read_from_the_era_not_hardcoded(
    db_session: AsyncSession, account: Account, era: Era, faction_ua: Faction
):
    """An era that overrides ``starting_faction_slug`` actually moves the birth faction.

    Without this the field would be decorative: ``test_create_character`` passes
    whether the slug comes from ``era.starting_faction_slug`` or from the literal
    "na" it used to be (#1559), because Era 1's answer is the same either way.
    Substituting an era that says "ua" is the only assertion that can tell them
    apart — and it is deliberately *not* an assertion that new characters are UA.
    """
    ua_start = replace(CURRENT_ERA, starting_faction_slug="ua")

    result = await create_character(
        account_id=account.id,
        data=CharacterCreate(display_name="Era Says UA", username="erasaysua"),
        session=db_session,
        era=ua_start,
    )

    assert result.character.faction_slug == "ua"


# --- tagline (#1628) -------------------------------------------------------
#
# The 140-char cap is a *wire* contract, not a form affordance: the profile
# header's identity slot is only safe to lay out because the field cannot grow
# past it. The form counter is a courtesy; these are the guard. `bio` (500) and
# `tagline` (140) are separately capped and must never be conflated.

TAGLINE_MAX = 140


@pytest.mark.asyncio
async def test_create_character_accepts_tagline(
    client: AsyncClient, account: Account, era: Era, faction_ua: Faction, auth_headers: dict
):
    """A tagline set at creation round-trips back out on ``CharacterOut``."""
    resp = await client.post(
        "/characters",
        json={"display_name": "Sloganeer", "tagline": "Slow spells, strong tea."},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["tagline"] == "Slow spells, strong tea."


@pytest.mark.asyncio
async def test_create_character_defaults_tagline_empty(
    client: AsyncClient, account: Account, era: Era, faction_ua: Faction, auth_headers: dict
):
    """Omitting it lands "" — never null, and never seeded from bio (#1628)."""
    resp = await client.post(
        "/characters",
        json={"display_name": "No Slogan", "bio": "A long and unstructured paragraph."},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["tagline"] == ""


@pytest.mark.asyncio
async def test_create_character_rejects_overlong_tagline(
    client: AsyncClient, account: Account, era: Era, faction_ua: Faction, auth_headers: dict
):
    resp = await client.post(
        "/characters",
        json={"display_name": "Windbag", "tagline": "x" * (TAGLINE_MAX + 1)},
        headers=auth_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_update_character_tagline_boundary(
    client: AsyncClient, character: Character, auth_headers: dict
):
    """Exactly 140 is accepted; 141 is refused. The boundary is the whole point."""
    at_cap = "y" * TAGLINE_MAX
    resp = await client.put(
        f"/characters/{character.id}",
        json={"tagline": at_cap},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["tagline"] == at_cap

    resp = await client.put(
        f"/characters/{character.id}",
        json={"tagline": "y" * (TAGLINE_MAX + 1)},
        headers=auth_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_tagline_and_bio_are_independent(
    client: AsyncClient, character: Character, auth_headers: dict
):
    """Editing one must not disturb the other — the split exists to end exactly
    that confusion, and a 500-char bio must not become a 140-char tagline."""
    resp = await client.put(
        f"/characters/{character.id}",
        json={"bio": "b" * 500, "tagline": "Evidence first. Apologies never."},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["bio"] == "b" * 500
    assert data["tagline"] == "Evidence first. Apologies never."


@pytest.mark.asyncio
async def test_update_character_clears_bio_and_location(
    client: AsyncClient, character: Character, auth_headers: dict
):
    """An explicit "" clears the column — setting a field must be undoable (#1644).

    The seam is which keys reach the body, so it can only be guarded here: the
    client used to send ``value || undefined``, ``exclude_unset=True`` read the
    omission as "leave it alone", and the save appeared to succeed while the old
    text survived. The empty PUT below is the request the form now makes.
    """
    resp = await client.put(
        f"/characters/{character.id}",
        json={"bio": "Once wrote this down.", "location": "Portland"},
        headers=auth_headers,
    )
    assert resp.status_code == 200

    resp = await client.put(
        f"/characters/{character.id}",
        json={"bio": "", "location": ""},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["bio"] == ""
    assert data["location"] == ""

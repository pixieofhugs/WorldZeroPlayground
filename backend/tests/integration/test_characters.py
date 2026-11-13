"""Integration tests for /characters endpoints."""
import os

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode
from faction_slugs import real_faction_slugs
from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction
from models.task import Task
from tests.integration.factories import DEFAULT_FACTION_SLUG

#: Any live-era faction other than the fixtures' default; derived, never named (#2708).
OTHER_FACTION_SLUG = next(
    slug
    for slug in real_faction_slugs(CURRENT_ERA)
    if slug != DEFAULT_FACTION_SLUG
)


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
    assert "account_id" not in data
    assert "email" not in data


@pytest.mark.asyncio
async def test_get_character_not_found(client: AsyncClient):
    resp = await client.get("/characters/99999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_create_character(
    client: AsyncClient, account: Account, era: Era, some_faction: Faction, auth_headers: dict
):
    resp = await client.post(
        "/characters",
        json={"username": "newchar", "display_name": "New Character"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["username"] == "newchar"
    # ADR-0019; test_era_config pins the literal.
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
    """#1686."""
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
    """Blank names force every byline/roster surface to invent a fallback (#1686)."""
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
    """An explicit ``null`` means "leave unchanged", not "blank it" (#1686)."""
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

    get_resp = await client.get(f"/characters/{character.id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_list_characters_search_by_username(
    client: AsyncClient, character: Character, character2: Character
):
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
    """#229. The space means this only matches display_name, not the username."""
    resp = await client.get("/characters", params={"search": "Other Character"})
    assert resp.status_code == 200
    ids = [c["id"] for c in resp.json()]
    assert character2.id in ids
    assert character.id not in ids


@pytest.mark.asyncio
async def test_list_characters_search_ignores_handle_sigil(
    client: AsyncClient, character: Character, character2: Character
):
    """Invite search sends "@handle" as typed; no username contains '@' (#624)."""
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
    account = Account(email=email)
    db_session.add(account)
    await db_session.flush()
    ch = Character(
        account_id=account.id,
        username=username,
        display_name=username.capitalize(),
        faction_slug=DEFAULT_FACTION_SLUG,
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
    some_faction: Faction,
):
    """Relevance ranks before score (#989)."""
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
    assert ids.index(prefix_match.id) < ids.index(substring_match.id)


@pytest.mark.asyncio
async def test_list_characters_filter_by_faction(
    client: AsyncClient, character: Character, character2: Character
):
    resp = await client.get("/characters", params={"faction": DEFAULT_FACTION_SLUG})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    for entry in data:
        assert entry["faction_slug"] == DEFAULT_FACTION_SLUG


@pytest.mark.asyncio
async def test_list_characters_faction_no_match(client: AsyncClient, character: Character):
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
    """#320."""
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
    assert character2.id not in ids
    assert character.id in ids


@pytest.mark.asyncio
async def test_list_characters_excludes_own_account(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    character2: Character,
    era: Era,
    some_faction: Faction,
    auth_headers: dict,
):
    """Hides every life on the viewer's account, alts included (#1385, ADR-0041)."""
    alt = Character(
        account_id=account.id,
        username="altlife",
        display_name="Alt Life",
        faction_slug=DEFAULT_FACTION_SLUG,
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
    assert character.id not in ids
    assert alt.id not in ids  # invisible to an id-only rule
    assert character2.id in ids  # control: narrows, not empties


@pytest.mark.asyncio
async def test_list_characters_exclude_own_account_anonymous_is_noop(
    client: AsyncClient, character: Character, character2: Character
):
    """Anonymous: no-op, not 401/422; enforcement is in ``services.duel`` (#1385)."""
    resp = await client.get("/characters", params={"exclude_own_account": True})
    assert resp.status_code == 200
    ids = [c["id"] for c in resp.json()]
    assert character.id in ids
    assert character2.id in ids


@pytest.mark.asyncio
async def test_list_characters_limit_offset(
    client: AsyncClient, character: Character, character2: Character
):
    resp_all = await client.get("/characters", params={"limit": 50, "offset": 0})
    assert resp_all.status_code == 200
    all_ids = [c["id"] for c in resp_all.json()]

    total = len(all_ids)
    resp_empty = await client.get("/characters", params={"limit": 50, "offset": total})
    assert resp_empty.status_code == 200
    assert resp_empty.json() == []


@pytest.mark.asyncio
async def test_get_character_includes_stats_fields(
    client: AsyncClient, character2: Character
):
    resp = await client.get(f"/characters/{character2.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["score"] == 500
    assert data["level"] == 5
    assert data["all_time_score"] == 500


@pytest.mark.asyncio
async def test_get_character_no_account_id_in_response(
    client: AsyncClient, character: Character
):
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
    from models.faction import FactionStatus

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
    # Not in EraConfig, so only reachability is asserted.
    assert resp.status_code in (200, 403, 404, 422)


@pytest.mark.asyncio
async def test_second_character_blocked_below_level4(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    era: Era,
    some_faction: Faction,
    auth_headers: dict,
):
    """R.7."""
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
    detail = resp.json()["detail"]
    assert detail["code"] == ErrorCode.second_character_level_too_low.value
    assert "4" in detail["message"]


@pytest.mark.asyncio
async def test_second_character_allowed_at_level5(
    client: AsyncClient,
    db_session: AsyncSession,
    account2: Account,
    era: Era,
    some_faction: Faction,
    auth_headers2: dict,
):
    """R.7."""
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
    some_faction: Faction,
    auth_headers: dict,
):
    """ADR-0019: Albescent is join-in-the-field only."""
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
    some_faction: Faction,
    auth_headers: dict,
):
    resp = await client.post(
        "/characters",
        json={"display_name": "Hopeful", "faction_slug": DEFAULT_FACTION_SLUG},
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
    some_faction: Faction,
    auth_headers: dict,
):
    """Invitations are account-pooled."""
    from models.invitation_letter import InvitationLetter

    # Level 4 clears the second-character gate.
    stats = await db_session.scalar(
        select(CharacterStats).where(CharacterStats.character_id == character.id)
    )
    stats.level = 4
    db_session.add(
        InvitationLetter(
            character_id=character.id,
            faction_slug=DEFAULT_FACTION_SLUG,
            era_id=era.id,
        )
    )
    await db_session.commit()

    resp = await client.post(
        "/characters",
        json={"display_name": "Invited One", "faction_slug": DEFAULT_FACTION_SLUG},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["faction_slug"] == DEFAULT_FACTION_SLUG


@pytest.mark.asyncio
async def test_defected_faction_stays_a_birth_option_but_not_a_rejoin(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    some_faction: Faction,
    auth_headers: dict,
):
    """#2385: the defection burn is per-character; account invitations survive it."""
    from models.invitation_letter import InvitationLetter

    stats = await db_session.scalar(
        select(CharacterStats).where(CharacterStats.character_id == character.id)
    )
    stats.level = CURRENT_ERA.second_character_level_required
    db_session.add(
        InvitationLetter(
            character_id=character.id,
            faction_slug=DEFAULT_FACTION_SLUG,
            era_id=era.id,
        )
    )
    db_session.add(
        InvitationLetter(
            character_id=character.id, faction_slug=OTHER_FACTION_SLUG, era_id=era.id
        )
    )
    await db_session.commit()

    # #2218 deletes the UA letter here.
    resp = await client.post(
        "/factions/choose",
        json={"faction_slug": OTHER_FACTION_SLUG},
        headers=auth_headers,
    )
    assert resp.status_code == 200

    resp = await client.post(
        "/factions/choose",
        json={"faction_slug": DEFAULT_FACTION_SLUG},
        headers=auth_headers,
    )
    assert resp.status_code == 403
    assert resp.json()["detail"]["code"] == ErrorCode.faction_rejoin_forbidden.value

    resp = await client.post(
        "/characters",
        json={"display_name": "Second Life", "faction_slug": DEFAULT_FACTION_SLUG},
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["faction_slug"] == DEFAULT_FACTION_SLUG


@pytest.mark.asyncio
async def test_username_derived_from_display_name(
    client: AsyncClient,
    account: Account,
    era: Era,
    some_faction: Faction,
    auth_headers: dict,
):
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
    some_faction: Faction,
    auth_headers: dict,
):
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
    resp = await client.post("/characters", json={"display_name": "   "}, headers=auth_headers)
    assert resp.status_code in (400, 422)


def _make_jpeg_bytes(width: int = 100, height: int = 100) -> bytes:
    import io as _io

    from PIL import Image

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
    from config import settings as _settings

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
    """#1565. Route-level: unit tests pass ``previous_avatar_url`` themselves."""
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
    """Identity-based guard (ADR-0025): a nonexistent id is 403, not 404."""
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
    resp = await client.post(
        f"/characters/{character.id}/avatar",
        files={"file": ("data.txt", b"not an image", "text/plain")},
        headers=auth_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_upload_avatar_unauthenticated(client: AsyncClient, character: Character):
    jpeg_bytes = _make_jpeg_bytes()
    resp = await client.post(
        f"/characters/{character.id}/avatar",
        files={"file": ("avatar.jpg", jpeg_bytes, "image/jpeg")},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_delete_character_wrong_owner(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers2: dict,
):
    resp = await client.delete(f"/characters/{character.id}", headers=auth_headers2)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_delete_character_erases_the_avatar_file_and_the_column(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
    tmp_path,
    monkeypatch,
):
    """#1568. Route-level: an admin ban reaches the same status but keeps the file."""
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
    """Praxis media is shared history others voted on (#1568)."""
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
    """A pasted URL must not be unlinked; see ``resolve_stored_media_path``."""
    from config import settings as _settings

    monkeypatch.setattr(_settings, "MEDIA_ROOT", str(tmp_path))
    character.avatar_url = "https://example.com/photo.jpg"
    await db_session.flush()

    resp = await client.delete(f"/characters/{character.id}", headers=auth_headers)

    assert resp.status_code == 204
    await db_session.refresh(character)
    assert character.avatar_url == ""


@pytest.mark.asyncio
async def test_character_relationships_endpoint_is_gone(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
):
    """Leaked the social graph to anonymous callers; pin 404, not "requires auth"."""
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
    db_session: AsyncSession, account: Account, era: Era, some_faction: Faction
):
    """Guards the column default itself (#697, ADR-0019)."""
    bare = Character(
        account_id=account.id,
        username="defaultfaction",
        display_name="Default Faction",
    )
    db_session.add(bare)
    await db_session.commit()
    await db_session.refresh(bare)

    assert bare.faction_slug == "na"


# Starting faction is pinned to `na` (ADR-0087); test_era_config covers it.


# tagline (#1628): the 140 cap is a wire contract the profile header layout relies
# on; bio (500) is capped separately.

TAGLINE_MAX = 140


@pytest.mark.asyncio
async def test_create_character_accepts_tagline(
    client: AsyncClient, account: Account, era: Era, some_faction: Faction, auth_headers: dict
):
    resp = await client.post(
        "/characters",
        json={"display_name": "Sloganeer", "tagline": "Slow spells, strong tea."},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["tagline"] == "Slow spells, strong tea."


@pytest.mark.asyncio
async def test_create_character_defaults_tagline_empty(
    client: AsyncClient, account: Account, era: Era, some_faction: Faction, auth_headers: dict
):
    """Never null, never seeded from bio."""
    resp = await client.post(
        "/characters",
        json={"display_name": "No Slogan", "bio": "A long and unstructured paragraph."},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["tagline"] == ""


@pytest.mark.asyncio
async def test_create_character_rejects_overlong_tagline(
    client: AsyncClient, account: Account, era: Era, some_faction: Faction, auth_headers: dict
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
    """An explicit "" clears; omission means unchanged (``exclude_unset``) (#1644)."""
    resp = await client.put(
        f"/characters/{character.id}",
        json={"bio": "Once wrote this down.", "location": "pdx "},
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

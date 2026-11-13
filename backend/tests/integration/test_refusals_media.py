"""Refusals around media, avatars, the voter roster and comment moderation (#3355)."""
import io
import os
from pathlib import Path

import pytest
from httpx import AsyncClient
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from errors import ErrorCode, detail_code
from models.character import Character
from models.comment import Comment
from models.praxis import MediaItem, MediaType, ModerationStatus, Praxis, PraxisStatus
from models.task import Task
from tests.integration.factories import make_admin, make_solo_praxis, make_task


def _jpeg() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (100, 100), color=(128, 64, 32)).save(buffer, format="JPEG")
    return buffer.getvalue()


def _files_under(root: Path) -> list[Path]:
    return [path for path in root.rglob("*") if path.is_file()]


# Row 6 - media of a different praxis


@pytest.mark.asyncio
async def test_cannot_delete_media_through_a_different_praxis(
    client: AsyncClient,
    praxis_solo: Praxis,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
    tmp_path,
    monkeypatch,
):
    monkeypatch.setattr(settings, "MEDIA_ROOT", str(tmp_path))
    other_task = await make_task(db_session, character, title="second task")
    other_praxis = await make_solo_praxis(
        db_session, other_task, character, status=PraxisStatus.in_progress
    )
    praxis_solo.status = PraxisStatus.in_progress
    relative_path = os.path.join(str(character.id), str(other_praxis.id), "x", "proof.jpg")
    (tmp_path / relative_path).parent.mkdir(parents=True)
    (tmp_path / relative_path).write_bytes(_jpeg())
    media_item = MediaItem(
        praxis_id=other_praxis.id,
        type=MediaType.image,
        file_path=relative_path,
        display_order=0,
    )
    db_session.add(media_item)
    await db_session.commit()

    resp = await client.delete(
        f"/praxes/{praxis_solo.id}/media/{media_item.id}", headers=auth_headers
    )

    assert resp.status_code == 404
    assert detail_code(resp.json()["detail"]) == ErrorCode.media_item_not_found.value
    assert await db_session.get(MediaItem, media_item.id) is not None
    assert (tmp_path / relative_path).is_file()


# Row 8 - voter roster


@pytest.mark.asyncio
async def test_voter_roster_shape(
    client: AsyncClient, praxis_solo: Praxis, character2: Character, vote
):
    resp = await client.get(f"/praxes/{praxis_solo.id}/voters")

    assert resp.status_code == 200
    assert resp.json() == [
        {
            "character_id": character2.id,
            "display_name": character2.display_name,
            "avatar_url": character2.avatar_url,
            "faction_slug": character2.faction_slug,
            "value": vote.value,
        }
    ]


@pytest.mark.asyncio
async def test_voter_roster_is_404_for_anyone_who_may_not_see_the_praxis(
    client: AsyncClient,
    praxis_solo: Praxis,
    character3: Character,
    auth_headers3: dict,
    vote,
    db_session: AsyncSession,
):
    missing = await client.get("/praxes/999999/voters")

    praxis_solo.moderation_status = ModerationStatus.hidden
    await db_session.commit()
    hidden_anon = await client.get(f"/praxes/{praxis_solo.id}/voters")
    hidden_other = await client.get(
        f"/praxes/{praxis_solo.id}/voters", headers=auth_headers3
    )

    praxis_solo.moderation_status = ModerationStatus.visible
    praxis_solo.status = PraxisStatus.in_progress
    await db_session.commit()
    draft_non_member = await client.get(
        f"/praxes/{praxis_solo.id}/voters", headers=auth_headers3
    )

    assert [
        missing.status_code,
        hidden_anon.status_code,
        hidden_other.status_code,
        draft_non_member.status_code,
    ] == [404] * 4
    assert hidden_other.json() == missing.json()


# Row 12 - comment moderation


@pytest.fixture
async def comment_on_praxis(
    db_session: AsyncSession, praxis_solo: Praxis, character2: Character
) -> Comment:
    comment = Comment(
        praxis_id=praxis_solo.id, created_by_id=character2.id, body_text="nice work"
    )
    db_session.add(comment)
    await db_session.commit()
    return comment


@pytest.mark.asyncio
async def test_admin_deleted_comment_leaves_the_public_read(
    client: AsyncClient,
    praxis_solo: Praxis,
    comment_on_praxis: Comment,
    account,
    auth_headers: dict,
    db_session: AsyncSession,
):
    await make_admin(db_session, account)
    path = f"/praxes/{praxis_solo.id}/comments"
    assert [c["id"] for c in (await client.get(path)).json()] == [comment_on_praxis.id]

    resp = await client.patch(
        f"/admin/comments/{comment_on_praxis.id}/moderate",
        json={"status": "deleted"},
        headers=auth_headers,
    )

    assert resp.status_code == 200
    assert (await client.get(path)).json() == []


@pytest.mark.asyncio
async def test_non_admin_cannot_moderate_a_comment(
    client: AsyncClient,
    praxis_solo: Praxis,
    comment_on_praxis: Comment,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    resp = await client.patch(
        f"/admin/comments/{comment_on_praxis.id}/moderate",
        json={"status": "deleted"},
        headers=auth_headers2,
    )

    assert resp.status_code == 403
    await db_session.refresh(comment_on_praxis)
    assert comment_on_praxis.moderation_status == ModerationStatus.visible


# Row 14 - avatars


@pytest.mark.asyncio
async def test_cannot_upload_an_avatar_for_another_character(
    client: AsyncClient,
    character: Character,
    character2: Character,
    auth_headers2: dict,
    db_session: AsyncSession,
    tmp_path,
    monkeypatch,
):
    monkeypatch.setattr(settings, "MEDIA_ROOT", str(tmp_path))
    avatar_before = character.avatar_url

    resp = await client.post(
        f"/characters/{character.id}/avatar",
        files={"file": ("avatar.jpg", _jpeg(), "image/jpeg")},
        headers=auth_headers2,
    )

    assert resp.status_code == 403
    await db_session.refresh(character)
    assert character.avatar_url == avatar_before
    assert _files_under(tmp_path) == []


@pytest.mark.asyncio
async def test_oversized_avatar_is_refused_and_nothing_is_saved(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    db_session: AsyncSession,
    tmp_path,
    monkeypatch,
):
    monkeypatch.setattr(settings, "MEDIA_ROOT", str(tmp_path))
    avatar_before = character.avatar_url
    monkeypatch.setattr("services.media.AVATAR_MAX_BYTES", 10)

    resp = await client.post(
        f"/characters/{character.id}/avatar",
        files={"file": ("avatar.jpg", _jpeg(), "image/jpeg")},
        headers=auth_headers,
    )

    assert resp.status_code == 413
    assert detail_code(resp.json()["detail"]) == ErrorCode.avatar_too_large.value
    await db_session.refresh(character)
    assert character.avatar_url == avatar_before
    assert _files_under(tmp_path) == []

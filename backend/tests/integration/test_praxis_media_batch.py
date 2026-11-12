"""POST /praxes/{id}/media/batch: partial success, per-file outcomes, always 201
(#1298).
"""

import io
import os

import pytest
from httpx import AsyncClient
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.praxis import MediaItem
from models.task import Task
from services import collab_consensus
from services import media as media_service


def _jpeg_bytes(width: int = 32, height: int = 32) -> bytes:
    image = Image.new("RGB", (width, height), color=(10, 120, 200))
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG")
    return buffer.getvalue()


def _image_part(name: str) -> tuple[str, tuple[str, bytes, str]]:
    return ("files", (name, _jpeg_bytes(), "image/jpeg"))


def _pdf_part(name: str) -> tuple[str, tuple[str, bytes, str]]:
    return ("files", (name, b"%PDF-1.4 not really a pdf", "application/pdf"))


@pytest.fixture(autouse=True)
def media_root(tmp_path, monkeypatch):
    monkeypatch.setattr(media_service.settings, "MEDIA_ROOT", str(tmp_path))
    return tmp_path


async def _in_progress_solo(client: AsyncClient, task: Task, headers: dict) -> int:
    response = await client.post(
        "/praxes",
        json={"task_id": task.id, "type": "solo", "title": "Batch", "body_text": "proof"},
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


@pytest.mark.asyncio
async def test_batch_upload_all_succeed_in_request_order(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    media_root,
):
    praxis_id = await _in_progress_solo(client, active_task, auth_headers)

    response = await client.post(
        f"/praxes/{praxis_id}/media/batch",
        files=[_image_part("first.jpg"), _image_part("second.jpg"), _image_part("third.jpg")],
        headers=auth_headers,
    )

    assert response.status_code == 201, response.text
    results = response.json()
    assert [entry["filename"] for entry in results] == ["first.jpg", "second.jpg", "third.jpg"]
    assert all(entry["error"] is None for entry in results)
    assert [entry["media_item"]["display_order"] for entry in results] == [0, 1, 2]
    for entry in results:
        assert entry["media_item"]["praxis_id"] == praxis_id
        assert os.path.isfile(os.path.join(str(media_root), entry["media_item"]["file_path"]))


@pytest.mark.asyncio
async def test_batch_upload_appends_after_existing_media(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    praxis_id = await _in_progress_solo(client, active_task, auth_headers)

    await client.post(
        f"/praxes/{praxis_id}/media/batch",
        files=[_image_part("a.jpg"), _image_part("b.jpg")],
        headers=auth_headers,
    )
    response = await client.post(
        f"/praxes/{praxis_id}/media/batch",
        files=[_image_part("c.jpg")],
        headers=auth_headers,
    )

    assert response.status_code == 201, response.text
    assert response.json()[0]["media_item"]["display_order"] == 2


@pytest.mark.asyncio
async def test_one_bad_file_fails_only_itself(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    media_root,
):
    praxis_id = await _in_progress_solo(client, active_task, auth_headers)

    response = await client.post(
        f"/praxes/{praxis_id}/media/batch",
        files=[_image_part("good.jpg"), _pdf_part("resume.pdf"), _image_part("also-good.jpg")],
        headers=auth_headers,
    )

    assert response.status_code == 201, response.text
    results = response.json()
    assert [entry["filename"] for entry in results] == ["good.jpg", "resume.pdf", "also-good.jpg"]
    assert results[0]["media_item"] is not None
    assert results[2]["media_item"] is not None

    failed = results[1]
    assert failed["media_item"] is None
    assert failed["status_code"] == 422
    # Exact prose: a stringified `{code, message}` dict is also truthy (#1401).
    assert failed["error"] == "Unsupported media type."

    detail = await client.get(f"/praxes/{praxis_id}", headers=auth_headers)
    assert len(detail.json()["media_items"]) == 2
    assert not os.path.isfile(os.path.join(str(media_root), str(character.id), str(praxis_id), "resume.pdf"))


@pytest.mark.asyncio
async def test_every_file_fails_still_returns_entries(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
):
    praxis_id = await _in_progress_solo(client, active_task, auth_headers)

    response = await client.post(
        f"/praxes/{praxis_id}/media/batch",
        files=[_pdf_part("one.pdf"), _pdf_part("two.pdf")],
        headers=auth_headers,
    )

    assert response.status_code == 201, response.text
    results = response.json()
    assert [entry["filename"] for entry in results] == ["one.pdf", "two.pdf"]
    assert all(entry["media_item"] is None for entry in results)
    assert all(entry["status_code"] == 422 for entry in results)

    detail = await client.get(f"/praxes/{praxis_id}", headers=auth_headers)
    assert detail.json()["media_items"] == []


@pytest.mark.asyncio
async def test_oversized_file_fails_only_itself(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    monkeypatch,
):
    tiny = _jpeg_bytes()
    monkeypatch.setattr(media_service, "MEDIA_MAX_BYTES", len(tiny))
    praxis_id = await _in_progress_solo(client, active_task, auth_headers)

    response = await client.post(
        f"/praxes/{praxis_id}/media/batch",
        files=[
            ("files", ("huge.jpg", b"\xff" * (len(tiny) + 1), "image/jpeg")),
            ("files", ("tiny.jpg", tiny, "image/jpeg")),
        ],
        headers=auth_headers,
    )

    assert response.status_code == 201, response.text
    results = response.json()
    assert results[0]["status_code"] == 413
    assert results[0]["media_item"] is None
    assert results[1]["media_item"] is not None


@pytest.mark.asyncio
async def test_non_member_gets_403_before_any_file_is_processed(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    media_root,
):
    praxis_id = await _in_progress_solo(client, active_task, auth_headers)

    response = await client.post(
        f"/praxes/{praxis_id}/media/batch",
        files=[_image_part("sneaky.jpg")],
        headers=auth_headers2,
    )

    assert response.status_code == 403
    assert os.listdir(str(media_root)) == []


@pytest.mark.asyncio
async def test_unknown_praxis_gets_404_before_any_file_is_processed(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    media_root,
):
    response = await client.post(
        "/praxes/999999/media/batch",
        files=[_image_part("orphan.jpg")],
        headers=auth_headers,
    )

    assert response.status_code == 404
    assert os.listdir(str(media_root)) == []


@pytest.mark.asyncio
async def test_pending_publish_cancelled_once_per_batch(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    monkeypatch,
):
    """ADR-0012: one edit per batch, not per file."""
    praxis_id = await _in_progress_solo(client, active_task, auth_headers)
    calls: list[int] = []
    original = collab_consensus.on_member_edit

    async def _spy(praxis, session, *args, **kwargs):
        calls.append(praxis.id)
        return await original(praxis, session, *args, **kwargs)

    monkeypatch.setattr(collab_consensus, "on_member_edit", _spy)

    response = await client.post(
        f"/praxes/{praxis_id}/media/batch",
        files=[_image_part("a.jpg"), _image_part("b.jpg"), _image_part("c.jpg")],
        headers=auth_headers,
    )

    assert response.status_code == 201, response.text
    assert calls == [praxis_id]


@pytest.mark.asyncio
async def test_pending_publish_not_cancelled_when_every_file_fails(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    monkeypatch,
):
    praxis_id = await _in_progress_solo(client, active_task, auth_headers)
    calls: list[int] = []

    async def _spy(praxis, session, *args, **kwargs):
        calls.append(praxis.id)

    monkeypatch.setattr(collab_consensus, "on_member_edit", _spy)

    response = await client.post(
        f"/praxes/{praxis_id}/media/batch",
        files=[_pdf_part("one.pdf"), _pdf_part("two.pdf")],
        headers=auth_headers,
    )

    assert response.status_code == 201, response.text
    assert calls == []


@pytest.mark.asyncio
async def test_collab_batch_cancels_pending_publish_for_real(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    db_session: AsyncSession,
):
    """ADR-0012 without a spy."""
    # character2 creates: collabs need level 1; `character` is level 0.
    create = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "C", "body_text": "proof"},
        headers=auth_headers2,
    )
    assert create.status_code == 201, create.text
    praxis_id = create.json()["id"]
    invite = await client.post(
        f"/praxes/{praxis_id}/invite",
        json={"invitee_id": character.id},
        headers=auth_headers2,
    )
    assert invite.status_code in (200, 201), invite.text
    accept = await client.post(
        f"/praxes/{praxis_id}/invite/{invite.json()['id']}/respond",
        json={"accept": True},
        headers=auth_headers,
    )
    assert accept.status_code in (200, 201), accept.text
    submit = await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)
    assert submit.status_code == 200, submit.text
    assert submit.json()["submit_proposed_at"] is not None

    response = await client.post(
        f"/praxes/{praxis_id}/media/batch",
        files=[_image_part("late-proof.jpg")],
        headers=auth_headers,
    )
    assert response.status_code == 201, response.text

    detail = await client.get(f"/praxes/{praxis_id}", headers=auth_headers)
    assert detail.json()["submit_proposed_at"] is None
    assert detail.json()["status"] == "in_progress"


@pytest.mark.asyncio
async def test_same_named_files_in_one_batch_keep_their_own_bytes(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    media_root,
):
    """#1336: reads bytes back; distinct paths alone could share a clobbered file."""
    praxis_id = await _in_progress_solo(client, active_task, auth_headers)
    first_bytes = _jpeg_bytes(32, 32)
    second_bytes = _jpeg_bytes(64, 48)
    assert first_bytes != second_bytes

    response = await client.post(
        f"/praxes/{praxis_id}/media/batch",
        files=[
            ("files", ("proof.jpg", first_bytes, "image/jpeg")),
            ("files", ("proof.jpg", second_bytes, "image/jpeg")),
        ],
        headers=auth_headers,
    )

    assert response.status_code == 201, response.text
    results = response.json()
    assert [entry["error"] for entry in results] == [None, None]
    assert [entry["filename"] for entry in results] == ["proof.jpg", "proof.jpg"]

    paths = [entry["media_item"]["file_path"] for entry in results]
    assert paths[0] != paths[1]
    # Uniqueness comes from the directory, not the basename.
    assert [os.path.basename(path) for path in paths] == ["proof.jpg", "proof.jpg"]
    for path, expected in zip(paths, (first_bytes, second_bytes)):
        with open(os.path.join(str(media_root), path), "rb") as handle:
            assert handle.read() == expected

    detail = await client.get(f"/praxes/{praxis_id}", headers=auth_headers)
    assert len(detail.json()["media_items"]) == 2


@pytest.mark.asyncio
async def test_deleting_one_same_named_file_leaves_the_other_readable(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    media_root,
):
    """#1336."""
    praxis_id = await _in_progress_solo(client, active_task, auth_headers)
    second_bytes = _jpeg_bytes(64, 48)

    upload = await client.post(
        f"/praxes/{praxis_id}/media/batch",
        files=[
            ("files", ("proof.jpg", _jpeg_bytes(32, 32), "image/jpeg")),
            ("files", ("proof.jpg", second_bytes, "image/jpeg")),
        ],
        headers=auth_headers,
    )
    assert upload.status_code == 201, upload.text
    first_item, second_item = (entry["media_item"] for entry in upload.json())

    deletion = await client.delete(
        f"/praxes/{praxis_id}/media/{first_item['id']}", headers=auth_headers
    )
    assert deletion.status_code == 204, deletion.text

    survivor = os.path.join(str(media_root), second_item["file_path"])
    with open(survivor, "rb") as handle:
        assert handle.read() == second_bytes
    assert not os.path.exists(os.path.join(str(media_root), first_item["file_path"]))


@pytest.mark.asyncio
async def test_deleting_media_with_unresolvable_path_is_a_noop_not_a_500(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    db_session: AsyncSession,
    media_root,
):
    """#2876: a None from `resolve_stored_media_path` must not reach
    ``os.path.dirname`` (TypeError escapes ``except OSError``)."""
    praxis_id = await _in_progress_solo(client, active_task, auth_headers)

    upload = await client.post(
        f"/praxes/{praxis_id}/media/batch",
        files=[_image_part("proof.jpg")],
        headers=auth_headers,
    )
    assert upload.status_code == 201, upload.text
    item = upload.json()[0]["media_item"]

    # A `..` escape, as an import or admin edit could write.
    media_item = await db_session.get(MediaItem, item["id"])
    media_item.file_path = "../outside.jpg"
    await db_session.commit()

    deletion = await client.delete(
        f"/praxes/{praxis_id}/media/{item['id']}", headers=auth_headers
    )
    assert deletion.status_code == 204, deletion.text

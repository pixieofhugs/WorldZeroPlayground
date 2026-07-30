"""POST /praxes/{id}/media/batch — N files in one request, per-file outcomes (#1298).

Seam under test: the HTTP route plus the service loop behind it. The batch is
*partial success* by design — a rejected file must fail only itself — so every
assertion here is about the shape and order of the per-file result array, not
about the response status, which is always 201 ("the request was processed").

The single-file ``POST /praxes/{id}/media`` route is unchanged and still used by
the crop/rotate path (#514); it is not exercised here.
"""

import io
import os

import pytest
from httpx import AsyncClient
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.task import Task
from services import media as media_service
from services import praxis as praxis_service


def _jpeg_bytes(width: int = 32, height: int = 32) -> bytes:
    image = Image.new("RGB", (width, height), color=(10, 120, 200))
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG")
    return buffer.getvalue()


def _image_part(name: str) -> tuple[str, tuple[str, bytes, str]]:
    return ("files", (name, _jpeg_bytes(), "image/jpeg"))


def _pdf_part(name: str) -> tuple[str, tuple[str, bytes, str]]:
    """An unsupported MIME type — rejected by ``_detect_media_type`` with a 422."""
    return ("files", (name, b"%PDF-1.4 not really a pdf", "application/pdf"))


@pytest.fixture(autouse=True)
def media_root(tmp_path, monkeypatch):
    """Point the media pipeline at a throwaway directory for every test here."""
    monkeypatch.setattr(media_service.settings, "MEDIA_ROOT", str(tmp_path))
    return tmp_path


async def _in_progress_solo(client: AsyncClient, task: Task, headers: dict) -> int:
    """Create an in-progress solo praxis and return its id."""
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
    """Three good files land, in request order, with ascending display_order."""
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
    """A second batch continues the display_order run instead of restarting at 0."""
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
    """An unsupported file in the middle of the batch does not sink its neighbours."""
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
    assert failed["error"]

    # The two survivors persisted; the reject wrote nothing.
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
    """A wholly-rejected batch is still a processed request: 201 with all-error entries."""
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
    """The per-file byte cap is a per-file verdict (413), not a batch verdict."""
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
    """A non-member gets the single-file route's 403 and nothing touches disk."""
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
    """ADR-0012: the shared document is edited once by a batch, not once per file."""
    praxis_id = await _in_progress_solo(client, active_task, auth_headers)
    calls: list[int] = []
    original = praxis_service.cancel_pending_publish_on_edit

    async def _spy(praxis, session, era=None, **kwargs):
        calls.append(praxis.id)
        if era is None:
            return await original(praxis, session)
        return await original(praxis, session, era)

    monkeypatch.setattr(praxis_service, "cancel_pending_publish_on_edit", _spy)

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
    """Nothing landed, so nothing was edited — the window must not be touched."""
    praxis_id = await _in_progress_solo(client, active_task, auth_headers)
    calls: list[int] = []

    async def _spy(praxis, session, era=None, **kwargs):
        calls.append(praxis.id)

    monkeypatch.setattr(praxis_service, "cancel_pending_publish_on_edit", _spy)

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
    """End-to-end ADR-0012 check with no spy: a batch reopens a pending collab."""
    # character2 creates — collabs need level 1 and `character` starts at level 0.
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

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
    # Exact prose, not just truthiness (#1401). `error` flattens an
    # `HTTPException` whose `detail` is now a `{code, message}` object, and a
    # truthiness check passes just as happily on a stringified dict — which is
    # what the player would have read.
    assert failed["error"] == "Unsupported media type."

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
    """Nothing landed, so nothing was edited — the window must not be touched."""
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


@pytest.mark.asyncio
async def test_same_named_files_in_one_batch_keep_their_own_bytes(
    client: AsyncClient,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    media_root,
):
    """Two files called ``proof.jpg`` both survive, each with its own bytes (#1336).

    Distinct paths alone would not prove the fix — the bug was two rows over
    one clobbered file — so this reads back what each row actually points at.
    """
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
    # The client-supplied name is still what the composer is told about.
    assert [entry["filename"] for entry in results] == ["proof.jpg", "proof.jpg"]

    paths = [entry["media_item"]["file_path"] for entry in results]
    assert paths[0] != paths[1]
    # The player-visible basename survives — the uniqueness is a directory.
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
    """Removing one attachment must not 404 its same-named sibling (#1336)."""
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
    """#2876: `resolve_stored_media_path` returning None must stay a no-op.

    Before the fix, the second cleanup step called
    ``os.rmdir(os.path.dirname(abs_path))`` unconditionally — with
    ``abs_path is None`` that is ``os.path.dirname(None)``, a ``TypeError``
    the surrounding ``except OSError`` does not catch, turning a delete of a
    media item this process doesn't own into a 500 instead of the intended
    no-op.
    """
    praxis_id = await _in_progress_solo(client, active_task, auth_headers)

    upload = await client.post(
        f"/praxes/{praxis_id}/media/batch",
        files=[_image_part("proof.jpg")],
        headers=auth_headers,
    )
    assert upload.status_code == 201, upload.text
    item = upload.json()[0]["media_item"]

    # Force the stored column into something `resolve_stored_media_path`
    # refuses to resolve (a `..` escape) -- the same shape as a row an import
    # or admin editor wrote, which the gate's own docstring calls out as the
    # reason this predicate exists.
    media_item = await db_session.get(MediaItem, item["id"])
    media_item.file_path = "../outside.jpg"
    await db_session.commit()

    deletion = await client.delete(
        f"/praxes/{praxis_id}/media/{item['id']}", headers=auth_headers
    )
    assert deletion.status_code == 204, deletion.text

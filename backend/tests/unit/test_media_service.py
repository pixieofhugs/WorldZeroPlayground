"""Unit tests for the PIL / filename / MIME pipeline in services.media.

Exercises ``process_and_save_avatar`` directly (no HTTP client, no DB) to
verify the three things the routers used to own inline:
  1. Oversized images are downscaled to AVATAR_MAX_SIZE on the long side.
  2. Non-image uploads are rejected with a 422.
  3. The filename sanitizer strips path components and unsafe characters.
"""

import io
import os

import pytest
from fastapi import HTTPException, UploadFile
from PIL import Image

from services import media
from services.media import (
    AVATAR_MAX_SIZE,
    _sanitize_filename,
    process_and_save_avatar,
)


def _jpeg_bytes(width: int, height: int) -> bytes:
    """Return a valid JPEG of the given dimensions as bytes."""
    image = Image.new("RGB", (width, height), color=(200, 100, 50))
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG")
    return buffer.getvalue()


def _make_upload(filename: str, content: bytes, content_type: str) -> UploadFile:
    """Wrap bytes in an UploadFile matching the FastAPI starlette shape."""
    upload = UploadFile(
        filename=filename,
        file=io.BytesIO(content),
        headers={"content-type": content_type},
    )
    return upload


@pytest.mark.asyncio
async def test_oversized_avatar_is_resized(tmp_path, monkeypatch):
    """An image larger than AVATAR_MAX_SIZE on either side is downscaled."""
    monkeypatch.setattr(media.settings, "MEDIA_ROOT", str(tmp_path))
    upload = _make_upload(
        "big.jpg", _jpeg_bytes(2048, 1024), "image/jpeg"
    )

    relative_path = await process_and_save_avatar(upload, character_id=42)

    absolute_path = os.path.join(str(tmp_path), relative_path)
    assert os.path.isfile(absolute_path)
    with Image.open(absolute_path) as saved:
        assert max(saved.size) <= AVATAR_MAX_SIZE
        # The long edge lands on the cap; the short edge scales proportionally.
        assert saved.size[0] == AVATAR_MAX_SIZE
        assert saved.size[1] == AVATAR_MAX_SIZE // 2


@pytest.mark.asyncio
async def test_non_image_rejected(tmp_path, monkeypatch):
    """A text/plain upload raises HTTPException(422) before touching disk."""
    monkeypatch.setattr(media.settings, "MEDIA_ROOT", str(tmp_path))
    upload = _make_upload("resume.txt", b"plain text file", "text/plain")

    with pytest.raises(HTTPException) as exc_info:
        await process_and_save_avatar(upload, character_id=7)

    assert exc_info.value.status_code == 422
    # Nothing should have been written under the char directory.
    assert os.listdir(tmp_path) == []


@pytest.mark.asyncio
async def test_reuploaded_avatar_gets_a_new_path_and_drops_the_old_file(
    tmp_path, monkeypatch
):
    """A re-upload must change the URL and leave no orphan (#1565).

    The stale-avatar bug was a deterministic path: new bytes at the same URL,
    which mobile browsers happily served from cache. Distinct paths alone would
    not prove the fix is complete — an unlinked-nothing version orphans a file
    per upload — so this asserts both halves.
    """
    monkeypatch.setattr(media.settings, "MEDIA_ROOT", str(tmp_path))

    first_path = await process_and_save_avatar(
        _make_upload("selfie.jpg", _jpeg_bytes(64, 64), "image/jpeg"),
        character_id=42,
    )
    second_path = await process_and_save_avatar(
        _make_upload("selfie.jpg", _jpeg_bytes(64, 64), "image/jpeg"),
        character_id=42,
        previous_avatar_url=first_path,
    )

    assert first_path != second_path
    assert not os.path.isabs(second_path)
    assert not os.path.exists(os.path.join(str(tmp_path), first_path))
    assert os.path.isfile(os.path.join(str(tmp_path), second_path))
    # The replaced upload's directory goes with it; the character's avatar
    # directory stays, because the new upload lives under it.
    assert not os.path.exists(os.path.dirname(os.path.join(str(tmp_path), first_path)))
    assert os.path.isdir(os.path.join(str(tmp_path), "42", "avatar"))


@pytest.mark.asyncio
async def test_legacy_deterministic_avatar_is_replaced_in_place(tmp_path, monkeypatch):
    """Characters uploaded before #1565 sit at ``<id>/avatar/avatar.jpg``.

    That legacy file must be unlinked without taking the shared ``avatar``
    directory — which now holds the replacement — down with it.
    """
    monkeypatch.setattr(media.settings, "MEDIA_ROOT", str(tmp_path))
    legacy_relative = os.path.join("42", "avatar", "avatar.jpg")
    legacy_absolute = os.path.join(str(tmp_path), legacy_relative)
    os.makedirs(os.path.dirname(legacy_absolute), exist_ok=True)
    with open(legacy_absolute, "wb") as handle:
        handle.write(b"OLD-AVATAR-BYTES")

    new_path = await process_and_save_avatar(
        _make_upload("selfie.jpg", _jpeg_bytes(64, 64), "image/jpeg"),
        character_id=42,
        previous_avatar_url=legacy_relative,
    )

    assert not os.path.exists(legacy_absolute)
    assert os.path.isfile(os.path.join(str(tmp_path), new_path))


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "previous",
    ["", "https://example.com/photo.jpg", "http://example.com/photo.jpg"],
)
async def test_avatar_upload_never_unlinks_a_value_it_did_not_write(
    tmp_path, monkeypatch, previous
):
    """``avatar_url`` may be a pasted remote URL, not a path we own.

    ``POST /characters`` and the admin editor both accept one, and the upload
    route's own 500 text suggests it. Superseding such a value must be a no-op
    on disk rather than an error.
    """
    monkeypatch.setattr(media.settings, "MEDIA_ROOT", str(tmp_path))

    new_path = await process_and_save_avatar(
        _make_upload("selfie.jpg", _jpeg_bytes(64, 64), "image/jpeg"),
        character_id=42,
        previous_avatar_url=previous,
    )

    assert os.path.isfile(os.path.join(str(tmp_path), new_path))


def test_superseded_avatar_outside_media_root_is_refused(tmp_path, monkeypatch):
    """A stored path that escapes MEDIA_ROOT is never unlinked."""
    monkeypatch.setattr(media.settings, "MEDIA_ROOT", str(tmp_path / "media"))
    os.makedirs(str(tmp_path / "media"), exist_ok=True)
    outsider = tmp_path / "not-ours.jpg"
    outsider.write_bytes(b"someone else's file")

    media._remove_superseded_avatar(os.path.join("..", "not-ours.jpg"))
    media._remove_superseded_avatar(str(outsider))

    assert outsider.exists()


def test_filename_sanitization_strips_path_and_unsafe_chars():
    """Path components and special characters are replaced; length capped."""
    # Path traversal attempt collapses to a safe basename.
    assert _sanitize_filename("/etc/passwd") == "passwd"
    # os.path.basename is platform-aware, so we only assert the unsafe-char
    # replacement here — the basename behaviour is the OS's problem, not ours.
    assert "/" not in _sanitize_filename("foo/bar/baz.png")

    # Spaces, punctuation, unicode punctuation are replaced with underscores.
    assert _sanitize_filename("my cool video!.mp4") == "my_cool_video_.mp4"
    assert _sanitize_filename("") == "upload"
    assert _sanitize_filename(None or "upload") == "upload"

    # Length cap: anything over 100 chars gets truncated.
    long_name = "a" * 200 + ".jpg"
    sanitized = _sanitize_filename(long_name)
    assert len(sanitized) == 100
    assert sanitized.startswith("a")


@pytest.mark.asyncio
async def test_process_and_save_media_image_writes_and_returns_unattached(tmp_path, monkeypatch):
    """An image upload lands on disk and returns an unattached MediaItem."""
    monkeypatch.setattr(media.settings, "MEDIA_ROOT", str(tmp_path))

    upload = _make_upload("proof.jpg", _jpeg_bytes(64, 64), "image/jpeg")

    media_item = await media.process_and_save_media(
        upload, praxis_id=11, character_id=3, display_order=0
    )

    assert media_item.praxis_id == 11
    assert media_item.display_order == 0
    absolute_path = os.path.join(str(tmp_path), media_item.file_path)
    assert os.path.isfile(absolute_path)


@pytest.mark.asyncio
async def test_same_filename_uploads_keep_their_own_bytes(tmp_path, monkeypatch):
    """Two uploads named the same must not clobber each other (#1336).

    Seam: ``process_and_save_media`` is the single naming seam both the
    single-file and the batch route go through, so the collision is provable
    here without HTTP. Distinct paths alone would not prove it — the bug was
    two rows over one file — so this asserts the *contents* behind each row.
    """
    monkeypatch.setattr(media.settings, "MEDIA_ROOT", str(tmp_path))

    first = await media.process_and_save_media(
        _make_upload("proof.jpg", b"FIRST-UPLOAD-BYTES", "image/jpeg"),
        praxis_id=11,
        character_id=3,
        display_order=0,
    )
    second = await media.process_and_save_media(
        _make_upload("proof.jpg", b"SECOND-UPLOAD-BYTES", "image/jpeg"),
        praxis_id=11,
        character_id=3,
        display_order=1,
    )

    assert first.file_path != second.file_path
    with open(os.path.join(str(tmp_path), first.file_path), "rb") as handle:
        assert handle.read() == b"FIRST-UPLOAD-BYTES"
    with open(os.path.join(str(tmp_path), second.file_path), "rb") as handle:
        assert handle.read() == b"SECOND-UPLOAD-BYTES"


@pytest.mark.asyncio
async def test_stored_path_keeps_the_player_visible_basename(tmp_path, monkeypatch):
    """The composer renders ``file_path.split("/").pop()`` — keep it readable."""
    monkeypatch.setattr(media.settings, "MEDIA_ROOT", str(tmp_path))

    media_item = await media.process_and_save_media(
        _make_upload("my cool video!.mp4", b"video bytes", "video/mp4"),
        praxis_id=11,
        character_id=3,
        display_order=0,
    )

    assert os.path.basename(media_item.file_path) == "my_cool_video_.mp4"


@pytest.mark.asyncio
async def test_stored_path_is_relative_and_stays_under_media_root(tmp_path, monkeypatch):
    """A hostile filename cannot escape MEDIA_ROOT and never lands absolute."""
    monkeypatch.setattr(media.settings, "MEDIA_ROOT", str(tmp_path))

    for hostile in ("../../../../etc/passwd", "..", "/etc/passwd", "nul\x00.jpg"):
        media_item = await media.process_and_save_media(
            _make_upload(hostile, b"bytes", "image/jpeg"),
            praxis_id=11,
            character_id=3,
            display_order=0,
        )
        assert not os.path.isabs(media_item.file_path)
        resolved = os.path.realpath(os.path.join(str(tmp_path), media_item.file_path))
        assert resolved.startswith(os.path.realpath(str(tmp_path)) + os.sep)
        assert os.path.isfile(resolved)


@pytest.mark.asyncio
async def test_process_and_save_media_unsupported_type_rejected(tmp_path, monkeypatch):
    """A non-image/video/audio upload raises 422 and writes nothing."""
    monkeypatch.setattr(media.settings, "MEDIA_ROOT", str(tmp_path))

    upload = _make_upload("doc.pdf", b"%PDF-1.4", "application/pdf")

    with pytest.raises(HTTPException) as exc_info:
        await media.process_and_save_media(
            upload, praxis_id=1, character_id=1, display_order=0
        )
    assert exc_info.value.status_code == 422

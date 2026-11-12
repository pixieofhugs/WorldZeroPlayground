"""Unit tests for the PIL / filename / MIME pipeline in services.media."""

import io
import os

import pytest
from fastapi import HTTPException, UploadFile
from PIL import Image

from models.praxis import MediaType
from services import media
from services.media import (
    AVATAR_MAX_SIZE,
    _sanitize_filename,
    process_and_save_avatar,
)


def _jpeg_bytes(width: int, height: int) -> bytes:
    image = Image.new("RGB", (width, height), color=(200, 100, 50))
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG")
    return buffer.getvalue()


def _make_upload(filename: str, content: bytes, content_type: str) -> UploadFile:
    upload = UploadFile(
        filename=filename,
        file=io.BytesIO(content),
        headers={"content-type": content_type},
    )
    return upload


@pytest.mark.asyncio
async def test_oversized_avatar_is_resized(tmp_path, monkeypatch):
    monkeypatch.setattr(media.settings, "MEDIA_ROOT", str(tmp_path))
    upload = _make_upload(
        "big.jpg", _jpeg_bytes(2048, 1024), "image/jpeg"
    )

    relative_path = await process_and_save_avatar(upload, character_id=42)

    absolute_path = os.path.join(str(tmp_path), relative_path)
    assert os.path.isfile(absolute_path)
    with Image.open(absolute_path) as saved:
        assert max(saved.size) <= AVATAR_MAX_SIZE
        assert saved.size[0] == AVATAR_MAX_SIZE
        assert saved.size[1] == AVATAR_MAX_SIZE // 2


@pytest.mark.asyncio
async def test_non_image_rejected(tmp_path, monkeypatch):
    monkeypatch.setattr(media.settings, "MEDIA_ROOT", str(tmp_path))
    upload = _make_upload("resume.txt", b"plain text file", "text/plain")

    with pytest.raises(HTTPException) as exc_info:
        await process_and_save_avatar(upload, character_id=7)

    assert exc_info.value.status_code == 422
    assert os.listdir(tmp_path) == []


@pytest.mark.asyncio
async def test_reuploaded_avatar_gets_a_new_path_and_drops_the_old_file(
    tmp_path, monkeypatch
):
    """A re-upload must change the URL (mobile caches) and leave no orphan (#1565)."""
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
    assert not os.path.exists(os.path.dirname(os.path.join(str(tmp_path), first_path)))
    assert os.path.isdir(os.path.join(str(tmp_path), "42", "avatar"))


@pytest.mark.asyncio
async def test_legacy_deterministic_avatar_is_replaced_in_place(tmp_path, monkeypatch):
    """Pre-#1565 ``<id>/avatar/avatar.jpg`` goes; the shared ``avatar`` dir stays."""
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
    """``avatar_url`` may be a pasted remote URL; superseding it is a disk no-op."""
    monkeypatch.setattr(media.settings, "MEDIA_ROOT", str(tmp_path))

    new_path = await process_and_save_avatar(
        _make_upload("selfie.jpg", _jpeg_bytes(64, 64), "image/jpeg"),
        character_id=42,
        previous_avatar_url=previous,
    )

    assert os.path.isfile(os.path.join(str(tmp_path), new_path))


def test_superseded_avatar_outside_media_root_is_refused(tmp_path, monkeypatch):
    monkeypatch.setattr(media.settings, "MEDIA_ROOT", str(tmp_path / "media"))
    os.makedirs(str(tmp_path / "media"), exist_ok=True)
    outsider = tmp_path / "not-ours.jpg"
    outsider.write_bytes(b"someone else's file")

    media.delete_stored_avatar(os.path.join("..", "not-ours.jpg"), 42)
    media.delete_stored_avatar(str(outsider), 42)

    assert outsider.exists()


def test_avatar_belonging_to_another_character_is_refused(tmp_path, monkeypatch):
    """Inside MEDIA_ROOT is not enough: ``avatar_url`` is player-writable and
    every path is public, so a player could aim theirs at anyone's file."""
    monkeypatch.setattr(media.settings, "MEDIA_ROOT", str(tmp_path / "media"))
    victim_directory = tmp_path / "media" / "7" / "avatar" / "deadbeef"
    os.makedirs(str(victim_directory), exist_ok=True)
    victim_avatar = victim_directory / "avatar.jpg"
    victim_avatar.write_bytes(b"character 7's avatar")

    media.delete_stored_avatar("7/avatar/deadbeef/avatar.jpg", 42)
    assert victim_avatar.exists()

    media.delete_stored_avatar("7/avatar/deadbeef/avatar.jpg", 7)
    assert not victim_avatar.exists()


def test_uploaded_extension_cannot_make_the_api_serve_active_content():
    """The server picks the extension: ``/media`` is same-origin and Starlette
    guesses Content-Type from the filename, so ``pwn.html`` would execute."""
    assert media._with_safe_extension("pwn.html", MediaType.image) == "pwn.jpg"
    # SVG carries script.
    assert media._with_safe_extension("logo.svg", MediaType.image) == "logo.jpg"
    assert media._with_safe_extension("photo.JPG", MediaType.image) == "photo.JPG"
    assert media._with_safe_extension("clip.mov", MediaType.video) == "clip.mov"
    # The composer renders the stem as the caption.
    assert media._with_safe_extension("holiday.html", MediaType.image) == "holiday.jpg"


# Quarantine (#1593)


def test_quarantine_root_is_a_sibling_of_media_root(tmp_path, monkeypatch):
    """The mount and the orphan sweep both scan *inside* MEDIA_ROOT."""
    root = tmp_path / "media"
    monkeypatch.setattr(media.settings, "MEDIA_ROOT", str(root))

    quarantine = media.quarantine_root()
    assert not quarantine.startswith(os.path.realpath(str(root)) + os.sep)
    assert os.path.dirname(quarantine) == os.path.dirname(os.path.realpath(str(root)))


def test_quarantine_refuses_paths_it_does_not_own(tmp_path, monkeypatch):
    """Else a hide would be a primitive for relocating arbitrary files."""
    root = tmp_path / "media"
    root.mkdir()
    monkeypatch.setattr(media.settings, "MEDIA_ROOT", str(root))

    outsider = tmp_path / "outside.jpg"
    outsider.write_bytes(b"not ours")

    hostile = ["../outside.jpg", str(outsider), "https://example.com/x.jpg", ""]
    assert media.withdraw_media_from_mount(hostile) == 0
    assert media.restore_media_to_mount(hostile) == 0
    assert outsider.is_file()
    assert not os.path.exists(media.quarantine_root())


def test_quarantine_round_trip_is_repeatable(tmp_path, monkeypatch):
    root = tmp_path / "media"
    root.mkdir()
    monkeypatch.setattr(media.settings, "MEDIA_ROOT", str(root))

    relative_path = os.path.join("7", "42", "uuid", "proof.jpg")
    absolute_path = root / relative_path
    absolute_path.parent.mkdir(parents=True)
    absolute_path.write_bytes(b"evidence")

    assert media.withdraw_media_from_mount([relative_path]) == 1
    assert media.withdraw_media_from_mount([relative_path]) == 0  # already gone
    assert not absolute_path.exists()

    assert media.restore_media_to_mount([relative_path]) == 1
    assert media.restore_media_to_mount([relative_path]) == 0  # already back
    assert absolute_path.read_bytes() == b"evidence"

    absolute_path.unlink()
    assert media.withdraw_media_from_mount([relative_path]) == 0
    assert media.restore_media_to_mount([relative_path]) == 0


def test_filename_sanitization_strips_path_and_unsafe_chars():
    assert _sanitize_filename("/etc/passwd") == "passwd"
    # basename is platform-aware; only the unsafe-char replacement is ours.
    assert "/" not in _sanitize_filename("foo/bar/baz.png")

    assert _sanitize_filename("my cool video!.mp4") == "my_cool_video_.mp4"
    assert _sanitize_filename("") == "upload"
    assert _sanitize_filename(None or "upload") == "upload"

    long_name = "a" * 200 + ".jpg"
    sanitized = _sanitize_filename(long_name)
    assert len(sanitized) == 100
    assert sanitized.startswith("a")


@pytest.mark.asyncio
async def test_process_and_save_media_image_writes_and_returns_unattached(tmp_path, monkeypatch):
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
    """#1336: the bug was two rows over one file, so assert the contents."""
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
    monkeypatch.setattr(media.settings, "MEDIA_ROOT", str(tmp_path))

    upload = _make_upload("doc.pdf", b"%PDF-1.4", "application/pdf")

    with pytest.raises(HTTPException) as exc_info:
        await media.process_and_save_media(
            upload, praxis_id=1, character_id=1, display_order=0
        )
    assert exc_info.value.status_code == 422

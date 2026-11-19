"""Media upload pipeline: PIL resize, filename sanitization, filesystem I/O.

Never calls ``session.commit``; routers do.
"""

import asyncio
import io
import logging
import os
import re
import shutil
import subprocess
import tempfile
import uuid
from typing import Iterable

from fastapi import HTTPException, UploadFile
from pillow_heif import register_heif_opener
from PIL import Image, ImageOps, ImageSequence

from config import settings
from errors import ErrorCode, raise_coded
from models.praxis import MediaItem, MediaType


logger = logging.getLogger(__name__)

register_heif_opener()


#: Limits are stated in MB for both prose and catalog ``params`` (#1401).
BYTES_PER_MEGABYTE = 1024 * 1024

AVATAR_MAX_SIZE = 512
AVATAR_JPEG_QUALITY = 85
AVATAR_MAX_MEGABYTES = 10
AVATAR_MAX_BYTES = AVATAR_MAX_MEGABYTES * BYTES_PER_MEGABYTE

MEDIA_MAX_MEGABYTES = 100
MEDIA_MAX_BYTES = MEDIA_MAX_MEGABYTES * BYTES_PER_MEGABYTE
MEDIA_FILENAME_MAX_LEN = 100


FFMPEG_TIMEOUT_SECONDS = 120
#: Output formats we write; anything else Pillow opens (MPO, TIFF, HEIF...) is JPEG.
_OUTPUT_EXTENSIONS = {
    "JPEG": (".jpg", ".jpeg"),
    "PNG": (".png",),
    "GIF": (".gif",),
    "WEBP": (".webp",),
}


def _strip_image(contents: bytes) -> tuple[bytes, str]:
    """Re-encode from clean pixels only; returns (bytes, output format).

    Never saves from the opened file: writers copy tags (TIFF XMP) and
    ``info`` (JPEG/GIF comments) from it, so every frame is copied with ``info``
    emptied. Orientation is applied to the pixels first.
    """
    with Image.open(io.BytesIO(contents)) as source:
        fmt = source.format if source.format in _OUTPUT_EXTENSIONS else "JPEG"
        options: dict = {}
        if icc := source.info.get("icc_profile"):
            options["icc_profile"] = icc
        if fmt != "JPEG" and getattr(source, "n_frames", 1) > 1:
            frames, durations = [], []
            for frame in ImageSequence.Iterator(source):
                durations.append(frame.info.get("duration", 100))
                frames.append(frame.convert("RGBA"))
            options.update(
                save_all=True, append_images=frames[1:], duration=durations,
                loop=source.info.get("loop", 0),
            )
            image = frames[0]
        else:
            image = ImageOps.exif_transpose(source)
        if fmt == "JPEG":
            options["quality"] = 95
            if image.mode not in ("RGB", "L", "CMYK"):
                image = image.convert("RGB")
        for each in [image, *options.get("append_images", [])]:
            each.info = {}
        buffer = io.BytesIO()
        image.save(buffer, format=fmt, **options)
    return buffer.getvalue(), fmt


def _strip_av(contents: bytes, extension: str) -> bytes:
    """Drop container metadata (location atoms, tags) without re-encoding."""
    with tempfile.TemporaryDirectory() as scratch:
        source = os.path.join(scratch, "in" + extension)
        target = os.path.join(scratch, "out" + extension)
        with open(source, "wb") as handle:
            handle.write(contents)
        subprocess.run(
            ["ffmpeg", "-nostdin", "-v", "error", "-i", source,
             "-map", "0:V?", "-map", "0:a?", "-sn", "-dn",
             "-map_metadata", "-1", "-map_chapters", "-1",
             "-c", "copy", target],
            check=True, capture_output=True, timeout=FFMPEG_TIMEOUT_SECONDS,
        )
        with open(target, "rb") as handle:
            return handle.read()


def _sanitize_filename(raw: str) -> str:
    """Strip path components and replace unsafe chars; cap at 100 chars.

    Trust boundary. Separators/NUL become ``_``; ``.``/``..`` survive the class
    and are rejected by name. Lossy on purpose: each upload gets its own
    directory, so collapsed names never collide.
    """
    basename = os.path.basename(raw or "upload")
    cleaned = re.sub(r"[^\w.\-]", "_", basename)[:MEDIA_FILENAME_MAX_LEN]
    if cleaned in ("", ".", ".."):
        return "upload"
    return cleaned


#: Extension allow-list for files ``/media`` serves from the API origin.
#: ``FileResponse`` guesses Content-Type from the filename, so ``pwn.html``
#: declared as ``image/png`` would be served as HTML with the session cookie.
#: No ``.svg``: SVG carries script.
_SAFE_EXTENSIONS: dict[MediaType, frozenset[str]] = {
    MediaType.image: frozenset(
        {".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".heic", ".heif", ".bmp"}
    ),
    MediaType.video: frozenset({".mp4", ".webm", ".mov", ".m4v", ".ogv"}),
    MediaType.audio: frozenset({".mp3", ".m4a", ".aac", ".ogg", ".oga", ".wav", ".flac"}),
}

#: What we fall back to when the player's extension is not on the list above.
_CANONICAL_EXTENSION: dict[MediaType, str] = {
    MediaType.image: ".jpg",
    MediaType.video: ".mp4",
    MediaType.audio: ".mp3",
}


def _with_safe_extension(filename: str, media_type: MediaType) -> str:
    """Force ``filename``'s extension onto the allow-list for ``media_type``.

    Allow-list, not deny-list. The stem is kept: it's the player-visible caption
    and the remove button's accessible name.
    """
    stem, extension = os.path.splitext(filename)
    if extension.lower() in _SAFE_EXTENSIONS[media_type]:
        return filename
    return f"{stem or 'upload'}{_CANONICAL_EXTENSION[media_type]}"


def resolve_stored_media_path(
    stored_path: str, media_root: str | None = None
) -> str | None:
    """Resolve a stored relative media path to an absolute path under MEDIA_ROOT.

    The single "is this a file we own?" predicate; ``None`` = don't touch.
    ``avatar_url`` may hold a remote URL; absolute paths and ``..`` escapes are
    refused. Every stored-value → filesystem op goes through it (upload,
    deletion #1568, orphan sweep) to avoid path traversal.

    ``media_root`` overrides settings (the sweep script asks about prod's disk).
    """
    if not stored_path:
        return None
    if stored_path.startswith(("http://", "https://")):
        return None
    if os.path.isabs(stored_path):
        return None
    resolved_root = os.path.realpath(media_root or settings.MEDIA_ROOT)
    resolved = os.path.realpath(os.path.join(resolved_root, stored_path))
    if not resolved.startswith(resolved_root + os.sep):
        return None
    return resolved


#: Appended to ``MEDIA_ROOT`` to name the quarantine directory (#1593).
#: Must be a **sibling**, never inside: ``StaticFiles`` would still serve it and
#: the orphan sweep would offer to delete it. Suffixing the realpath can never
#: pass the ``startswith(root + os.sep)`` containment test.
#: DEPLOY: with ``MEDIA_ROOT=/app/media`` (the volume mount) the sibling is off
#: the volume and lost on redeploy; point ``MEDIA_ROOT`` at ``/app/media/uploads``.
QUARANTINE_SUFFIX = "-quarantine"


def quarantine_root() -> str:
    """Absolute path of the unmounted directory a hidden praxis's media moves to.

    Resolved per call: tests monkeypatch ``settings.MEDIA_ROOT``.
    """
    return os.path.realpath(settings.MEDIA_ROOT) + QUARANTINE_SUFFIX


def _move_stored_media(stored_path: str, source_root: str, target_root: str) -> bool:
    """Move one stored relative path between two roots. Best-effort, idempotent.

    Both ends are checked by ``resolve_stored_media_path``. The relative
    ``MediaItem.file_path`` (never rewritten) is the whole mapping. Missing
    source = no-op; an existing target is a stale copy and is removed first
    (Windows rename refuses it). Returns whether a file moved; failures are
    logged and swallowed so moderation isn't blocked.
    """
    source = resolve_stored_media_path(stored_path, source_root)
    target = resolve_stored_media_path(stored_path, target_root)
    if source is None or target is None or not os.path.isfile(source):
        return False
    try:
        os.makedirs(os.path.dirname(target), exist_ok=True)
        if os.path.exists(target):
            os.remove(target)
        # shutil, not os.replace: roots may be on different filesystems (EXDEV).
        shutil.move(source, target)
    except OSError:
        logger.warning("Could not move media %s out of %s", stored_path, source_root)
        return False
    # rmdir refuses non-empty dirs: the guard for pre-#1336 shared directories.
    try:
        os.rmdir(os.path.dirname(source))
    except OSError:
        pass
    return True


def withdraw_media_from_mount(stored_paths: Iterable[str]) -> int:
    """Move these files out of ``MEDIA_ROOT`` into quarantine. Returns the count moved.

    Evidence kept, unserved; reversible.

    ponytail: the sweep never sees quarantine, so a praxis deleted while hidden
    leaks its files; add ``--include-quarantine`` to ``sweep_orphan_media.py``.
    """
    return sum(
        _move_stored_media(path, settings.MEDIA_ROOT, quarantine_root())
        for path in stored_paths
    )


def restore_media_to_mount(stored_paths: Iterable[str]) -> int:
    """Move these files back under ``MEDIA_ROOT``. Returns the count moved.

    No-op outside quarantine, so it runs on every non-hidden moderation and
    self-heals half-completed withdrawals.
    """
    return sum(
        _move_stored_media(path, quarantine_root(), settings.MEDIA_ROOT)
        for path in stored_paths
    )


def _unlink_owned(stored_path: str | None, owner_directory: str, owner: str) -> bool:
    """Unlink a stored file that lies inside ``owner_directory``. Best-effort.

    The shared ownership guard for avatar and praxis-media deletion. Returns
    whether a file was removed; failures are logged and swallowed (the sweep
    collects residue).
    """
    absolute_path = resolve_stored_media_path(stored_path or "")
    if absolute_path is None:
        return False
    if not absolute_path.startswith(os.path.realpath(owner_directory) + os.sep):
        logger.warning(
            "Refusing to unlink %s for %s: outside that owner's media directory.",
            absolute_path,
            owner,
        )
        return False
    try:
        os.remove(absolute_path)
    except OSError:
        logger.info("Could not remove media file %s", absolute_path)
        return False
    # rmdir refuses non-empty dirs: the guard for older shared directories.
    try:
        os.rmdir(os.path.dirname(absolute_path))
    except OSError:
        pass
    return True


def delete_stored_media(stored_path: str, character_id: int) -> bool:
    """Unlink a praxis-media file **this character uploaded** (#2160).

    The leading path segment is the uploader (``MediaItem`` has no uploader
    column) and doubles as the ownership guard, since ``file_path`` is public.
    Only account deletion calls this; removing a single item or moderation
    never erases files.
    """
    return _unlink_owned(
        stored_path,
        os.path.join(settings.MEDIA_ROOT, str(character_id)),
        f"character {character_id}",
    )


def delete_stored_avatar(stored_avatar_url: str | None, character_id: int) -> None:
    """Unlink an avatar file **this character owns**, best-effort. Two callers, one rule.

    Callers: a superseding upload (after the new file is on disk) and
    self-deletion (#1568). Bans never erase evidence.

    ``character_id`` is the point: ``avatar_url`` is player-writable and others'
    paths are public, so containment alone let a player aim deletion at anyone's
    file. Server-written avatars live under ``<character_id>/avatar/<uuid>/``.
    """
    _unlink_owned(
        stored_avatar_url,
        os.path.join(settings.MEDIA_ROOT, str(character_id), "avatar"),
        f"character {character_id}",
    )


def _detect_media_type(content_type: str) -> MediaType:
    """Map a MIME type prefix to a MediaType enum or raise 422."""
    if content_type.startswith("image/"):
        return MediaType.image
    if content_type.startswith("video/"):
        return MediaType.video
    if content_type.startswith("audio/"):
        return MediaType.audio
    raise_coded(422, ErrorCode.media_type_unsupported, "Unsupported media type.")


async def process_and_save_avatar(
    upload: UploadFile,
    character_id: int,
    previous_avatar_url: str | None = None,
) -> str:
    """Resize and JPEG-encode an avatar upload; return its relative path.

    Caller has checked ownership and commits. Each upload gets its own
    directory (#1565) so the URL changes: ``/media`` sends no Cache-Control and
    browsers would keep the old photo. ``previous_avatar_url`` is unlinked after
    the new file is written.
    """
    content_type = upload.content_type or ""
    if not content_type.startswith("image/"):
        raise_coded(422, ErrorCode.avatar_must_be_image, "Avatar must be an image file.")

    relative_directory = os.path.join(str(character_id), "avatar", uuid.uuid4().hex)
    absolute_directory = os.path.join(settings.MEDIA_ROOT, relative_directory)
    filename = "avatar.jpg"
    absolute_path = os.path.join(absolute_directory, filename)
    relative_path = os.path.join(relative_directory, filename)

    try:
        os.makedirs(absolute_directory, exist_ok=True)
        contents = await upload.read()
        if len(contents) > AVATAR_MAX_BYTES:
            raise_coded(
                413,
                ErrorCode.avatar_too_large,
                f"Avatar too large (max {AVATAR_MAX_MEGABYTES} MB).",
                {"max_megabytes": AVATAR_MAX_MEGABYTES},
            )

        image = Image.open(io.BytesIO(contents))
        image = image.convert("RGB")
        image.thumbnail((AVATAR_MAX_SIZE, AVATAR_MAX_SIZE), Image.LANCZOS)
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=AVATAR_JPEG_QUALITY, optimize=True)
        with open(absolute_path, "wb") as file_handle:
            file_handle.write(buffer.getvalue())
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to save avatar for character %s", character_id)
        raise HTTPException(
            status_code=500,
            detail="We couldn't save your avatar. Please try again or paste a URL instead.",
        )

    # Only once the replacement is safely on disk.
    delete_stored_avatar(previous_avatar_url, character_id)

    return relative_path


async def process_and_save_media(
    upload: UploadFile,
    praxis_id: int,
    character_id: int,
    display_order: int,
) -> MediaItem:
    """Persist a praxis media upload to disk and build its MediaItem row.

    Caller has checked ownership and does ``session.add`` + commit. Writes under
    ``MEDIA_ROOT/<character_id>/<praxis_id>/<unique>/``: a unique directory
    (#1336) stops same-named uploads overwriting each other while keeping the
    player's filename (the caption). Paths stay relative.
    """
    content_type = upload.content_type or ""
    media_type = _detect_media_type(content_type)

    relative_directory = os.path.join(
        str(character_id), str(praxis_id), uuid.uuid4().hex
    )
    absolute_directory = os.path.join(settings.MEDIA_ROOT, relative_directory)
    # The extension is a security decision; see _SAFE_EXTENSIONS.
    filename = _with_safe_extension(
        _sanitize_filename(upload.filename or "upload"), media_type
    )
    absolute_path = os.path.join(absolute_directory, filename)
    relative_path = os.path.join(relative_directory, filename)

    try:
        contents = await upload.read()
        if len(contents) > MEDIA_MAX_BYTES:
            raise_coded(
                413,
                ErrorCode.media_too_large,
                f"File too large (max {MEDIA_MAX_MEGABYTES} MB).",
                {"max_megabytes": MEDIA_MAX_MEGABYTES},
            )
        try:
            if media_type is MediaType.image:
                contents, fmt = await asyncio.to_thread(_strip_image, contents)
                stem, extension = os.path.splitext(filename)
                if extension.lower() not in _OUTPUT_EXTENSIONS[fmt]:
                    filename = stem + _OUTPUT_EXTENSIONS[fmt][0]
            else:
                contents = await asyncio.to_thread(
                    _strip_av, contents, os.path.splitext(filename)[1].lower()
                )
        except Exception as exc:
            # Never store a file whose location data we couldn't remove.
            logger.exception(
                "Could not strip metadata for praxis %s: %s",
                praxis_id, getattr(exc, "stderr", b""),
            )
            raise_coded(
                422,
                ErrorCode.media_unreadable,
                "We couldn't read that file. Try a different one.",
            )
        absolute_path = os.path.join(absolute_directory, filename)
        relative_path = os.path.join(relative_directory, filename)
        os.makedirs(absolute_directory, exist_ok=True)
        with open(absolute_path, "wb") as file_handle:
            file_handle.write(contents)
    except HTTPException:
        raise
    except OSError:
        logger.exception("Failed to save media for praxis %s", praxis_id)
        raise HTTPException(
            status_code=500,
            detail="We couldn't save your file. Please check the file and try again.",
        )

    return MediaItem(
        praxis_id=praxis_id,
        type=media_type,
        file_path=relative_path,
        display_order=display_order,
    )

"""Media upload pipeline.

Owns the side effects (PIL resize, filename sanitization, filesystem I/O,
MIME-based MediaType detection) that the character-avatar and praxis-media
HTTP handlers used to inline. Routers stay thin and commit the session;
this module never calls ``session.commit`` itself.
"""

import io
import logging
import os
import re
import uuid

from fastapi import HTTPException, UploadFile
from PIL import Image

from config import settings
from models.praxis import MediaItem, MediaType


logger = logging.getLogger(__name__)


# Avatar pipeline tunables — kept here so the whole avatar contract lives in one place.
AVATAR_MAX_SIZE = 512
AVATAR_JPEG_QUALITY = 85
AVATAR_MAX_BYTES = 10 * 1024 * 1024  # 10 MB

# Praxis-media tunables.
MEDIA_MAX_BYTES = 100 * 1024 * 1024  # 100 MB
MEDIA_FILENAME_MAX_LEN = 100


def _sanitize_filename(raw: str) -> str:
    """Strip path components and replace unsafe chars; cap at 100 chars.

    Trust boundary: ``raw`` is a client-supplied filename on its way to the
    filesystem. Separators and NUL bytes are outside ``[\\w.\\-]`` and become
    underscores, so nothing here can introduce a new path segment; ``.`` and
    ``..`` survive the character class, though, and are rejected by name — a
    relative path ending in ``..`` points at a directory, not a file.

    This is deliberately lossy (``my photo.jpg`` and ``my_photo.jpg`` collapse
    to one name, as do two names differing only past character 100). Uniqueness
    is not its job: ``process_and_save_media`` gives every upload its own
    directory, so a collapsed basename never means a collided path.
    """
    basename = os.path.basename(raw or "upload")
    cleaned = re.sub(r"[^\w.\-]", "_", basename)[:MEDIA_FILENAME_MAX_LEN]
    if cleaned in ("", ".", ".."):
        return "upload"
    return cleaned


def _detect_media_type(content_type: str) -> MediaType:
    """Map a MIME type prefix to a MediaType enum or raise 422."""
    if content_type.startswith("image/"):
        return MediaType.image
    if content_type.startswith("video/"):
        return MediaType.video
    if content_type.startswith("audio/"):
        return MediaType.audio
    raise HTTPException(status_code=422, detail="Unsupported media type.")


async def process_and_save_avatar(upload: UploadFile, character_id: int) -> str:
    """Resize and JPEG-encode an avatar upload; return its relative path.

    Router contract: the caller has already validated that the target
    character exists and is owned by the current account. This function
    handles PIL + filesystem concerns only. The returned path is stored on
    ``Character.avatar_url``; the caller commits the session.
    """
    content_type = upload.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=422, detail="Avatar must be an image file.")

    relative_directory = os.path.join(str(character_id), "avatar")
    absolute_directory = os.path.join(settings.MEDIA_ROOT, relative_directory)
    filename = "avatar.jpg"
    absolute_path = os.path.join(absolute_directory, filename)
    relative_path = os.path.join(relative_directory, filename)

    try:
        os.makedirs(absolute_directory, exist_ok=True)
        contents = await upload.read()
        if len(contents) > AVATAR_MAX_BYTES:
            raise HTTPException(status_code=413, detail="Avatar too large (max 10 MB).")

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

    return relative_path


async def process_and_save_media(
    upload: UploadFile,
    praxis_id: int,
    character_id: int,
    display_order: int,
) -> MediaItem:
    """Persist a praxis media upload to disk and build its MediaItem row.

    Router contract: the caller has already validated the praxis exists and
    is owned by the current character. This function writes the file under
    ``MEDIA_ROOT/<character_id>/<praxis_id>/<unique>/`` and returns an
    unattached ``MediaItem``; the caller is responsible for ``session.add`` +
    commit.

    **Every upload gets its own directory** (#1336). Uploading ``photo.jpg``
    twice used to write both to one path: the second overwrote the first while
    both rows survived, so one row served someone else's bytes — and deleting
    either row removed the only file, 404-ing the survivor. Uniquifying the
    *directory* rather than the basename keeps ``file_path``'s last segment
    exactly what the player picked, which the composer renders as the
    attachment caption and as the remove button's accessible name.

    Paths stay relative (CLAUDE.md): the returned value is joined onto
    ``MEDIA_ROOT`` to read or delete, and onto ``MEDIA_BASE_URL`` to serve.
    """
    content_type = upload.content_type or ""
    media_type = _detect_media_type(content_type)

    relative_directory = os.path.join(
        str(character_id), str(praxis_id), uuid.uuid4().hex
    )
    absolute_directory = os.path.join(settings.MEDIA_ROOT, relative_directory)
    filename = _sanitize_filename(upload.filename or "upload")
    absolute_path = os.path.join(absolute_directory, filename)
    relative_path = os.path.join(relative_directory, filename)

    try:
        os.makedirs(absolute_directory, exist_ok=True)
        contents = await upload.read()
        if len(contents) > MEDIA_MAX_BYTES:
            raise HTTPException(status_code=413, detail="File too large (max 100 MB).")
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


__all__ = [
    "AVATAR_JPEG_QUALITY",
    "AVATAR_MAX_BYTES",
    "AVATAR_MAX_SIZE",
    "MEDIA_FILENAME_MAX_LEN",
    "MEDIA_MAX_BYTES",
    "process_and_save_avatar",
    "process_and_save_media",
]

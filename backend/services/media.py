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
from errors import ErrorCode, raise_coded
from models.praxis import MediaItem, MediaType


logger = logging.getLogger(__name__)


#: Named so the size ceilings can state their limit in megabytes to both the
#: prose and the ``params`` the copy catalog interpolates (#1401), instead of
#: repeating the number as a bare literal in three places.
BYTES_PER_MEGABYTE = 1024 * 1024

# Avatar pipeline tunables — kept here so the whole avatar contract lives in one place.
AVATAR_MAX_SIZE = 512
AVATAR_JPEG_QUALITY = 85
AVATAR_MAX_MEGABYTES = 10
AVATAR_MAX_BYTES = AVATAR_MAX_MEGABYTES * BYTES_PER_MEGABYTE

# Praxis-media tunables.
MEDIA_MAX_MEGABYTES = 100
MEDIA_MAX_BYTES = MEDIA_MAX_MEGABYTES * BYTES_PER_MEGABYTE
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


def resolve_stored_media_path(
    stored_path: str, media_root: str | None = None
) -> str | None:
    """Resolve a stored relative media path to an absolute path under MEDIA_ROOT.

    Returns ``None`` for anything this process must not touch on disk, which is
    the point of the helper: ``Character.avatar_url`` is not always ours.
    ``POST /characters`` and the admin editor both accept a player-supplied
    ``avatar_url``, and the upload route's own error text invites pasting a URL,
    so the column holds either an uploaded relative path *or* a remote
    ``http(s)`` URL. Absolute filesystem paths and ``..`` escapes are refused
    for the same reason ``_sanitize_filename`` exists — a value that resolves
    outside ``MEDIA_ROOT`` is not a file we wrote.

    This is the single "is this a file we own?" predicate. Every caller that
    turns a stored column value into a filesystem operation goes through it —
    the upload path, character self-deletion (#1568) and the orphan sweep
    (``services.media_sweep``) — because unlinking whatever a 500-char
    player-supplied column happens to hold is a path-traversal primitive.

    ``media_root`` overrides ``settings.MEDIA_ROOT`` for callers that resolve
    settings themselves rather than from the process environment: the sweep
    script loads a ``Settings`` for ``--env prod`` and must ask about *that*
    disk, not this process's.
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


def delete_stored_avatar(stored_avatar_url: str | None) -> None:
    """Unlink an avatar file we wrote, best-effort. Two callers, one rule.

    1. A fresh upload has superseded it (``process_and_save_avatar``). Called
       only once the replacement is safely on disk — an upload must never leave
       a character with a dead ``avatar_url``.
    2. The player has ended this life (``services.character.soft_delete_character``,
       #1568). Self-deletion is the *only* path that erases: an admin ban leaves
       every file alone, because moderation must not shred the evidence it is
       acting on and a ban is a reversible toggle.

    Best-effort in both: a failure to unlink is logged and swallowed rather than
    raised, so a filesystem problem can never block the state change the caller
    is really making. The residue is an orphan, which
    ``scripts/sweep_orphan_media.py`` exists to collect.
    """
    absolute_path = resolve_stored_media_path(stored_avatar_url or "")
    if absolute_path is None:
        return
    try:
        os.remove(absolute_path)
    except OSError:
        logger.info("Could not remove avatar file %s", absolute_path)
        return
    # Each upload owns its directory, so the unlink leaves that directory empty.
    # rmdir refuses a non-empty one, which is exactly the guard we want for
    # pre-#1565 avatars still sitting directly in the shared ``<id>/avatar``.
    try:
        os.rmdir(os.path.dirname(absolute_path))
    except OSError:
        pass


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

    Router contract: the caller has already validated that the target
    character exists and is owned by the current account. This function
    handles PIL + filesystem concerns only. The returned path is stored on
    ``Character.avatar_url``; the caller commits the session.

    **Every upload gets its own directory** (#1565), the same mechanism #1336
    gave praxis media one function below. The avatar used to live at the fully
    deterministic ``<id>/avatar/avatar.jpg``, so a re-upload changed the bytes
    but not the URL — and the ``/media`` mount sends no ``Cache-Control``, so
    browsers applied heuristic freshness and kept showing the old photo.
    Uniquifying the *directory* rather than the basename changes the URL, which
    (unlike a ``?v=`` token) no proxy can strip. The avatar is the one media
    route that replaces rather than appends, which is why it is the one where a
    stale cache was guaranteed rather than incidental.

    ``previous_avatar_url`` is the caller's pre-upload ``Character.avatar_url``;
    it is unlinked *after* the new file is written, so a unique path per upload
    does not mean an orphaned file per upload. Paths stay relative (CLAUDE.md).
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
    delete_stored_avatar(previous_avatar_url)

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
            raise_coded(
                413,
                ErrorCode.media_too_large,
                f"File too large (max {MEDIA_MAX_MEGABYTES} MB).",
                {"max_megabytes": MEDIA_MAX_MEGABYTES},
            )
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
    "AVATAR_MAX_MEGABYTES",
    "AVATAR_MAX_SIZE",
    "BYTES_PER_MEGABYTE",
    "MEDIA_FILENAME_MAX_LEN",
    "MEDIA_MAX_BYTES",
    "MEDIA_MAX_MEGABYTES",
    "delete_stored_avatar",
    "process_and_save_avatar",
    "process_and_save_media",
    "resolve_stored_media_path",
]

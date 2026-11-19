"""Scrub location metadata from media stored before upload-time stripping (#3590).

Reuses the upload strip functions. ``scrub_media_root`` rewrites files in place
on disk. HEIC/HEIF are not: #3589 stores them as ``.jpg``, so
``convert_heic_rows`` does the same for existing rows (new file, row path
updated, old file unlinked only after the caller commits). Hotlinks to the old
``.heic`` URL break; the app serves through the row's path.
"""

import io
import os
import tempfile
from dataclasses import dataclass, field

from PIL import Image
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.praxis import MediaItem, MediaType
from services.media import (
    _SAFE_EXTENSIONS,
    _strip_av,
    _strip_image,
    resolve_stored_media_path,
)
from services.media_sweep import scan_media_root


@dataclass
class ScrubReport:
    scanned: int = 0
    cleaned: list[str] = field(default_factory=list)
    already_clean: int = 0
    failed: list[tuple[str, str]] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)


HEIC_EXTENSIONS = (".heic", ".heif")


def _media_type(extension: str) -> MediaType | None:
    for media_type, extensions in _SAFE_EXTENSIONS.items():
        if extension in extensions:
            return media_type
    return None


def _image_signature(contents: bytes) -> tuple:
    with Image.open(io.BytesIO(contents)) as image:
        return (image.format, frozenset(image.info), bool(image.getexif()))


def _scrubbed(contents: bytes, media_type: MediaType, extension: str) -> bytes | None:
    """Clean bytes, or ``None`` when the file is already clean.

    Image re-encoding is lossy, so "clean" is judged by metadata signature
    (never byte equality), which is what makes a second run a no-op.
    """
    if media_type is MediaType.image:
        stripped, _format = _strip_image(contents)
        clean = _image_signature(contents) == _image_signature(stripped)
        return None if clean else stripped
    stripped = _strip_av(contents, extension)
    return None if stripped == contents else stripped


def _replace_atomically(path: str, contents: bytes) -> None:
    """Same-directory temp + replace: a crash never leaves a half-written file."""
    descriptor, temp_path = tempfile.mkstemp(dir=os.path.dirname(path))
    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(contents)
        os.chmod(temp_path, os.stat(path).st_mode & 0o777)
        os.replace(temp_path, path)
    except BaseException:
        os.unlink(temp_path)
        raise


def scrub_media_root(media_root: str, apply: bool) -> ScrubReport:
    report = ScrubReport()
    files, escaping = scan_media_root(media_root)
    report.skipped.extend(escaping)
    for scanned in files:
        extension = os.path.splitext(scanned.relative_path)[1].lower()
        media_type = _media_type(extension)
        if media_type is None or extension in HEIC_EXTENSIONS:
            report.skipped.append(scanned.relative_path)
            continue
        report.scanned += 1
        try:
            with open(scanned.absolute_path, "rb") as handle:
                contents = handle.read()
            cleaned = _scrubbed(contents, media_type, extension)
            if cleaned is None:
                report.already_clean += 1
                continue
            if apply:
                _replace_atomically(scanned.absolute_path, cleaned)
            report.cleaned.append(scanned.relative_path)
        except Exception as exc:
            detail = getattr(exc, "stderr", b"") or b""
            reason = f"{exc!r} {detail.decode(errors='replace')}".strip()
            report.failed.append((scanned.relative_path, reason))
    return report


async def convert_heic_rows(
    session: AsyncSession, media_root: str, apply: bool
) -> tuple[ScrubReport, list[str]]:
    """Convert HEIC/HEIF MediaItem files to stripped ``.jpg`` beside the original.

    Returns the report (``cleaned`` holds ``old -> new`` lines) and the old
    absolute paths to unlink once the caller has committed. Never commits.
    """
    report = ScrubReport()
    to_unlink: list[str] = []
    rows = await session.scalars(
        select(MediaItem).where(MediaItem.type == MediaType.image)
    )
    for item in rows:
        stem, extension = os.path.splitext(item.file_path)
        if extension.lower() not in HEIC_EXTENSIONS:
            continue
        report.scanned += 1
        old_path = resolve_stored_media_path(item.file_path, media_root)
        new_relative = stem + ".jpg"
        new_path = resolve_stored_media_path(new_relative, media_root)
        try:
            if old_path is None or new_path is None or not os.path.isfile(old_path):
                raise FileNotFoundError(item.file_path)
            if os.path.exists(new_path):
                raise FileExistsError(new_relative)
            with open(old_path, "rb") as handle:
                converted, _format = _strip_image(handle.read())
            if apply:
                with open(new_path, "wb") as handle:
                    handle.write(converted)
                item.file_path = new_relative
                to_unlink.append(old_path)
            report.cleaned.append(f"{stem + extension} -> {new_relative}")
        except Exception as exc:
            report.failed.append((item.file_path, repr(exc)))
    return report, to_unlink

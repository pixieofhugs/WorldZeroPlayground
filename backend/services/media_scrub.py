"""Scrub location metadata from media stored before upload-time stripping (#3590).

Reuses the upload strip functions. ``scrub_media_root`` rewrites files in place
on disk. HEIC/HEIF/AVIF/BMP are not: #3589 stores them as ``.jpg``, so
``convert_heic_rows`` does the same for existing rows (new file, row path
updated, old file unlinked only after the caller commits), live or withdrawn into
quarantine (a restore would bring the GPS back). Hotlinks to the old
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
    _OUTPUT_EXTENSIONS,
    _SAFE_EXTENSIONS,
    QUARANTINE_SUFFIX,
    _strip_av,
    _strip_image,
    resolve_stored_media_path,
)
from services.media_sweep import load_known_paths, scan_media_root


@dataclass
class ScrubReport:
    scanned: int = 0
    cleaned: list[str] = field(default_factory=list)
    already_clean: int = 0
    failed: list[tuple[str, str]] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)


def merge_held_report(report: ScrubReport, held: ScrubReport) -> None:
    """Fold a quarantine scrub into the live one, every path tagged ``[quarantine]``."""
    report.scanned += held.scanned
    report.already_clean += held.already_clean
    report.cleaned += [f"[quarantine] {path}" for path in held.cleaned]
    report.skipped += [f"[quarantine] {path}" for path in held.skipped]
    report.failed += [(f"[quarantine] {path}", why) for path, why in held.failed]


#: Image extensions _strip_image cannot keep (it outputs JPEG): upload renames
#: these to ``.jpg``, so the scrub does too instead of writing JPEG under them.
RENAME_EXTENSIONS = tuple(
    sorted(
        _SAFE_EXTENSIONS[MediaType.image]
        - {ext for exts in _OUTPUT_EXTENSIONS.values() for ext in exts}
    )
)


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


def _replace_atomically(path: str, contents: bytes, mode: int | None = None) -> None:
    """Same-directory temp + fsync + replace: a crash never leaves a half-written file.

    ``mode`` defaults to the existing file's; pass one for a new path.
    """
    directory = os.path.dirname(path)
    descriptor, temp_path = tempfile.mkstemp(dir=directory)
    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(contents)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temp_path, mode if mode is not None else os.stat(path).st_mode & 0o777)
        os.replace(temp_path, path)
        directory_fd = os.open(directory, os.O_RDONLY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
    except BaseException:
        if os.path.exists(temp_path):
            os.unlink(temp_path)
        raise


def unlink_reporting(paths: list[str], report: ScrubReport) -> None:
    """Unlink each path; a failure is reported and the rest still go."""
    for path in paths:
        try:
            os.unlink(path)
        except FileNotFoundError:
            pass
        except OSError as exc:
            report.failed.append((path, repr(exc)))


def scrub_media_root(media_root: str, apply: bool) -> ScrubReport:
    report = ScrubReport()
    files, escaping = scan_media_root(media_root)
    report.skipped.extend(escaping)
    for scanned in files:
        extension = os.path.splitext(scanned.relative_path)[1].lower()
        media_type = _media_type(extension)
        if media_type is None or extension in RENAME_EXTENSIONS:
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


def _roots(media_root: str) -> list[str]:
    root = os.path.realpath(media_root)
    return [root, root + QUARANTINE_SUFFIX]


async def convert_heic_rows(
    session: AsyncSession, media_root: str, apply: bool
) -> tuple[ScrubReport, list[str]]:
    """Convert HEIC/HEIF/AVIF/BMP rows to a stripped ``.jpg`` beside the original.

    Returns the report (``cleaned`` holds ``old -> new`` lines) and the old
    absolute paths to unlink once the caller has committed. Never commits.
    """
    report = ScrubReport()
    to_unlink: list[str] = []
    claimed = (await load_known_paths(session, media_root)).claimed_paths
    roots = _roots(media_root)
    rows = await session.scalars(
        select(MediaItem).where(MediaItem.type == MediaType.image)
    )
    for item in rows:
        stem, extension = os.path.splitext(item.file_path)
        if extension.lower() not in RENAME_EXTENSIONS:
            continue
        report.scanned += 1
        new_relative = stem + ".jpg"
        try:
            old_path = next(
                (
                    path
                    for root in roots
                    if (path := resolve_stored_media_path(item.file_path, root))
                    and os.path.isfile(path)
                ),
                None,
            )
            if old_path is None:
                raise FileNotFoundError(item.file_path)
            root = roots[0] if old_path.startswith(roots[0] + os.sep) else roots[1]
            new_path = resolve_stored_media_path(new_relative, root)
            live_new = resolve_stored_media_path(new_relative, media_root)
            # An unclaimed .jpg is a crashed run's leftover: overwrite it.
            if new_path is None or live_new in claimed:
                raise FileExistsError(new_relative)
            with open(old_path, "rb") as handle:
                converted, _format = _strip_image(handle.read())
            if apply:
                _replace_atomically(new_path, converted, 0o644)
                item.file_path = new_relative
                to_unlink.append(old_path)
            report.cleaned.append(f"{stem + extension} -> {new_relative}")
        except Exception as exc:
            report.failed.append((item.file_path, repr(exc)))
    await _sweep_unclaimed_heic(session, media_root, apply, report, to_unlink)
    return report, to_unlink


async def _sweep_unclaimed_heic(
    session: AsyncSession,
    media_root: str,
    apply: bool,
    report: ScrubReport,
    to_unlink: list[str],
) -> None:
    """An original no row claims still serves its GPS from /media.

    With a claimed .jpg beside it, it is an interrupted run's leftover: remove
    it. Otherwise only the orphan sweep may delete it, so fail loudly.
    """
    claimed = (await load_known_paths(session, media_root)).claimed_paths
    files = [
        scanned
        for root in _roots(media_root)
        if os.path.isdir(root)
        for scanned in scan_media_root(root)[0]
    ]
    for scanned in files:
        extension = os.path.splitext(scanned.absolute_path)[1]
        relative = os.path.splitext(scanned.relative_path)[0]
        live = resolve_stored_media_path(scanned.relative_path, media_root)
        if extension.lower() not in RENAME_EXTENSIONS or live in claimed:
            continue
        if scanned.absolute_path in to_unlink:
            continue
        if resolve_stored_media_path(relative + ".jpg", media_root) in claimed:
            if apply:
                to_unlink.append(scanned.absolute_path)
            report.cleaned.append(f"{scanned.relative_path} (leftover, removed)")
        else:
            report.failed.append(
                (scanned.relative_path, "unreferenced; delete the file by hand")
            )

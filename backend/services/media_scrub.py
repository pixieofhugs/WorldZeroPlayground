"""Scrub location metadata from media stored before upload-time stripping (#3590).

Reuses the upload strip functions. Disk-driven: rewrites in place at the stored
path, so no MediaItem row changes and every served URL keeps working. A HEIC
file therefore ends up holding JPEG bytes under its ``.heic`` name; browsers
sniff images, and the DB never has to move.
"""

import io
import os
import tempfile
from dataclasses import dataclass, field

from PIL import Image

from models.praxis import MediaType
from services.media import _SAFE_EXTENSIONS, _strip_av, _strip_image
from services.media_sweep import scan_media_root


@dataclass
class ScrubReport:
    scanned: int = 0
    cleaned: list[str] = field(default_factory=list)
    already_clean: int = 0
    failed: list[tuple[str, str]] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)


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
        if media_type is None:
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

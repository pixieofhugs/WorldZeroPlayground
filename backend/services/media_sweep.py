"""Find media files on disk that no database row points at (#1568).

Read side only; ``scripts/sweep_orphan_media.py`` is the CLI (dry run default).

Claimed = the **stored path** (``MediaItem.file_path``, ``Character.avatar_url``)
via ``resolve_stored_media_path``, never the directory layout, which has changed
twice. :class:`MediaPathShape` only groups the report.

Disk is walked before the DB is queried so rows committing mid-scan still
claim (uploads write the file first); ``min_age_seconds`` narrows the rest.
Not a lock: a busy instance can still race.
"""

import dataclasses
import enum
import os
import time

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.praxis import MediaItem
from services.media import resolve_stored_media_path


# Pointed at /etc, nothing is claimed and the sweep would offer to delete it all.
FORBIDDEN_MEDIA_ROOTS = frozenset({"/", "/app", "/usr", "/etc", "/var", "/home", "/root"})

# Grace period for the disk/DB race; operational, not an EraConfig rule.
DEFAULT_MIN_AGE_SECONDS = 3600.0


class MediaPathShape(enum.Enum):
    """How a path under MEDIA_ROOT reads. Report grouping only — never matching."""

    avatar = "avatar"
    praxis = "praxis"
    unrecognised = "unrecognised"


@dataclasses.dataclass(frozen=True)
class ScannedFile:
    """One file found under MEDIA_ROOT, with everything the report needs."""

    absolute_path: str
    relative_path: str
    size_bytes: int
    shape: MediaPathShape
    age_seconds: float


@dataclasses.dataclass(frozen=True)
class KnownPaths:
    """Absolute paths the DB claims; row counts differ (remote URLs claim nothing)."""

    avatar_paths: frozenset[str]
    media_item_paths: frozenset[str]
    avatar_rows: int
    media_item_rows: int

    @property
    def claimed_paths(self) -> frozenset[str]:
        return self.avatar_paths | self.media_item_paths


@dataclasses.dataclass(frozen=True)
class SweepReport:
    """Everything the CLI prints, computed before anything is unlinked."""

    media_root: str
    scanned: tuple[ScannedFile, ...]
    orphans: tuple[ScannedFile, ...]
    too_recent: tuple[ScannedFile, ...]
    escaping: tuple[str, ...]
    known: KnownPaths


def media_root_is_sweepable(media_root: str) -> bool:
    """False for a path no sweep should ever be pointed at. See FORBIDDEN_MEDIA_ROOTS."""
    if not media_root.strip():
        return False
    resolved = os.path.realpath(media_root)
    normalised = "/" + media_root.replace("\\", "/").strip("/") if media_root.strip("/") else "/"
    if normalised in FORBIDDEN_MEDIA_ROOTS or resolved in FORBIDDEN_MEDIA_ROOTS:
        return False
    return os.path.dirname(resolved) != resolved


def classify_shape(relative_path: str) -> MediaPathShape:
    """Group a relative path for the report. Not used to decide orphanhood.

    ``<id>/avatar/...`` or ``<id>/<praxis_id>/...``; else ``unrecognised``.
    """
    segments = [segment for segment in relative_path.replace("\\", "/").split("/") if segment]
    if len(segments) < 2 or not segments[0].isdigit():
        return MediaPathShape.unrecognised
    if segments[1] == "avatar":
        return MediaPathShape.avatar
    if segments[1].isdigit():
        return MediaPathShape.praxis
    return MediaPathShape.unrecognised


def scan_media_root(
    media_root: str, now: float | None = None
) -> tuple[tuple[ScannedFile, ...], tuple[str, ...]]:
    """Walk MEDIA_ROOT and describe every file under it.

    Returns ``(files, escaping)``; symlinks resolving outside the root are
    reported in ``escaping`` and never touched.
    """
    now = time.time() if now is None else now
    root = os.path.realpath(media_root)
    files: list[ScannedFile] = []
    escaping: list[str] = []

    for directory_path, _directory_names, file_names in os.walk(root):
        for file_name in file_names:
            joined = os.path.join(directory_path, file_name)
            absolute_path = os.path.realpath(joined)
            if not absolute_path.startswith(root + os.sep):
                escaping.append(joined)
                continue
            try:
                stat_result = os.lstat(joined)
            except OSError:
                continue
            relative_path = os.path.relpath(absolute_path, root)
            files.append(
                ScannedFile(
                    absolute_path=absolute_path,
                    relative_path=relative_path,
                    size_bytes=stat_result.st_size,
                    shape=classify_shape(relative_path),
                    age_seconds=now - stat_result.st_mtime,
                )
            )

    return tuple(files), tuple(escaping)


async def load_known_paths(session: AsyncSession, media_root: str) -> KnownPaths:
    """Resolve every stored media value in the database to an absolute path.

    Values ``resolve_stored_media_path`` rejects claim nothing.
    """
    avatar_values = (
        await session.execute(select(Character.avatar_url))
    ).scalars().all()
    file_path_values = (
        await session.execute(select(MediaItem.file_path))
    ).scalars().all()

    def resolved(values: list[str]) -> frozenset[str]:
        return frozenset(
            path
            for path in (
                resolve_stored_media_path(value or "", media_root) for value in values
            )
            if path is not None
        )

    return KnownPaths(
        avatar_paths=resolved(list(avatar_values)),
        media_item_paths=resolved(list(file_path_values)),
        avatar_rows=len(avatar_values),
        media_item_rows=len(file_path_values),
    )


def find_orphans(
    media_root: str,
    scanned: tuple[ScannedFile, ...],
    escaping: tuple[str, ...],
    known: KnownPaths,
    min_age_seconds: float = DEFAULT_MIN_AGE_SECONDS,
) -> SweepReport:
    """Split the scan into claimed, orphaned, and too-recent-to-judge."""
    claimed = known.claimed_paths
    orphans: list[ScannedFile] = []
    too_recent: list[ScannedFile] = []

    for scanned_file in scanned:
        if scanned_file.absolute_path in claimed:
            continue
        if scanned_file.age_seconds < min_age_seconds:
            too_recent.append(scanned_file)
        else:
            orphans.append(scanned_file)

    return SweepReport(
        media_root=os.path.realpath(media_root),
        scanned=scanned,
        orphans=tuple(sorted(orphans, key=lambda item: item.relative_path)),
        too_recent=tuple(sorted(too_recent, key=lambda item: item.relative_path)),
        escaping=escaping,
        known=known,
    )


def summarise_by_shape(
    files: tuple[ScannedFile, ...]
) -> dict[MediaPathShape, tuple[int, int]]:
    """``{shape: (file count, total bytes)}`` for every shape, including zeroes."""
    summary = {shape: (0, 0) for shape in MediaPathShape}
    for scanned_file in files:
        count, total = summary[scanned_file.shape]
        summary[scanned_file.shape] = (count + 1, total + scanned_file.size_bytes)
    return summary


def total_bytes(files: tuple[ScannedFile, ...]) -> int:
    return sum(scanned_file.size_bytes for scanned_file in files)


def unlink_orphans(orphans: tuple[ScannedFile, ...]) -> tuple[int, int, tuple[str, ...]]:
    """Unlink the given files. Returns ``(removed, bytes freed, failures)``.

    One failure doesn't abort the rest.
    """
    removed = 0
    freed = 0
    failures: list[str] = []
    for scanned_file in orphans:
        try:
            os.remove(scanned_file.absolute_path)
        except OSError as error:
            failures.append(f"{scanned_file.relative_path}: {error}")
            continue
        removed += 1
        freed += scanned_file.size_bytes
    return removed, freed, tuple(failures)


def prune_empty_directories(media_root: str) -> int:
    """Remove directories left empty beneath MEDIA_ROOT; never the root itself.

    Bottom-up, so nested empties go too.
    """
    root = os.path.realpath(media_root)
    removed = 0
    for directory_path, _directory_names, _file_names in os.walk(root, topdown=False):
        if os.path.realpath(directory_path) == root:
            continue
        try:
            os.rmdir(directory_path)
        except OSError:
            continue  # Not empty, or not ours to remove.
        removed += 1
    return removed

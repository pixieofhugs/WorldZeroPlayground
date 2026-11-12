"""Everything an account holds, as one zip it can keep (#2158).

Synchronous: no job runner, so nothing is stored (owner ruling 2026-08-17).
Media is embedded, not linked, so the export outlives the site. Past
:data:`MEDIA_CEILING_BYTES` (measured before reading) it links instead, rather
than dying at the proxy.

ponytail: no rate limit; cost is bounded by the media ceiling. Add the shared
write-route middleware keyed on ``account.id`` if ever needed.
"""

import json
import os
import tempfile
import zipfile
from datetime import datetime, timezone
from typing import Any, BinaryIO, Iterator

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.comment import Comment
from models.faction_defection_history import FactionDefectionHistory
from models.praxis import MediaItem, Praxis, PraxisMember
from models.task import Task
from models.vote import Vote
from services.media import BYTES_PER_MEGABYTE, resolve_stored_media_path

#: Above this the archive links media. Sized against the request timeout.
MEDIA_CEILING_BYTES = 200 * BYTES_PER_MEGABYTE

SPOOL_TO_DISK_ABOVE_BYTES = 8 * BYTES_PER_MEGABYTE

STREAM_CHUNK_BYTES = 64 * 1024

MEDIA_DIRECTORY = "media"

_README = """World Zero — your data
======================

Exported {exported_at}.

WHAT IS IN HERE
  export.json   Everything below, as machine-readable JSON.
{media_line}
READING export.json
  characters       Every life on this account, with its per-era stats: score is
                   the current era's, all_time_score is every era added up.
  praxes           The proof you posted, with the task it answered. Praxis
                   you created and praxis you joined as a collaborator are both
                   here.
  votes you cast   The star ratings YOU gave to OTHER players' praxes — not the
                   votes you received. Each one is points you awarded to someone
                   else, and those points stay with them even if you delete this
                   account.
  comments         Comments you wrote, on praxes and on tasks.
  faction_history  Each faction you have belonged to, and when you left it.

Dates are UTC, in ISO 8601 form.

This file was built the moment you asked for it. Nothing about it is stored on
our side, so nobody else can be handed a copy of it.
"""

_MEDIA_EMBEDDED_LINE = (
    "  media/        The photos and videos you uploaded, at the paths\n"
    "                export.json names. These are the original files.\n"
)

_MEDIA_LINKED_LINE = """  (no media/ folder)
                Your uploads came to more than {ceiling} MB, which is too large
                to build into a single download. export.json lists a web address
                for each file instead, so you can save them yourself. Those
                addresses work for as long as World Zero does.
"""

_MEDIA_NONE_LINE = """  (no media/ folder — this account has not uploaded any files.)
"""


async def build_account_export(
    account: Account, session: AsyncSession
) -> tuple[BinaryIO, str]:
    """Return (zip open at byte zero, filename). The caller closes it."""
    characters = list(
        (
            await session.execute(
                select(Character)
                .where(Character.account_id == account.id)
                .order_by(Character.id)
            )
        ).scalars()
    )
    character_ids = [character.id for character in characters]

    praxes = await _praxes(character_ids, session)
    media_by_praxis = await _uploaded_media(
        [praxis.id for praxis, _ in praxes], character_ids, session
    )
    embedded = _readable_media_bytes(media_by_praxis) <= MEDIA_CEILING_BYTES

    exported_at = datetime.now(timezone.utc)
    manifest = {
        "exported_at": exported_at.isoformat(),
        "media": "embedded" if embedded else "linked",
        "account": {
            "email": account.email,
            "created_at": account.created_at.isoformat(),
        },
        "characters": await _characters(characters, session),
        "praxes": [
            _praxis(praxis, task, media_by_praxis.get(praxis.id, ()), embedded)
            for praxis, task in praxes
        ],
        "votes_cast": await _votes_cast(account.id, session),
        "comments": await _comments(character_ids, session),
    }

    archive_file: BinaryIO = tempfile.SpooledTemporaryFile(
        max_size=SPOOL_TO_DISK_ABOVE_BYTES
    )
    with zipfile.ZipFile(archive_file, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(
            "README.txt", _readme(exported_at, media_by_praxis, embedded)
        )
        archive.writestr("export.json", json.dumps(manifest, indent=2))
        if embedded:
            for items in media_by_praxis.values():
                for item in items:
                    _embed(archive, item.file_path)

    archive_file.seek(0)
    stamp = exported_at.strftime("%Y-%m-%d")
    return archive_file, f"world-zero-export-{stamp}.zip"


def stream(archive_file: BinaryIO) -> Iterator[bytes]:
    """Chunked; ``finally`` closes it on a dropped connection too."""
    try:
        while chunk := archive_file.read(STREAM_CHUNK_BYTES):
            yield chunk
    finally:
        archive_file.close()


def _readme(
    exported_at: datetime,
    media_by_praxis: dict[int, list[MediaItem]],
    embedded: bool,
) -> str:
    if not media_by_praxis:
        media_line = _MEDIA_NONE_LINE
    elif embedded:
        media_line = _MEDIA_EMBEDDED_LINE
    else:
        media_line = _MEDIA_LINKED_LINE.format(
            ceiling=MEDIA_CEILING_BYTES // BYTES_PER_MEGABYTE
        )
    return _README.format(
        exported_at=exported_at.strftime("%d %B %Y at %H:%M UTC"),
        media_line=media_line,
    )


async def _praxes(
    character_ids: list[int], session: AsyncSession
) -> list[tuple[Praxis, Task]]:
    """Praxes these lives created or joined, each with its task."""
    if not character_ids:
        return []
    joined = select(PraxisMember.praxis_id).where(
        PraxisMember.character_id.in_(character_ids)
    )
    rows = await session.execute(
        select(Praxis, Task)
        .join(Task, Task.id == Praxis.task_id)
        .where(Praxis.created_by_id.in_(character_ids) | Praxis.id.in_(joined))
        .order_by(Praxis.id)
    )
    return [(praxis, task) for praxis, task in rows]


async def _uploaded_media(
    praxis_ids: list[int], character_ids: list[int], session: AsyncSession
) -> dict[int, list[MediaItem]]:
    """This account's own uploads, keyed by praxis.

    The leading path segment is the uploader's character id, which keeps
    collaborators' photos out (same as ``account_deletion._uploaded_media``).
    """
    if not praxis_ids:
        return {}
    prefixes = tuple(os.path.join(str(cid), "") for cid in character_ids)
    rows = (
        await session.execute(
            select(MediaItem)
            .where(MediaItem.praxis_id.in_(praxis_ids))
            .order_by(MediaItem.praxis_id, MediaItem.display_order, MediaItem.id)
        )
    ).scalars()
    by_praxis: dict[int, list[MediaItem]] = {}
    for item in rows:
        if item.file_path.startswith(prefixes):
            by_praxis.setdefault(item.praxis_id, []).append(item)
    return by_praxis


def _readable_media_bytes(media_by_praxis: dict[int, list[MediaItem]]) -> int:
    """Total size on disk; paths ``resolve_stored_media_path`` refuses are not
    stat'd."""
    total = 0
    for items in media_by_praxis.values():
        for item in items:
            absolute = resolve_stored_media_path(item.file_path)
            if absolute and os.path.isfile(absolute):
                total += os.path.getsize(absolute)
    return total


def _archive_name(file_path: str) -> str:
    """``media/<path>``; zip entry names always use forward slashes."""
    return f"{MEDIA_DIRECTORY}/{file_path.replace(os.sep, '/')}"


def _embed(archive: zipfile.ZipFile, file_path: str) -> None:
    """Copy one upload in; skip a missing file rather than 500."""
    absolute = resolve_stored_media_path(file_path)
    if not absolute or not os.path.isfile(absolute):
        return
    # ZIP_STORED: media is already compressed.
    archive.write(absolute, _archive_name(file_path), zipfile.ZIP_STORED)


def _media_url(file_path: str) -> str:
    return f"{settings.MEDIA_BASE_URL.rstrip('/')}/{file_path.replace(os.sep, '/')}"


def _praxis(
    praxis: Praxis, task: Task, items: "list[MediaItem] | tuple[()]", embedded: bool
) -> dict[str, Any]:
    return {
        "id": praxis.id,
        "title": praxis.title,
        "body_text": praxis.body_text,
        "type": praxis.type.value,
        "status": praxis.status.value,
        "created_by_character_id": praxis.created_by_id,
        "task": {"id": task.id, "title": task.title},
        "era_id": praxis.era_id,
        "created_at": praxis.created_at.isoformat(),
        "submitted_at": _stamp(praxis.submitted_at),
        "media": [
            {"file": _archive_name(item.file_path), "type": item.type.value}
            if embedded
            else {"url": _media_url(item.file_path), "type": item.type.value}
            for item in items
        ],
    }


async def _characters(
    characters: list[Character], session: AsyncSession
) -> list[dict[str, Any]]:
    if not characters:
        return []
    ids = [character.id for character in characters]
    stats_rows = (
        await session.execute(
            select(CharacterStats)
            .where(CharacterStats.character_id.in_(ids))
            .order_by(CharacterStats.era_id)
        )
    ).scalars()
    stats_by_character: dict[int, list[CharacterStats]] = {}
    for row in stats_rows:
        stats_by_character.setdefault(row.character_id, []).append(row)

    history_rows = (
        await session.execute(
            select(FactionDefectionHistory)
            .where(FactionDefectionHistory.character_id.in_(ids))
            .order_by(FactionDefectionHistory.defected_at)
        )
    ).scalars()
    history_by_character: dict[int, list[FactionDefectionHistory]] = {}
    for row in history_rows:
        history_by_character.setdefault(row.character_id, []).append(row)

    return [
        {
            "id": character.id,
            "username": character.username,
            "display_name": character.display_name,
            "bio": character.bio,
            "tagline": character.tagline,
            "location": character.location,
            "avatar_url": character.avatar_url,
            "faction_slug": character.faction_slug,
            "status": character.status.value,
            "created_at": character.created_at.isoformat(),
            "departed_at": _stamp(character.departed_at),
            "stats": [
                {
                    "era_id": row.era_id,
                    "score": row.score,
                    "all_time_score": row.all_time_score,
                    "level": row.level,
                    "votes_spent_this_era": row.votes_spent_this_era,
                }
                for row in stats_by_character.get(character.id, [])
            ],
            "faction_history": [
                {
                    "faction_slug": row.faction_slug,
                    "era_id": row.era_id,
                    "defected_at": row.defected_at.isoformat(),
                }
                for row in history_by_character.get(character.id, [])
            ],
        }
        for character in characters
    ]


async def _votes_cast(account_id: int, session: AsyncSession) -> list[dict[str, Any]]:
    """By ``voter_account_id`` (ADR-0041), covering every life."""
    rows = (
        await session.execute(
            select(Vote).where(Vote.voter_account_id == account_id).order_by(Vote.id)
        )
    ).scalars()
    return [
        {
            "praxis_id": row.praxis_id,
            "value": row.value,
            "created_at": row.created_at.isoformat(),
        }
        for row in rows
    ]


async def _comments(
    character_ids: list[int], session: AsyncSession
) -> list[dict[str, Any]]:
    if not character_ids:
        return []
    rows = (
        await session.execute(
            select(Comment)
            .where(Comment.created_by_id.in_(character_ids))
            .order_by(Comment.id)
        )
    ).scalars()
    return [
        {
            "id": row.id,
            "praxis_id": row.praxis_id,
            "task_id": row.task_id,
            "body_text": row.body_text,
            "is_edited": row.is_edited,
            "is_withdrawn": row.is_withdrawn,
            "created_at": row.created_at.isoformat(),
        }
        for row in rows
    ]


def _stamp(value: datetime | None) -> str | None:
    return value.isoformat() if value else None

"""Everything an account holds, as one zip it can keep (#2158).

WHY THIS IS SYNCHRONOUS. The design asked for "we build a zip and email you a
link". A queue, somewhere to store the zip and an email sender are three things
this backend does not have — there is no job runner anywhere in ``backend/`` —
so the owner ruled (2026-08-17) that the button downloads the file then and
there. Nothing is stored, so there is nothing to expire, nothing to leak and no
pending state for the UI to read back.

WHY THE MEDIA IS EMBEDDED RATHER THAN LINKED. ``MEDIA_ROOT`` is a public static
mount, so a URL would work today. It would stop working the day World Zero does,
which is precisely the day an export matters. The bytes go in the file.

THE CEILING IS THE ONE THING THAT CAN BREAK THIS. Reading a heavy account's
uploads off the disk mount and pushing them through one request is the failure
mode, and it lands hardest on the players most likely to want an export. So the
total is measured *before* a single byte is read, and past
:data:`MEDIA_CEILING_BYTES` the archive carries URLs instead — the export is
smaller and honest rather than a request that dies at the proxy.

ponytail: no rate limiting, deliberately. This is an authenticated endpoint doing
a handful of indexed reads for one account, and its ceiling is
:data:`MEDIA_CEILING_BYTES` — the cost of a call is bounded by that, not by the
caller. A limiter for a button pressed twice a year is a guess at a problem.
Upgrade path if one is ever wanted: the same middleware any other write route
would use, keyed on ``account.id``, and this is the only route that would need a
different budget from the rest.
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

#: Total uploaded bytes above which the archive links its media instead of
#: carrying it. Sized against the request timeout rather than against disk:
#: 200 MB of already-compressed photos is a few seconds of streaming on a warm
#: mount, and the accounts that exceed it are the ones a synchronous export was
#: never going to serve.
MEDIA_CEILING_BYTES = 200 * BYTES_PER_MEGABYTE

#: Where the zip stops living in memory and starts living on disk. A typical
#: export is a few hundred KB of JSON and a dozen photos; a heavy one is most of
#: the ceiling, which no web dyno should hold in RAM.
SPOOL_TO_DISK_ABOVE_BYTES = 8 * BYTES_PER_MEGABYTE

#: Read size when handing the finished archive to the client.
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
  praxes           The proof you posted, with the task it answered. Praxes you
                   created and praxes you joined as a collaborator are both
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
    """Build the account's zip and return it open at byte zero, with a filename.

    The caller owns closing it. It is a ``SpooledTemporaryFile``, so a small
    export never touches the disk and a large one never sits in memory.
    """
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
    """Hand the archive out in chunks, then close it — including on a dropped
    connection, which is what the ``finally`` is for."""
    try:
        while chunk := archive_file.read(STREAM_CHUNK_BYTES):
            yield chunk
    finally:
        archive_file.close()


# --- the pieces -------------------------------------------------------------


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
    """Praxes these lives created **or** joined, each with the task it answered.

    Membership as well as authorship because that is what a player means by "my
    praxes": a collab they were invited into is theirs to keep a copy of, and it
    is the only record of work they did on somebody else's page.
    """
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
    """This account's own uploads on those praxes, keyed by praxis.

    ``MediaItem`` has no uploader column and does not need one:
    ``process_and_save_media`` writes to ``<uploader_character_id>/...``, so the
    leading path segment *is* the uploader. Filtering on it is what keeps a
    collaborator's photos on a shared praxis out of somebody else's export —
    the same predicate, and the same reasoning, as
    ``services.account_deletion._uploaded_media``.
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
    """Total size on disk, measured before anything is read.

    A row whose file is missing or is not ours to touch contributes nothing:
    ``resolve_stored_media_path`` is the repo's single "is this a file we own?"
    predicate, and a path it refuses is one this process must not stat.
    """
    total = 0
    for items in media_by_praxis.values():
        for item in items:
            absolute = resolve_stored_media_path(item.file_path)
            if absolute and os.path.isfile(absolute):
                total += os.path.getsize(absolute)
    return total


def _archive_name(file_path: str) -> str:
    """``media/<path>``, with forward slashes — zip entry names are never
    backslash-separated, and ``file_path`` carries the host's separator."""
    return f"{MEDIA_DIRECTORY}/{file_path.replace(os.sep, '/')}"


def _embed(archive: zipfile.ZipFile, file_path: str) -> None:
    """Copy one upload in, or skip it. A missing file is not an error the player
    can act on, and half an export beats a 500."""
    absolute = resolve_stored_media_path(file_path)
    if not absolute or not os.path.isfile(absolute):
        return
    # ZIP_STORED: photos and video are already compressed, so deflating them
    # spends the request's whole time budget to save nothing.
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
    """Scoped by ``voter_account_id``, not by character.

    That is the column the vote budget and the anti-self-voting rule are written
    against (ADR-0041), so it is the one that answers "did I cast this" across
    every life the account has ever carried.
    """
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

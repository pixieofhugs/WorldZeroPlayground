"""Ending an account: a tombstone, not an erasure (ADR-0081, #2160).

Rows are blanked, not deleted: a hard delete would cascade away other players'
votes, leave voters' ``votes_spent_this_era`` charged, and drop recipients'
scores on recalc. Only the OAuth identity and the files are deleted. No grace
period (no job runner). Never commits; file unlinks run last, after every flush.
"""

import hashlib
import logging
import os
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from game_config import CURRENT_ERA, EraConfig
from models.account import Account, AccountStatus, AccountTombstone, OAuthProvider
from models.character import Character
from models.comment import Comment
from models.praxis import MediaItem, Praxis
from models.praxis_room import PraxisRoomUpdate
from services.character import soft_delete_character
from services.media import delete_stored_media

logger = logging.getLogger(__name__)

#: Retention of a deleted account's hashed OAuth identity for the returning-player
#: gate (#2162), enforced purge-on-access in :func:`resolve_account_tombstone`.
#: ponytail: an unvisited tombstone outlives 90 days; add a periodic DELETE with
#: the same predicate once a job runner exists.
TOMBSTONE_RETENTION_DAYS = 90

#: Not an i18n key: it lands in a free-text column rendered verbatim (ADR-0031).
REMOVED_BODY_MARKER = "[removed]"

#: Shared on purpose: tombstones should be indistinguishable.
DELETED_DISPLAY_NAME = "Deleted player"

#: RFC 2606 reserved, so never collides; ``Account.email`` is unique + not null
#: and must be released so the person can sign up again.
DELETED_EMAIL_DOMAIN = "deleted.invalid"


def hash_provider_user_id(provider: str, provider_user_id: str) -> str:
    """Salted SHA-256 hex digest of an OAuth identifier.

    Salted with ``SECRET_KEY`` because provider ids are small enough to
    enumerate; ``provider`` is folded in so ids can't collide across providers.

    ponytail: rotating ``SECRET_KEY`` orphans every digest. Upgrade path: an
    ``ACCOUNT_DELETION_SALT`` setting defaulting to ``SECRET_KEY``.
    """
    salted = f"{settings.SECRET_KEY}:{provider}:{provider_user_id}".encode("utf-8")
    return hashlib.sha256(salted).hexdigest()


async def resolve_account_tombstone(
    provider: str, provider_user_id: str, session: AsyncSession
) -> AccountTombstone | None:
    """The live tombstone for this OAuth identity, purging it if expired.

    Called from ``services.auth.create_or_get_account`` for unknown identities;
    the return value feeds #2162's gate.
    """
    digest = hash_provider_user_id(provider, provider_user_id)
    tombstone = (
        await session.execute(
            select(AccountTombstone).where(
                AccountTombstone.provider == provider,
                AccountTombstone.provider_user_hash == digest,
            )
        )
    ).scalar_one_or_none()
    if tombstone is None:
        return None

    expiry = datetime.now(timezone.utc) - timedelta(days=TOMBSTONE_RETENTION_DAYS)
    if tombstone.created_at <= expiry:
        await session.delete(tombstone)
        await session.flush()
        return None
    return tombstone


async def delete_account(
    account_id: int,
    session: AsyncSession,
    era: EraConfig = CURRENT_ERA,
) -> None:
    """Blank an account and everything that identifies it. Irreversible; file
    unlinks run after every row change is flushed."""
    account = await session.get(Account, account_id)
    if account is None:  # pragma: no cover — the caller holds the row.
        return

    characters = (
        await session.execute(
            select(Character).where(Character.account_id == account_id)
        )
    ).scalars().all()
    character_ids = [character.id for character in characters]

    # Read before deletion: the stored path is the only record of the bytes.
    doomed_media = await _uploaded_media(character_ids, session)

    for character in characters:
        # Bans, stamps departed_at, forfeits duels (ADR-0011), unlinks avatar.
        await soft_delete_character(character.id, session, era)
        character.username = await _released_username(character.id, session)
        character.display_name = DELETED_DISPLAY_NAME
        character.bio = ""
        character.tagline = ""
        character.location = ""

    if character_ids:
        await _blank_authored_content(character_ids, session)

    await _replace_oauth_identity_with_a_tombstone(account, session)

    account.status = AccountStatus.deleted
    account.email = f"deleted-{account.id}@{DELETED_EMAIL_DOMAIN}"
    await session.flush()

    if doomed_media:
        await session.execute(
            delete(MediaItem).where(
                MediaItem.id.in_([media_id for media_id, _, _ in doomed_media])
            )
        )
        await session.flush()

    # Last: outside the transaction. Ownership guard in delete_stored_media.
    for _, character_id, file_path in doomed_media:
        delete_stored_media(file_path, character_id)


async def _uploaded_media(
    character_ids: list[int], session: AsyncSession
) -> list[tuple[int, int, str]]:
    """``(media_id, uploader_character_id, file_path)`` for what this account uploaded.

    The leading path segment is the uploader (``process_and_save_media``), so
    this catches uploads on others' collabs and spares collaborators' uploads.
    ``autoescape`` because the Windows separator is ``LIKE``'s escape char.
    """
    if not character_ids:
        return []
    prefixes = {os.path.join(str(cid), ""): cid for cid in character_ids}
    rows = (
        await session.execute(
            select(MediaItem).where(
                or_(
                    *(
                        MediaItem.file_path.startswith(prefix, autoescape=True)
                        for prefix in prefixes
                    )
                )
            )
        )
    ).scalars().all()
    doomed: list[tuple[int, int, str]] = []
    for row in rows:
        owner = next(
            (
                cid
                for prefix, cid in prefixes.items()
                if row.file_path.startswith(prefix)
            ),
            None,
        )
        if owner is not None:
            doomed.append((row.id, owner, row.file_path))
    return doomed


async def _blank_authored_content(
    character_ids: list[int], session: AsyncSession
) -> None:
    """Empty every praxis body and comment body these lives authored.

    ``praxis_room_update`` is DELETED: the CRDT retains text the author already
    removed, so blanking the body alone would keep the draft.

    ponytail: scoped to praxes this account created (author-of-record); a
    co-author's words go with it, and this account's words on others' collabs
    stay. Upgrade path: split by contributor via the room's CRDT.
    """
    authored_praxes = select(Praxis.id).where(Praxis.created_by_id.in_(character_ids))
    await session.execute(
        delete(PraxisRoomUpdate).where(PraxisRoomUpdate.praxis_id.in_(authored_praxes))
    )
    await session.execute(
        update(Praxis)
        .where(Praxis.created_by_id.in_(character_ids))
        .values(title=None, body_text=REMOVED_BODY_MARKER)
    )
    # is_withdrawn hides it from the comment list and @mention feed.
    await session.execute(
        update(Comment)
        .where(Comment.created_by_id.in_(character_ids))
        .values(body_text=REMOVED_BODY_MARKER, is_withdrawn=True)
    )


async def _replace_oauth_identity_with_a_tombstone(
    account: Account, session: AsyncSession
) -> None:
    """Delete the OAuth rows; keep provider + a salted digest of each identifier."""
    providers = (
        await session.execute(
            select(OAuthProvider).where(OAuthProvider.account_id == account.id)
        )
    ).scalars().all()

    for row in providers:
        digest = hash_provider_user_id(row.provider, row.provider_user_id)
        # Delete-rejoin-delete within retention: replace the unique pair.
        await session.execute(
            delete(AccountTombstone).where(
                AccountTombstone.provider == row.provider,
                AccountTombstone.provider_user_hash == digest,
            )
        )
        session.add(
            AccountTombstone(
                account_id=account.id,
                provider=row.provider,
                provider_user_hash=digest,
            )
        )
    await session.flush()

    await session.execute(
        delete(OAuthProvider).where(OAuthProvider.account_id == account.id)
    )


async def _released_username(character_id: int, session: AsyncSession) -> str:
    """``deleted-<id>``, suffixed if a player already holds that handle."""
    candidate = f"deleted-{character_id}"
    suffix = 2
    while (
        await session.scalar(
            select(Character.id).where(
                Character.username == candidate, Character.id != character_id
            )
        )
        is not None
    ):
        candidate = f"deleted-{character_id}-{suffix}"
        suffix += 1
    return candidate

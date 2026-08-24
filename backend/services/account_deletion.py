"""Ending an account: a tombstone, not an erasure (ADR-0081, #2160).

The rows stay and the identity goes. That is not a compromise, it is the only
shape that keeps the promise the confirmation dialog makes — *points you awarded
to other players stay with them* — because a hard delete cannot:

* ``Vote.praxis_id`` is ``ON DELETE CASCADE``, so destroying a departing
  player's praxes destroys **other people's** votes cast on them.
* ``votes_spent_this_era`` is a stored counter that a cascade cannot decrement.
  The one application path that deletes a vote
  (``services.vote.void_account_vote_on_join``) hand-decrements the caster's
  budget for exactly that reason; nothing hooks the cascade, so every player who
  voted on the departing player's work would stay charged for a vote that no
  longer exists.
* ``recalculate_character_stats`` recomputes score from live vote rows, so the
  next recalc on anyone the departing player voted for would drop their score.

So this module blanks rather than deletes, and the two things it *does* delete
are the two that carry no arithmetic: the OAuth identity, and the files on disk.

No grace period, by ruling. A recovery window means deferring the blanking to a
scheduled job and there is no job runner, so deletion happens in the request or
not at all. The service never commits — ``db.get_db`` owns that — with one
deliberate exception in ordering: the filesystem work is last, after every row
change has been flushed, so the window in which a rolled-back commit leaves a
file gone is as small as it can be. That is the same trade
``services.character.soft_delete_character`` documents, for the same reason.
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

#: How long a deleted account's hashed OAuth identity is kept so the
#: returning-player gate (#2162) can recognise someone coming back.
#:
#: Enforced **purge-on-access** in :func:`resolve_account_tombstone`, never by a
#: sweep. ponytail: its ceiling, stated plainly — a tombstone nobody ever
#: returns to keeps its digest past the ninety days, because the returning
#: player is the only clock it has. Upgrade path when a job runner exists: a
#: periodic ``DELETE FROM account_tombstone WHERE created_at < now() - 90 days``,
#: which is the same predicate this function already applies to one row.
TOMBSTONE_RETENTION_DAYS = 90

#: What a blanked praxis body or comment body reads as. A praxis row survives —
#: other people's votes point at it — so unlike a withdrawn comment it is still
#: rendered, and an empty string would draw a blank card rather than say what
#: happened. Deliberately not an i18n key: ADR-0031 has the backend emit keys for
#: copy the frontend owns, and this lands in a free-text column that every
#: surface renders verbatim, so a key would ship literally to the player.
REMOVED_BODY_MARKER = "[removed]"

#: The neutral name every departed life takes. Not unique, and does not need to
#: be: ``display_name`` has no constraint on it, and one shared placeholder is
#: the point — a tombstone should not be distinguishable from another tombstone.
DELETED_DISPLAY_NAME = "Deleted player"

#: ``.invalid`` is reserved by RFC 2606 and can never be issued, so no provider
#: can hand us an address that collides with a released one. That matters
#: because ``Account.email`` is ``unique`` and ``nullable=False``: the address
#: cannot be nulled, and it has to be *released* so the same person can sign up
#: again later without colliding with their own corpse.
DELETED_EMAIL_DOMAIN = "deleted.invalid"


def hash_provider_user_id(provider: str, provider_user_id: str) -> str:
    """The salted SHA-256 digest of an OAuth identifier — 64 lowercase hex chars.

    The salt is ``settings.SECRET_KEY``. A bare digest would be reversible in
    practice: a Google ``sub`` is a 21-digit number and a Discord snowflake is a
    64-bit integer, so anyone holding a copy of the database could enumerate
    either space and match a digest to a person. Salting with a value that lives
    only in the environment makes the stored row useless on its own, which is
    the whole reason the raw identifier is not kept.

    ``provider`` is folded into the digest as well as stored in the clear beside
    it, so two providers that hand out the same opaque id cannot produce the
    same hash — the same reasoning as ``OAuthProvider``'s unique pair.

    ponytail: rotating ``SECRET_KEY`` orphans every existing digest, and the
    returning-player gate silently stops recognising anyone deleted before the
    rotation. Accepted because a rotation already signs every player out (it
    invalidates every JWT) and because a dedicated ``ACCOUNT_DELETION_SALT``
    would be a second secret to provision on Render for no benefit until the
    first rotation. Upgrade path if that day comes: add the setting, default it
    to ``SECRET_KEY``, and rotate the two independently.
    """
    salted = f"{settings.SECRET_KEY}:{provider}:{provider_user_id}".encode("utf-8")
    return hashlib.sha256(salted).hexdigest()


async def resolve_account_tombstone(
    provider: str, provider_user_id: str, session: AsyncSession
) -> AccountTombstone | None:
    """The live tombstone for this OAuth identity, purging it if it has expired.

    Purge-on-access is the whole retention mechanism (see
    :data:`TOMBSTONE_RETENTION_DAYS`): somebody showing up *is* the trigger, so
    the read and the expiry are one operation and cannot drift apart.

    Called from ``services.auth.create_or_get_account`` on the branch that has
    no live OAuth row — which is every sign-in by an identity we do not
    currently know, including a returning deleted player. Its return value is
    what #2162's gate reads to offer "start fresh as a new player"; today the
    call is made for the purge.
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
    """Blank an account and everything that identifies it. Irreversible.

    Ordered so that the destructive half runs last: every row change is flushed
    before a single file is unlinked, because a file cannot be rolled back and a
    row can.
    """
    account = await session.get(Account, account_id)
    if account is None:  # pragma: no cover — the caller holds the row.
        return

    characters = (
        await session.execute(
            select(Character).where(Character.account_id == account_id)
        )
    ).scalars().all()
    character_ids = [character.id for character in characters]

    # Read the media rows before anything deletes them: the stored path is the
    # only record of where the bytes are.
    doomed_media = await _uploaded_media(character_ids, session)

    for character in characters:
        # The existing end-a-life path: bans, stamps ``departed_at``, forfeits
        # settled duels (ADR-0011) and unlinks the avatar. Every one of those is
        # owed here too, and none of it is worth a second implementation.
        await soft_delete_character(character.id, session, era)
        character.username = await _released_username(character.id, session)
        character.display_name = DELETED_DISPLAY_NAME
        character.bio = ""
        character.tagline = ""
        # Not on the issue's list, and blanked anyway: a real-world town is the
        # most identifying free-text field a character carries, and leaving it
        # on a tombstone would be the same defect as leaving the bio.
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

    # Last, and outside the transaction's protection by necessity. Each unlink
    # re-derives its own ownership guard from the character id — see
    # ``services.media.delete_stored_media``.
    for _, character_id, file_path in doomed_media:
        delete_stored_media(file_path, character_id)


async def _uploaded_media(
    character_ids: list[int], session: AsyncSession
) -> list[tuple[int, int, str]]:
    """``(media_id, uploader_character_id, file_path)`` for what this account uploaded.

    ``MediaItem`` has no uploader column, and it does not need one:
    ``process_and_save_media`` writes each upload to
    ``<uploader_character_id>/<praxis_id>/<unique>/``, so the leading path
    segment *is* the uploader. That makes this the right question in both
    directions — it catches the account's photos sitting on somebody else's
    collab praxis, and it leaves a collaborator's photos alone on the account's
    own praxis, which is where a "delete my praxes' media" query would have got
    it exactly backwards.

    The prefix is built with ``os.path.join`` so it carries the same separator
    the rows were written with on this platform, and ``startswith`` is autoescaped
    because that separator is a backslash on Windows, which is PostgreSQL's
    default ``LIKE`` escape character.
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

    Bulk statements rather than a loop: this is one predicate over three tables
    and the rows are never read back in this request.

    ``praxis_room_update`` is **deleted**, not blanked, and that is the
    non-obvious half. It is the CRDT document behind the composer, and a CRDT
    retains tombstones — text the author typed and then deleted is still in
    there. Emptying ``praxis.body_text`` while leaving the room rows would
    therefore blank the record and keep the draft, including material the player
    had already removed themselves. ``models/praxis_room.py`` says the same
    thing about its cascade: the draft must not outlive what it was a draft of.

    ponytail: scoped to praxes this account **created**. A collab praxis it
    created is blanked whole, so a co-author's contribution goes with it, and a
    collab praxis someone else created keeps this account's words. That is the
    author-of-record line the rest of the codebase already draws
    (``services.praxis.delete_praxis`` is creator-only), and splitting a shared
    document by contributor is not a thing the schema can answer. Upgrade path
    if it ever must: the room's CRDT does know who typed what.
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
    # ``is_withdrawn`` as well as the blank body: it is the existing author
    # soft-delete flag (``services.comment.withdraw_comment``), and it is what
    # the comment list and the @mention feed already filter on — so setting it
    # takes the removed comment out of both instead of rendering the marker
    # under a tombstone's name.
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
        # A player may delete, sign up again with the same provider identity and
        # delete again inside the retention window. The pair is unique, so the
        # earlier row has to go or the second deletion would fail on a
        # constraint — and the newer tombstone is the true one anyway.
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
    """``deleted-<id>``, suffixed if a player has literally claimed that handle.

    ``Character.username`` is UNIQUE, and ``CharacterCreate`` still accepts an
    explicit handle with no charset restriction, so ``deleted-42`` is a name
    somebody can hold. A unique violation here would fail the one request that
    must not fail halfway through, so the probe is insurance rather than
    speculation — the same shape, and the same reasoning, as
    ``services.character._derive_unique_username``.
    """
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

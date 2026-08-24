"""Deleting an account is a tombstone, not an erasure (ADR-0081, #2160).

**Seam under test:** ``services.account_deletion.delete_account`` against a real
database and a real ``MEDIA_ROOT``, plus the one route that drives it. Every
promise the flow makes is a statement about what that function leaves behind —
that other players' votes and budgets are untouched, that nothing identifying
survives, that the files are off the disk — so the assertions are about the rows
and the filesystem after it returns, not about a response body.

The votes half is the load-bearing one. It is what a hard delete could not do:
``Vote.praxis_id`` is ``ON DELETE CASCADE``, and the only application path that
deletes a vote (``services.vote.void_account_vote_on_join``) hand-decrements the
caster's budget precisely because a cascade cannot. Destroying a departing
player's praxes therefore takes other people's votes with them and leaves those
people charged for votes that no longer exist.
"""

import os
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.account import (
    Account,
    AccountStatus,
    AccountTombstone,
    AuthProvider,
    OAuthProvider,
)
from models.character import Character, CharacterStatus
from models.character_stats import CharacterStats
from models.comment import Comment
from models.era import Era
from models.praxis import MediaItem, MediaType
from models.praxis_room import PraxisRoomUpdate
from models.vote import Vote
from services.account_deletion import (
    DELETED_DISPLAY_NAME,
    REMOVED_BODY_MARKER,
    TOMBSTONE_RETENTION_DAYS,
    delete_account,
    hash_provider_user_id,
    resolve_account_tombstone,
)
from services.auth import create_or_get_account
from services.character_stats import recalculate_character_stats
from tests.integration.factories import (
    cast_vote,
    make_character,
    make_solo_praxis,
    make_task,
)


@pytest.fixture
def media_root(tmp_path, monkeypatch):
    root = tmp_path / "media"
    root.mkdir()
    monkeypatch.setattr(settings, "MEDIA_ROOT", str(root))
    return root


def _write_media_file(media_root, *segments: str) -> str:
    """Write a file the way ``process_and_save_media`` does; return the stored path."""
    relative_path = os.path.join(*segments)
    absolute_path = os.path.join(str(media_root), relative_path)
    os.makedirs(os.path.dirname(absolute_path), exist_ok=True)
    with open(absolute_path, "wb") as handle:
        handle.write(b"evidence")
    return relative_path


# ---------------------------------------------------------------------------
# The finding that decides the whole design
# ---------------------------------------------------------------------------


async def test_votes_the_departing_player_cast_still_count_for_the_recipient(
    db_session: AsyncSession, era: Era, character: Character, character2: Character
) -> None:
    """The promise on the confirm dialog: *points you awarded others stay with them*."""
    task = await make_task(db_session, character2, title="stays")
    praxis = await make_solo_praxis(db_session, task, character2)
    await cast_vote(db_session, praxis, character, 5)

    await recalculate_character_stats(character2.id, db_session)
    stats = (
        await db_session.execute(
            select(CharacterStats).where(CharacterStats.character_id == character2.id)
        )
    ).scalar_one()
    score_before = stats.score
    assert score_before > 0, "the fixture must score the praxis or this proves nothing"

    await delete_account(character.account_id, db_session)
    await db_session.flush()

    surviving = (
        await db_session.execute(select(Vote).where(Vote.praxis_id == praxis.id))
    ).scalars().all()
    assert len(surviving) == 1, "the vote row is the thing the tombstone exists to keep"

    await recalculate_character_stats(character2.id, db_session)
    await db_session.refresh(stats)
    assert stats.score == score_before


async def test_a_voter_on_the_departing_players_work_keeps_their_budget(
    db_session: AsyncSession, era: Era, character: Character, character2: Character
) -> None:
    """The vote rows *incoming* survive too, so nobody stays charged for nothing.

    ``votes_spent_this_era`` is a stored counter and a cascade cannot decrement
    it; ``recompute_votes_spent_this_era`` rests on "the counter equals that
    character's vote rows". Blanking keeps both halves true.
    """
    task = await make_task(db_session, character, title="voted on")
    praxis = await make_solo_praxis(db_session, task, character)
    await cast_vote(db_session, praxis, character2, 4)
    voter_stats = (
        await db_session.execute(
            select(CharacterStats).where(CharacterStats.character_id == character2.id)
        )
    ).scalar_one()
    voter_stats.votes_spent_this_era = 1
    await db_session.flush()

    await delete_account(character.account_id, db_session)
    await db_session.flush()

    rows = (
        await db_session.execute(
            select(Vote).where(Vote.voter_character_id == character2.id)
        )
    ).scalars().all()
    assert len(rows) == 1
    await db_session.refresh(voter_stats)
    assert voter_stats.votes_spent_this_era == 1


# ---------------------------------------------------------------------------
# What goes
# ---------------------------------------------------------------------------


async def test_identity_is_blanked_across_account_character_praxis_and_comment(
    db_session: AsyncSession, era: Era, character: Character, character2: Character
) -> None:
    account_id = character.account_id
    original_email = (await db_session.get(Account, account_id)).email
    character.bio = "I live at 14 Elm Street"
    character.tagline = "always running"
    character.location = "Brighton"
    task = await make_task(db_session, character2, title="host")
    praxis = await make_solo_praxis(
        db_session, task, character, title="My real name", body_text="my diary"
    )
    db_session.add(PraxisRoomUpdate(praxis_id=praxis.id, update=b"crdt draft bytes"))
    comment = Comment(
        praxis_id=praxis.id, created_by_id=character.id, body_text="my phone number"
    )
    db_session.add(comment)
    await db_session.flush()

    await delete_account(account_id, db_session)
    await db_session.flush()

    account = await db_session.get(Account, account_id)
    assert account.status is AccountStatus.deleted
    assert account.email != original_email
    assert str(account_id) in account.email and account.email.endswith(".invalid")

    await db_session.refresh(character)
    assert character.status is CharacterStatus.banned
    assert character.departed_at is not None
    assert character.display_name == DELETED_DISPLAY_NAME
    assert character.username != "testcharacter"
    assert (character.bio, character.tagline, character.location) == ("", "", "")
    assert character.avatar_url == ""

    await db_session.refresh(praxis)
    assert praxis.title is None
    assert praxis.body_text == REMOVED_BODY_MARKER

    await db_session.refresh(comment)
    assert comment.body_text == REMOVED_BODY_MARKER
    assert comment.is_withdrawn is True

    drafts = (
        await db_session.execute(
            select(PraxisRoomUpdate).where(PraxisRoomUpdate.praxis_id == praxis.id)
        )
    ).scalars().all()
    assert drafts == [], (
        "the CRDT draft retains deleted text; blanking the body is not enough"
    )


async def test_the_email_is_released_for_a_fresh_signup(
    db_session: AsyncSession, era: Era, character: Character
) -> None:
    """The same person may come back — into a NEW account, never their corpse."""
    account_id = character.account_id
    email = (await db_session.get(Account, account_id)).email

    await delete_account(account_id, db_session)
    await db_session.flush()

    reborn = await create_or_get_account(
        provider=AuthProvider.GOOGLE,
        provider_user_id="google-sub-1",
        email=email,
        email_verified=True,
        session=db_session,
    )
    assert reborn.id != account_id
    assert reborn.status is AccountStatus.active


async def test_a_second_life_on_the_account_ends_too(
    db_session: AsyncSession, era: Era, character: Character
) -> None:
    second = await make_character(
        db_session, era, username="secondlife", account=await db_session.get(
            Account, character.account_id
        )
    )

    await delete_account(character.account_id, db_session)
    await db_session.flush()

    await db_session.refresh(second)
    assert second.status is CharacterStatus.banned
    assert second.departed_at is not None
    assert second.display_name == DELETED_DISPLAY_NAME


# ---------------------------------------------------------------------------
# Media actually leaves the disk
# ---------------------------------------------------------------------------


async def test_media_the_account_uploaded_leaves_the_disk_with_its_row(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    character2: Character,
    media_root,
) -> None:
    task = await make_task(db_session, character2, title="host")
    praxis = await make_solo_praxis(db_session, task, character)
    stored = _write_media_file(
        media_root, str(character.id), str(praxis.id), "u1", "p.jpg"
    )
    item = MediaItem(praxis_id=praxis.id, type=MediaType.image, file_path=stored)
    character.avatar_url = _write_media_file(
        media_root, str(character.id), "avatar", "u2", "face.jpg"
    )
    db_session.add(item)
    await db_session.flush()

    await delete_account(character.account_id, db_session)
    await db_session.flush()

    assert not os.path.exists(os.path.join(str(media_root), stored))
    avatar = character.avatar_url or "never-written"
    assert not os.path.exists(os.path.join(str(media_root), avatar))
    remaining = (
        await db_session.execute(
            select(MediaItem).where(MediaItem.praxis_id == praxis.id)
        )
    ).scalars().all()
    assert remaining == []


async def test_media_belonging_to_another_character_is_never_unlinked(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    character2: Character,
    media_root,
) -> None:
    """Trust boundary: ``file_path`` and ``avatar_url`` are public, and one is
    player-writable. Pointing your own row at someone else's file must not turn
    your account deletion into a delete primitive for their media."""
    task = await make_task(db_session, character, title="host")
    mine = await make_solo_praxis(db_session, task, character)
    theirs = _write_media_file(
        media_root, str(character2.id), str(mine.id), "u3", "victim.jpg"
    )
    db_session.add(
        MediaItem(praxis_id=mine.id, type=MediaType.image, file_path=theirs)
    )
    character.avatar_url = theirs
    await db_session.flush()

    await delete_account(character.account_id, db_session)
    await db_session.flush()

    assert os.path.exists(os.path.join(str(media_root), theirs))


async def test_a_missing_file_does_not_break_the_deletion(
    db_session: AsyncSession,
    era: Era,
    character: Character,
    character2: Character,
    media_root,
) -> None:
    task = await make_task(db_session, character2, title="host")
    praxis = await make_solo_praxis(db_session, task, character)
    db_session.add(
        MediaItem(
            praxis_id=praxis.id,
            type=MediaType.image,
            file_path=os.path.join(str(character.id), str(praxis.id), "gone", "p.jpg"),
        )
    )
    await db_session.flush()

    await delete_account(character.account_id, db_session)
    await db_session.flush()

    assert (await db_session.get(Account, character.account_id)).status is (
        AccountStatus.deleted
    )


# ---------------------------------------------------------------------------
# The retained identity, and its 90-day clock
# ---------------------------------------------------------------------------


async def test_oauth_rows_go_and_a_salted_digest_stays(
    db_session: AsyncSession, era: Era, character: Character
) -> None:
    db_session.add(
        OAuthProvider(
            account_id=character.account_id,
            provider=AuthProvider.GOOGLE,
            provider_user_id="107 raw google sub",
        )
    )
    await db_session.flush()

    await delete_account(character.account_id, db_session)
    await db_session.flush()

    assert (
        await db_session.execute(
            select(OAuthProvider).where(
                OAuthProvider.account_id == character.account_id
            )
        )
    ).scalars().all() == []

    tombstone = (
        await db_session.execute(select(AccountTombstone))
    ).scalar_one()
    assert tombstone.provider == AuthProvider.GOOGLE
    assert tombstone.provider_user_hash != "107 raw google sub"
    assert len(tombstone.provider_user_hash) == 64
    assert tombstone.provider_user_hash == hash_provider_user_id(
        AuthProvider.GOOGLE, "107 raw google sub"
    )


async def test_a_returning_identity_resolves_to_its_tombstone(
    db_session: AsyncSession, era: Era, character: Character
) -> None:
    db_session.add(
        OAuthProvider(
            account_id=character.account_id,
            provider=AuthProvider.GOOGLE,
            provider_user_id="sub-returning",
        )
    )
    await db_session.flush()
    await delete_account(character.account_id, db_session)
    await db_session.flush()

    found = await resolve_account_tombstone(
        AuthProvider.GOOGLE, "sub-returning", db_session
    )
    assert found is not None and found.account_id == character.account_id
    assert (
        await resolve_account_tombstone(AuthProvider.GOOGLE, "someone-else", db_session)
    ) is None


async def test_an_expired_tombstone_is_purged_on_access(
    db_session: AsyncSession, era: Era, character: Character
) -> None:
    db_session.add(
        OAuthProvider(
            account_id=character.account_id,
            provider=AuthProvider.GOOGLE,
            provider_user_id="sub-old",
        )
    )
    await db_session.flush()
    await delete_account(character.account_id, db_session)
    await db_session.flush()

    tombstone = (await db_session.execute(select(AccountTombstone))).scalar_one()
    tombstone.created_at = datetime.now(timezone.utc) - timedelta(
        days=TOMBSTONE_RETENTION_DAYS + 1
    )
    await db_session.flush()

    assert (
        await resolve_account_tombstone(AuthProvider.GOOGLE, "sub-old", db_session)
    ) is None
    assert (await db_session.execute(select(AccountTombstone))).scalars().all() == []


async def test_deleting_twice_inside_the_window_replaces_the_tombstone(
    db_session: AsyncSession, era: Era, character: Character, character2: Character
) -> None:
    """Delete, sign up again, delete again. The unique pair must not 500 the second."""
    for owner in (character, character2):
        db_session.add(
            OAuthProvider(
                account_id=owner.account_id,
                provider=AuthProvider.GOOGLE,
                provider_user_id="same-human",
            )
        )
        await db_session.flush()
        await delete_account(owner.account_id, db_session)
        await db_session.flush()

    found = await resolve_account_tombstone(
        AuthProvider.GOOGLE, "same-human", db_session
    )
    assert found is not None and found.account_id == character2.account_id


# ---------------------------------------------------------------------------
# The route
# ---------------------------------------------------------------------------


async def test_delete_me_account_ends_the_session(
    client, auth_headers: dict, db_session: AsyncSession, era: Era, character: Character
) -> None:
    response = await client.delete("/me/account", headers=auth_headers)
    assert response.status_code == 204

    # Sign-in blocked: the JWT names an account that is no longer active.
    assert (await client.get("/auth/me", headers=auth_headers)).status_code == 401


async def test_delete_me_account_requires_a_session(client) -> None:
    assert (await client.delete("/me/account")).status_code == 401

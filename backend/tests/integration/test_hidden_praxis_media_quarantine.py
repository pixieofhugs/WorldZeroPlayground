"""A hidden praxis's media leaves the unauthenticated /media mount (#1593).

The seam under test is the pair that used to disagree: ``services.praxis.
moderate_praxis`` — the only writer that moves a praxis into or out of
``hidden`` — and the ``StaticFiles`` mount in ``main``. Everything here drives
the admin route and then asks the mount, because "the praxis is hidden" and "the
URL 404s" were two different facts before this change.

``failed`` is deliberately on the other side of the line: ``models.praxis`` says
it keeps its banner and its place in the feed, so its media must keep serving.
That assertion is what distinguishes this change from the wrong one, which would
have used the scoring set ``UNSCORED_MODERATION_STATUSES`` as the predicate.
"""

import os

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from main import app
from models.account import Account
from models.character import Character
from models.praxis import MediaItem, MediaType, Praxis
from services.media import quarantine_root
from services.media_sweep import find_orphans, load_known_paths, scan_media_root
from tests.integration.factories import make_admin


FILE_BYTES = b"praxis evidence bytes"


@pytest.fixture
def mounted_media_root(tmp_path, monkeypatch):
    """Point both MEDIA_ROOT and the live ``/media`` mount at a temp directory.

    The mount is built at import time from ``settings.MEDIA_ROOT``, so patching
    the setting alone moves the service's writes without moving what Starlette
    serves — and this test needs the two to agree or it proves nothing.
    """
    root = tmp_path / "media"
    root.mkdir()
    monkeypatch.setattr(settings, "MEDIA_ROOT", str(root))

    static = next(route.app for route in app.routes if getattr(route, "name", "") == "media")
    monkeypatch.setattr(static, "directory", str(root))
    monkeypatch.setattr(static, "all_directories", [str(root)])
    return root


async def _attach_media(
    db_session: AsyncSession, praxis: Praxis, character: Character, media_root
) -> str:
    """Write one media file the way ``process_and_save_media`` does; return its stored path."""
    relative_path = os.path.join(str(character.id), str(praxis.id), "abc123", "proof.jpg")
    absolute_path = os.path.join(str(media_root), relative_path)
    os.makedirs(os.path.dirname(absolute_path), exist_ok=True)
    with open(absolute_path, "wb") as handle:
        handle.write(FILE_BYTES)

    db_session.add(
        MediaItem(
            praxis_id=praxis.id,
            type=MediaType.image,
            file_path=relative_path,
            display_order=0,
        )
    )
    await db_session.commit()
    return relative_path


def _media_url(relative_path: str) -> str:
    return "/media/" + relative_path.replace(os.sep, "/")


def _quarantined(relative_path: str) -> str:
    return os.path.join(quarantine_root(), relative_path)


async def _moderate(client: AsyncClient, praxis: Praxis, status: str, headers: dict):
    resp = await client.patch(
        f"/admin/praxes/{praxis.id}/moderate",
        json={"status": status},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["moderation_status"] == status
    return resp


@pytest.mark.asyncio
async def test_hiding_a_praxis_withdraws_its_media_from_the_mount(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
    db_session: AsyncSession,
    character: Character,
    praxis_solo: Praxis,
    mounted_media_root,
):
    """Hidden means the file is off the mount, the URL 404s, and the bytes survive."""
    await make_admin(db_session, account)
    relative_path = await _attach_media(db_session, praxis_solo, character, mounted_media_root)

    assert (await client.get(_media_url(relative_path))).status_code == 200

    await _moderate(client, praxis_solo, "hidden", auth_headers)

    assert not os.path.exists(os.path.join(str(mounted_media_root), relative_path))
    assert (await client.get(_media_url(relative_path))).status_code == 404

    # Evidence preserved (#1592's ruling): publication withdrawn, file kept.
    quarantined = _quarantined(relative_path)
    assert os.path.isfile(quarantined)
    with open(quarantined, "rb") as handle:
        assert handle.read() == FILE_BYTES


@pytest.mark.asyncio
async def test_unhiding_a_praxis_restores_its_media(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
    db_session: AsyncSession,
    character: Character,
    praxis_solo: Praxis,
    mounted_media_root,
):
    """The move reverses: back to visible, back on disk, back on the URL."""
    await make_admin(db_session, account)
    relative_path = await _attach_media(db_session, praxis_solo, character, mounted_media_root)

    await _moderate(client, praxis_solo, "hidden", auth_headers)
    assert os.path.isfile(_quarantined(relative_path))

    await _moderate(client, praxis_solo, "visible", auth_headers)

    restored = os.path.join(str(mounted_media_root), relative_path)
    assert os.path.isfile(restored)
    assert not os.path.exists(_quarantined(relative_path))

    resp = await client.get(_media_url(relative_path))
    assert resp.status_code == 200
    assert resp.content == FILE_BYTES


@pytest.mark.asyncio
async def test_failed_praxis_media_is_untouched_and_still_serves(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
    db_session: AsyncSession,
    character: Character,
    praxis_solo: Praxis,
    mounted_media_root,
):
    """``failed`` is a scoring ruling, not a takedown — it keeps its place and its media.

    The predicate is the status, not ``UNSCORED_MODERATION_STATUSES``, which
    also holds ``failed`` and would have quarantined a praxis that the feed
    still displays.
    """
    await make_admin(db_session, account)
    relative_path = await _attach_media(db_session, praxis_solo, character, mounted_media_root)

    await _moderate(client, praxis_solo, "failed", auth_headers)

    assert os.path.isfile(os.path.join(str(mounted_media_root), relative_path))
    assert not os.path.exists(_quarantined(relative_path))
    resp = await client.get(_media_url(relative_path))
    assert resp.status_code == 200
    assert resp.content == FILE_BYTES


@pytest.mark.asyncio
async def test_hiding_a_praxis_that_moved_to_failed_restores_its_media(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
    db_session: AsyncSession,
    character: Character,
    praxis_solo: Praxis,
    mounted_media_root,
):
    """hidden → failed is a move back onto the site, so the media comes back with it."""
    await make_admin(db_session, account)
    relative_path = await _attach_media(db_session, praxis_solo, character, mounted_media_root)

    await _moderate(client, praxis_solo, "hidden", auth_headers)
    assert os.path.isfile(_quarantined(relative_path))

    await _moderate(client, praxis_solo, "failed", auth_headers)

    assert os.path.isfile(os.path.join(str(mounted_media_root), relative_path))
    assert (await client.get(_media_url(relative_path))).status_code == 200


@pytest.mark.asyncio
async def test_repeated_hide_and_missing_file_do_not_raise(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
    db_session: AsyncSession,
    character: Character,
    praxis_solo: Praxis,
    mounted_media_root,
):
    """Both legs are best-effort: a second hide, and a hide with nothing to move.

    A file that is already quarantined, or that was never written at all, is not
    an error condition — moderation must land regardless of what the disk holds.
    """
    await make_admin(db_session, account)
    relative_path = await _attach_media(db_session, praxis_solo, character, mounted_media_root)

    await _moderate(client, praxis_solo, "hidden", auth_headers)
    # Hiding an already-hidden praxis: the source file is gone from the mount.
    await _moderate(client, praxis_solo, "hidden", auth_headers)
    assert os.path.isfile(_quarantined(relative_path))
    assert (await client.get(_media_url(relative_path))).status_code == 404

    # Now lose the quarantined file too — a restore with nothing to restore.
    os.remove(_quarantined(relative_path))
    await _moderate(client, praxis_solo, "visible", auth_headers)
    assert (await client.get(_media_url(relative_path))).status_code == 404


@pytest.mark.asyncio
async def test_quarantine_is_invisible_to_the_orphan_sweeper(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
    db_session: AsyncSession,
    character: Character,
    praxis_solo: Praxis,
    mounted_media_root,
):
    """The sweeper never sees quarantine, so it can never call it an orphan.

    This is why the directory is a SIBLING of MEDIA_ROOT. Inside it, the file
    would be scanned, and no row would claim it *at that path* — so a dry run
    would list for deletion exactly the evidence a hide preserves.
    """
    await make_admin(db_session, account)
    relative_path = await _attach_media(db_session, praxis_solo, character, mounted_media_root)
    await _moderate(client, praxis_solo, "hidden", auth_headers)

    root = str(mounted_media_root)
    assert os.path.isfile(_quarantined(relative_path))
    assert not quarantine_root().startswith(os.path.realpath(root) + os.sep)

    scanned, escaping = scan_media_root(root)
    known = await load_known_paths(db_session, root)
    report = find_orphans(root, scanned, escaping, known, min_age_seconds=0.0)

    quarantined = os.path.realpath(_quarantined(relative_path))
    assert quarantined not in {item.absolute_path for item in report.scanned}
    assert report.orphans == ()
    assert report.escaping == ()

"""A hidden praxis's media leaves the unauthenticated /media mount (#1593).

Drives ``moderate_praxis`` via the admin route, then asks the mount. ``failed``
keeps serving: the predicate is ``hidden``, not ``UNSCORED_MODERATION_STATUSES``.
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
    """Patch both: the mount reads ``MEDIA_ROOT`` at import time."""
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
    await make_admin(db_session, account)
    relative_path = await _attach_media(db_session, praxis_solo, character, mounted_media_root)

    assert (await client.get(_media_url(relative_path))).status_code == 200

    await _moderate(client, praxis_solo, "hidden", auth_headers)

    assert not os.path.exists(os.path.join(str(mounted_media_root), relative_path))
    assert (await client.get(_media_url(relative_path))).status_code == 404

    # Evidence preserved (#1592).
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
    """``failed`` is a scoring ruling, not a takedown — it keeps its place and its
    media."""
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
    """Best-effort: moderation lands whatever the disk holds."""
    await make_admin(db_session, account)
    relative_path = await _attach_media(db_session, praxis_solo, character, mounted_media_root)

    await _moderate(client, praxis_solo, "hidden", auth_headers)
    await _moderate(client, praxis_solo, "hidden", auth_headers)
    assert os.path.isfile(_quarantined(relative_path))
    assert (await client.get(_media_url(relative_path))).status_code == 404

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
    """Why quarantine sits beside MEDIA_ROOT: inside, the sweeper sees an orphan."""
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

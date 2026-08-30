"""``GET /me/export`` — the synchronous zip of everything an account holds (#2158).

THE SEAM IS THE ROUTE, not the builder. What this feature promises is a file a
player can open years from now, and the two ways it breaks are both on the far
side of the handler: a zip whose media is missing, and a zip whose media is so
large the request never finishes. Both are only visible once the bytes have been
through ``StreamingResponse`` and back out of ``zipfile``, so every test here
opens the real archive.
"""
import io
import json
import os
import zipfile

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.account import Account
from models.character import Character
from models.era import Era
from models.faction import Faction
from models.praxis import MediaItem, MediaType, Praxis
from models.vote import Vote
from services import data_export

PHOTO_BYTES = b"\xff\xd8\xff" + b"pretend jpeg" * 8


async def _add_media(
    db_session: AsyncSession,
    praxis: Praxis,
    uploader: Character,
    media_root: str,
    *,
    payload: bytes = PHOTO_BYTES,
    filename: str = "proof.jpg",
) -> MediaItem:
    """One uploaded file, on disk and in the table, at the path the app writes.

    ``<uploader_character_id>/<praxis_id>/<unique>/<name>`` — the layout
    ``services.media.process_and_save_media`` uses and the one the export reads
    ownership out of.
    """
    relative = os.path.join(str(uploader.id), str(praxis.id), "abc123", filename)
    absolute = os.path.join(media_root, relative)
    os.makedirs(os.path.dirname(absolute), exist_ok=True)
    with open(absolute, "wb") as handle:
        handle.write(payload)
    item = MediaItem(praxis_id=praxis.id, type=MediaType.image, file_path=relative)
    db_session.add(item)
    await db_session.commit()
    return item


async def _fetch_zip(client: AsyncClient, auth_headers: dict) -> zipfile.ZipFile:
    response = await client.get("/me/export", headers=auth_headers)
    assert response.status_code == 200, response.text
    assert response.headers["content-type"] == "application/zip"
    return zipfile.ZipFile(io.BytesIO(response.content))


def _manifest(archive: zipfile.ZipFile) -> dict:
    return json.loads(archive.read("export.json").decode("utf-8"))


@pytest.mark.asyncio
async def test_export_is_a_readable_zip_carrying_the_account_and_its_praxes(
    client: AsyncClient,
    account: Account,
    character: Character,
    praxis_solo: Praxis,
    auth_headers: dict,
):
    """The plain case: an openable archive, a README, and the player's own words."""
    archive = await _fetch_zip(client, auth_headers)
    names = set(archive.namelist())
    assert "README.txt" in names
    assert "export.json" in names

    manifest = _manifest(archive)
    assert manifest["account"]["email"] == account.email
    assert manifest["characters"][0]["username"] == character.username
    bodies = [praxis["body_text"] for praxis in manifest["praxes"]]
    assert praxis_solo.body_text in bodies


@pytest.mark.asyncio
async def test_export_embeds_the_bytes_of_media_this_account_uploaded(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    praxis_solo: Praxis,
    auth_headers: dict,
    tmp_path,
    monkeypatch,
):
    """A photo comes out of the zip byte-identical — that is the whole promise."""
    monkeypatch.setattr(settings, "MEDIA_ROOT", str(tmp_path))
    item = await _add_media(db_session, praxis_solo, character, str(tmp_path))

    archive = await _fetch_zip(client, auth_headers)

    entry = f"media/{item.file_path.replace(os.sep, '/')}"
    assert entry in archive.namelist()
    assert archive.read(entry) == PHOTO_BYTES

    manifest = _manifest(archive)
    assert manifest["media"] == "embedded"
    files = [media["file"] for media in manifest["praxes"][0]["media"]]
    assert entry in files


@pytest.mark.asyncio
async def test_export_over_the_ceiling_links_media_instead_of_embedding_it(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    praxis_solo: Praxis,
    auth_headers: dict,
    tmp_path,
    monkeypatch,
):
    """Past the ceiling the archive carries URLs, and says so where a reader looks.

    The failure this guards is a heavy account hitting the request timeout, so
    the assertion that matters is the *absence* of the bytes.
    """
    monkeypatch.setattr(settings, "MEDIA_ROOT", str(tmp_path))
    monkeypatch.setattr(data_export, "MEDIA_CEILING_BYTES", 1)
    item = await _add_media(db_session, praxis_solo, character, str(tmp_path))

    archive = await _fetch_zip(client, auth_headers)

    assert not [name for name in archive.namelist() if name.startswith("media/")]
    manifest = _manifest(archive)
    assert manifest["media"] == "linked"
    urls = [media["url"] for media in manifest["praxes"][0]["media"]]
    assert urls == [
        f"{settings.MEDIA_BASE_URL.rstrip('/')}/{item.file_path.replace(os.sep, '/')}"
    ]
    # The README is the only thing most readers will open.
    assert "too large" in archive.read("README.txt").decode("utf-8").lower()


@pytest.mark.asyncio
async def test_export_lists_the_votes_this_account_cast(
    client: AsyncClient,
    db_session: AsyncSession,
    account2: Account,
    character2: Character,
    vote: Vote,
    auth_headers2: dict,
    era: Era,
    some_faction: Faction,
):
    """`votes_cast` is the caster's copy of a row that survives their deletion."""
    archive = await _fetch_zip(client, auth_headers2)
    manifest = _manifest(archive)
    assert manifest["votes_cast"] == [
        {
            "praxis_id": vote.praxis_id,
            "value": vote.value,
            "created_at": vote.created_at.isoformat(),
        }
    ]
    assert "votes you cast" in archive.read("README.txt").decode("utf-8").lower()


@pytest.mark.asyncio
async def test_export_leaves_another_players_uploads_alone(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    praxis_collab: Praxis,
    auth_headers: dict,
    tmp_path,
    monkeypatch,
):
    """A collaborator's photo on my collab praxis is their data, not mine.

    Ownership is the leading path segment, exactly as
    ``services.account_deletion._uploaded_media`` reads it.
    """
    monkeypatch.setattr(settings, "MEDIA_ROOT", str(tmp_path))
    mine = await _add_media(db_session, praxis_collab, character, str(tmp_path))
    theirs = await _add_media(
        db_session, praxis_collab, character2, str(tmp_path), filename="theirs.jpg"
    )

    archive = await _fetch_zip(client, auth_headers)
    names = archive.namelist()
    assert f"media/{mine.file_path.replace(os.sep, '/')}" in names
    assert f"media/{theirs.file_path.replace(os.sep, '/')}" not in names


@pytest.mark.asyncio
async def test_export_refuses_an_anonymous_caller(client: AsyncClient):
    """No account, no export — the route reads the JWT, never a path parameter."""
    response = await client.get("/me/export")
    assert response.status_code == 401

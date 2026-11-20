"""Stored HEIC rows become stripped .jpg, row path and file together (#3590)."""

import io
import os

import pytest
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.praxis import MediaItem, MediaType, Praxis
from services.media import restore_media_to_mount
from services.media_scrub import convert_heic_rows


def _heic_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (8, 8), "red").save(buffer, format="HEIF")
    return buffer.getvalue()


@pytest.mark.asyncio
async def test_heic_row_converted_old_file_unlinked_second_run_noop(
    db_session: AsyncSession, character: Character, praxis_solo: Praxis, tmp_path
):
    relative = os.path.join(str(character.id), str(praxis_solo.id), "abc", "IMG_1.HEIC")
    old_path = os.path.join(str(tmp_path), relative)
    os.makedirs(os.path.dirname(old_path))
    with open(old_path, "wb") as handle:
        handle.write(_heic_bytes())
    item = MediaItem(
        praxis_id=praxis_solo.id,
        type=MediaType.image,
        file_path=relative,
        display_order=0,
    )
    db_session.add(item)
    await db_session.flush()

    dry, _ = await convert_heic_rows(db_session, str(tmp_path), apply=False)
    assert len(dry.cleaned) == 1 and item.file_path == relative

    report, to_unlink = await convert_heic_rows(db_session, str(tmp_path), apply=True)
    await db_session.flush()
    new_relative = os.path.join(os.path.dirname(relative), "IMG_1.jpg")
    assert item.file_path == new_relative and not report.failed
    assert os.path.exists(old_path), "old file must survive until the commit"
    for path in to_unlink:
        os.unlink(path)
    assert not os.path.exists(old_path)
    with Image.open(os.path.join(str(tmp_path), new_relative)) as image:
        assert image.format == "JPEG"

    again, leftover = await convert_heic_rows(db_session, str(tmp_path), apply=True)
    assert again.cleaned == [] and leftover == []


@pytest.mark.asyncio
@pytest.mark.parametrize("apply", [False, True])
async def test_interrupted_run_leftover_heic_removed_only_on_apply(
    db_session: AsyncSession, character: Character, praxis_solo: Praxis, tmp_path, apply
):
    directory = os.path.join(str(character.id), str(praxis_solo.id), "abc")
    os.makedirs(os.path.join(str(tmp_path), directory))
    leftover = os.path.join(str(tmp_path), directory, "IMG_1.HEIC")
    orphan = os.path.join(str(tmp_path), directory, "LOST.heic")
    for path in (leftover, orphan, os.path.join(str(tmp_path), directory, "IMG_1.jpg")):
        with open(path, "wb") as handle:
            handle.write(_heic_bytes())
    db_session.add(
        MediaItem(
            praxis_id=praxis_solo.id,
            type=MediaType.image,
            file_path=os.path.join(directory, "IMG_1.jpg"),
            display_order=0,
        )
    )
    await db_session.flush()

    report, to_unlink = await convert_heic_rows(db_session, str(tmp_path), apply)

    assert to_unlink == ([leftover] if apply else [])
    assert [path for path, _ in report.failed] == [os.path.join(directory, "LOST.heic")]
    assert os.path.exists(leftover) and os.path.exists(orphan)


@pytest.mark.asyncio
async def test_stale_jpg_is_overwritten_and_bmp_is_renamed(
    db_session: AsyncSession, character: Character, praxis_solo: Praxis, tmp_path
):
    directory = os.path.join(str(character.id), str(praxis_solo.id), "abc")
    folder = os.path.join(str(tmp_path), directory)
    os.makedirs(folder)
    buffer = io.BytesIO()
    Image.new("RGB", (8, 8), "red").save(buffer, format="BMP")
    with open(os.path.join(folder, "pic.bmp"), "wb") as handle:
        handle.write(buffer.getvalue())
    with open(os.path.join(folder, "pic.jpg"), "wb") as handle:
        handle.write(b"truncated by a crash")
    item = MediaItem(
        praxis_id=praxis_solo.id,
        type=MediaType.image,
        file_path=os.path.join(directory, "pic.bmp"),
        display_order=0,
    )
    db_session.add(item)
    await db_session.flush()

    report, to_unlink = await convert_heic_rows(db_session, str(tmp_path), apply=True)

    assert not report.failed and item.file_path == os.path.join(directory, "pic.jpg")
    assert to_unlink == [os.path.join(folder, "pic.bmp")]
    with Image.open(os.path.join(folder, "pic.jpg")) as image:
        assert image.format == "JPEG"
    assert sorted(os.listdir(folder)) == ["pic.bmp", "pic.jpg"]


@pytest.mark.asyncio
async def test_quarantined_heic_is_converted_and_restores_without_gps(
    db_session: AsyncSession,
    character: Character,
    praxis_solo: Praxis,
    tmp_path,
    monkeypatch,
):
    live = tmp_path / "uploads"
    live.mkdir()
    monkeypatch.setattr("services.media.settings.MEDIA_ROOT", str(live))
    directory = os.path.join(str(character.id), str(praxis_solo.id), "abc")
    held = tmp_path / "uploads-quarantine" / directory
    held.mkdir(parents=True)
    exif = Image.Exif()
    exif.get_ifd(0x8825)[1] = "N"
    buffer = io.BytesIO()
    Image.new("RGB", (8, 8), "red").save(buffer, format="HEIF", exif=exif)
    (held / "IMG_1.heic").write_bytes(buffer.getvalue())
    item = MediaItem(
        praxis_id=praxis_solo.id,
        type=MediaType.image,
        file_path=os.path.join(directory, "IMG_1.heic"),
        display_order=0,
    )
    db_session.add(item)
    await db_session.flush()

    report, to_unlink = await convert_heic_rows(db_session, str(live), apply=True)
    for path in to_unlink:
        os.unlink(path)

    assert not report.failed and item.file_path.endswith("IMG_1.jpg")
    assert restore_media_to_mount([item.file_path]) == 1
    assert not held.exists()
    with Image.open(live / item.file_path) as image:
        assert 0x8825 not in image.getexif()

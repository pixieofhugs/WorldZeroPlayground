"""Stored HEIC rows become stripped .jpg, row path and file together (#3590)."""

import io
import os

import pytest
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.praxis import MediaItem, MediaType, Praxis
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

"""The orphan sweep's database side, against real rows (#1568).

``load_known_paths`` is the half that decides what the sweep will *not* delete,
and it can only be wrong in ways that need a database: a column type, a row
holding a value the app did not write, a second table nobody remembered. The
disk half is unit-tested in ``tests/unit/test_media_sweep.py``.
"""

import os

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.praxis import MediaItem, MediaType, Praxis
from services.media_sweep import find_orphans, load_known_paths, scan_media_root


def _write(root, relative_path: str) -> str:
    absolute_path = os.path.join(str(root), relative_path)
    os.makedirs(os.path.dirname(absolute_path), exist_ok=True)
    with open(absolute_path, "wb") as handle:
        handle.write(b"bytes")
    return os.path.realpath(absolute_path)


@pytest.mark.asyncio
async def test_both_shapes_are_claimed_and_an_unmatched_file_is_not(
    db_session: AsyncSession,
    character: Character,
    praxis_solo: Praxis,
    tmp_path,
):
    """An avatar row and a media_item row each protect their file; nothing else does."""
    avatar_relative = os.path.join(str(character.id), "avatar", "abc123", "avatar.jpg")
    media_relative = os.path.join(str(character.id), str(praxis_solo.id), "def456", "proof.jpg")
    avatar_absolute = _write(tmp_path, avatar_relative)
    media_absolute = _write(tmp_path, media_relative)
    orphan_absolute = _write(tmp_path, os.path.join("999", "1", "old", "gone.jpg"))

    character.avatar_url = avatar_relative
    db_session.add(
        MediaItem(
            praxis_id=praxis_solo.id,
            type=MediaType.image,
            file_path=media_relative,
            display_order=0,
        )
    )
    await db_session.flush()

    known = await load_known_paths(db_session, str(tmp_path))
    scanned, escaping = scan_media_root(str(tmp_path))
    report = find_orphans(str(tmp_path), scanned, escaping, known, min_age_seconds=0)

    assert avatar_absolute in known.avatar_paths
    assert media_absolute in known.media_item_paths
    assert [item.absolute_path for item in report.orphans] == [orphan_absolute]


@pytest.mark.asyncio
async def test_a_pasted_remote_avatar_url_claims_nothing_and_breaks_nothing(
    db_session: AsyncSession,
    character: Character,
    tmp_path,
):
    """``avatar_url`` is a 500-char free-text column: most rows are not paths.

    A remote URL must contribute no claim (there is no file to protect) without
    the sweep treating it as an error or, worse, resolving it against the disk.
    """
    character.avatar_url = "https://example.com/photo.jpg"
    await db_session.flush()

    known = await load_known_paths(db_session, str(tmp_path))

    assert known.avatar_rows >= 1
    assert known.avatar_paths == frozenset()

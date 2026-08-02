"""Unit tests for the orphan sweep's disk side (#1568).

The sweep deletes user data that has no undo, so the properties worth pinning
are the ones that decide *not* to delete something:

  1. A file a database row claims is never an orphan — including a file at a
     path shape the code no longer produces, because matching is on the stored
     path and not on directory arithmetic.
  2. A file too young to judge is held back rather than deleted, since an
     upload writes its file before its row commits.
  3. A media root that is obviously not a media disk is refused outright.

The database side (``load_known_paths``) is exercised in
``tests/integration/test_media_sweep_db.py``, where real rows exist.
"""

import os

from services.media_sweep import (
    KnownPaths,
    MediaPathShape,
    classify_shape,
    find_orphans,
    media_root_is_sweepable,
    prune_empty_directories,
    scan_media_root,
    summarise_by_shape,
    total_bytes,
    unlink_orphans,
)


def _write(root, relative_path: str, contents: bytes = b"bytes") -> str:
    """Create a file under ``root`` and return its absolute realpath."""
    absolute_path = os.path.join(str(root), relative_path)
    os.makedirs(os.path.dirname(absolute_path), exist_ok=True)
    with open(absolute_path, "wb") as handle:
        handle.write(contents)
    return os.path.realpath(absolute_path)


def _known(*absolute_paths: str) -> KnownPaths:
    """A claim set with everything attributed to media items; shape is irrelevant."""
    return KnownPaths(
        avatar_paths=frozenset(),
        media_item_paths=frozenset(absolute_paths),
        avatar_rows=0,
        media_item_rows=len(absolute_paths),
    )


def test_classify_shape_reads_both_shapes_and_guesses_at_neither():
    assert classify_shape("42/avatar/deadbeef/avatar.jpg") is MediaPathShape.avatar
    assert classify_shape("42/avatar/avatar.jpg") is MediaPathShape.avatar
    assert classify_shape("42/7/deadbeef/proof.jpg") is MediaPathShape.praxis
    assert classify_shape("42/7/proof.jpg") is MediaPathShape.praxis
    # Anything that is not one of the two known layouts is reported as-is rather
    # than assigned to the nearest match.
    assert classify_shape("stray.jpg") is MediaPathShape.unrecognised
    assert classify_shape("exports/2026/report.csv") is MediaPathShape.unrecognised
    assert classify_shape("42/thumbnails/x.jpg") is MediaPathShape.unrecognised


def test_scan_reports_every_file_with_its_size(tmp_path):
    _write(tmp_path, os.path.join("42", "avatar", "abc", "avatar.jpg"), b"1234")
    _write(tmp_path, os.path.join("42", "7", "def", "proof.jpg"), b"123456")

    scanned, escaping = scan_media_root(str(tmp_path))

    assert escaping == ()
    assert len(scanned) == 2
    assert total_bytes(scanned) == 10
    assert all(not os.path.isabs(item.relative_path) for item in scanned)


def test_a_claimed_file_is_never_an_orphan_whatever_shape_it_has(tmp_path):
    """Matching is on the stored path (#1568), not on the directory layout.

    The legacy pre-#1565 avatar path is the case that proves it: it is still a
    perfectly valid ``Character.avatar_url`` value, and a sweep that recognised
    only the current uuid layout would delete a live avatar.
    """
    legacy_avatar = _write(tmp_path, os.path.join("42", "avatar", "avatar.jpg"))
    odd_shape = _write(tmp_path, os.path.join("archive", "legacy-import.jpg"))
    orphan = _write(tmp_path, os.path.join("42", "7", "gone", "deleted.jpg"))

    scanned, escaping = scan_media_root(str(tmp_path))
    report = find_orphans(
        str(tmp_path), scanned, escaping, _known(legacy_avatar, odd_shape), min_age_seconds=0
    )

    assert [item.absolute_path for item in report.orphans] == [orphan]


def test_a_file_younger_than_the_grace_period_is_held_back(tmp_path):
    """An upload writes its file before its row commits — do not judge it yet."""
    fresh = _write(tmp_path, os.path.join("42", "7", "new", "in-flight.jpg"))

    scanned, escaping = scan_media_root(str(tmp_path))
    report = find_orphans(
        str(tmp_path), scanned, escaping, _known(), min_age_seconds=3600
    )

    assert report.orphans == ()
    assert [item.absolute_path for item in report.too_recent] == [fresh]


def test_every_file_is_an_orphan_when_the_database_claims_nothing(tmp_path):
    """The post-wipe case: MEDIA_ROOT survives a schema drop, ids restart at 1."""
    _write(tmp_path, os.path.join("1", "avatar", "abc", "avatar.jpg"))
    _write(tmp_path, os.path.join("1", "2", "def", "proof.jpg"))

    scanned, escaping = scan_media_root(str(tmp_path))
    report = find_orphans(str(tmp_path), scanned, escaping, _known(), min_age_seconds=0)

    assert len(report.orphans) == 2
    summary = summarise_by_shape(report.orphans)
    assert summary[MediaPathShape.avatar][0] == 1
    assert summary[MediaPathShape.praxis][0] == 1
    assert summary[MediaPathShape.unrecognised][0] == 0


def test_unlink_removes_only_the_orphans_and_prunes_what_it_emptied(tmp_path):
    keeper = _write(tmp_path, os.path.join("42", "avatar", "keep", "avatar.jpg"))
    doomed = _write(tmp_path, os.path.join("42", "7", "gone", "deleted.jpg"), b"1234")

    scanned, escaping = scan_media_root(str(tmp_path))
    report = find_orphans(
        str(tmp_path), scanned, escaping, _known(keeper), min_age_seconds=0
    )
    removed, freed, failures = unlink_orphans(report.orphans)
    pruned = prune_empty_directories(str(tmp_path))

    assert (removed, freed, failures) == (1, 4, ())
    assert not os.path.exists(doomed)
    assert os.path.isfile(keeper)
    # The emptied upload directory and its praxis directory both go; the root
    # and everything still holding a file stay.
    assert pruned >= 2
    assert not os.path.exists(os.path.join(str(tmp_path), "42", "7"))
    assert os.path.isdir(str(tmp_path))


def test_unlink_reports_a_failure_instead_of_stopping(tmp_path):
    """A report the operator has already read must describe the whole run."""
    first = _write(tmp_path, os.path.join("42", "7", "a", "one.jpg"))
    _write(tmp_path, os.path.join("42", "7", "b", "two.jpg"))

    scanned, escaping = scan_media_root(str(tmp_path))
    report = find_orphans(str(tmp_path), scanned, escaping, _known(), min_age_seconds=0)
    os.remove(first)  # Vanishes between the report and the unlink.

    removed, _freed, failures = unlink_orphans(report.orphans)

    assert removed == 1
    assert len(failures) == 1


def test_obviously_wrong_media_roots_are_refused():
    """"Orphan" means "no row claims it", so a wrong root offers to delete everything."""
    for forbidden in ("/", "/etc", "/usr", "/app", ""):
        assert media_root_is_sweepable(forbidden) is False


def test_a_real_media_directory_is_sweepable(tmp_path):
    assert media_root_is_sweepable(str(tmp_path)) is True

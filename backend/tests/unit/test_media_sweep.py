"""Unit tests for the orphan sweep's disk side (#1568).

The sweep has no undo, so these pin what decides *not* to delete. DB side:
``tests/integration/test_media_sweep_db.py``.
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
    absolute_path = os.path.join(str(root), relative_path)
    os.makedirs(os.path.dirname(absolute_path), exist_ok=True)
    with open(absolute_path, "wb") as handle:
        handle.write(contents)
    return os.path.realpath(absolute_path)


def _known(*absolute_paths: str) -> KnownPaths:
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
    """Matching is on the stored path, not layout: pre-#1565 avatars are live."""
    legacy_avatar = _write(tmp_path, os.path.join("42", "avatar", "avatar.jpg"))
    odd_shape = _write(tmp_path, os.path.join("archive", "legacy-import.jpg"))
    orphan = _write(tmp_path, os.path.join("42", "7", "gone", "deleted.jpg"))

    scanned, escaping = scan_media_root(str(tmp_path))
    report = find_orphans(
        str(tmp_path), scanned, escaping, _known(legacy_avatar, odd_shape), min_age_seconds=0
    )

    assert [item.absolute_path for item in report.orphans] == [orphan]


def test_a_file_younger_than_the_grace_period_is_held_back(tmp_path):
    """An upload writes its file before its row commits."""
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
    assert pruned >= 2
    assert not os.path.exists(os.path.join(str(tmp_path), "42", "7"))
    assert os.path.isdir(str(tmp_path))


def test_unlink_reports_a_failure_instead_of_stopping(tmp_path):
    first = _write(tmp_path, os.path.join("42", "7", "a", "one.jpg"))
    _write(tmp_path, os.path.join("42", "7", "b", "two.jpg"))

    scanned, escaping = scan_media_root(str(tmp_path))
    report = find_orphans(str(tmp_path), scanned, escaping, _known(), min_age_seconds=0)
    os.remove(first)  # Vanishes between the report and the unlink.

    removed, _freed, failures = unlink_orphans(report.orphans)

    assert removed == 1
    assert len(failures) == 1


def test_obviously_wrong_media_roots_are_refused():
    for forbidden in ("/", "/etc", "/usr", "/app", ""):
        assert media_root_is_sweepable(forbidden) is False


def test_a_real_media_directory_is_sweepable(tmp_path):
    assert media_root_is_sweepable(str(tmp_path)) is True


def test_the_report_prints_whole_on_a_cp1252_console(tmp_path, capsys):
    """A mid-report ``UnicodeEncodeError`` on Windows hides an irreversible run."""
    from scripts.sweep_orphan_media import print_report

    _write(tmp_path, os.path.join("42", "avatar", "abc", "avatar.jpg"))
    _write(tmp_path, os.path.join("42", "7", "def", "proof.jpg"))
    _write(tmp_path, "stray.bin")
    scanned, _escaping = scan_media_root(str(tmp_path))
    report = find_orphans(
        str(tmp_path),
        scanned,
        ("/somewhere/else/link.jpg",),
        KnownPaths(frozenset(), frozenset(), avatar_rows=3, media_item_rows=0),
        min_age_seconds=3600,
    )

    print_report(report, min_age_seconds=3600)

    printed = capsys.readouterr().out
    printed.encode("cp1252")
    assert "Held back" in printed
    assert "Skipped" in printed
    assert "Orphans     : 0 file(s)" in printed

    listing = find_orphans(
        str(tmp_path),
        scanned,
        (),
        KnownPaths(frozenset(), frozenset(), avatar_rows=3, media_item_rows=0),
        min_age_seconds=0,
    )
    print_report(listing, min_age_seconds=0)

    printed = capsys.readouterr().out
    printed.encode("cp1252")
    assert "Orphans     : 3 file(s)" in printed
    assert "stray.bin" in printed

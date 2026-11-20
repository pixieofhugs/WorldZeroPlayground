"""Stored media carrying location comes out clean; a second run is a no-op (#3590)."""

import io
import os
import shutil
import subprocess

import pytest
from PIL import Image

from services.media_scrub import scrub_media_root

GPS_IFD = 0x8825


def _gps_jpeg() -> bytes:
    exif = Image.Exif()
    exif[GPS_IFD] = {1: "N", 2: (51.0, 30.0, 0.0), 3: "W", 4: (0.0, 7.0, 0.0)}
    buffer = io.BytesIO()
    Image.new("RGB", (8, 8), "red").save(buffer, format="JPEG", exif=exif)
    return buffer.getvalue()


def _put(root, relative: str, contents: bytes) -> str:
    path = os.path.join(str(root), relative)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as handle:
        handle.write(contents)
    return path


def _read(path: str) -> bytes:
    with open(path, "rb") as handle:
        return handle.read()


def _has_gps(path: str) -> bool:
    with Image.open(path) as image:
        return bool(image.getexif().get_ifd(GPS_IFD))


def test_gps_image_cleaned_then_second_run_changes_nothing(tmp_path):
    path = _put(tmp_path, "1/2/abc/photo.jpg", _gps_jpeg())
    notes = _put(tmp_path, "1/2/abc/notes.txt", b"hi")
    assert _has_gps(path)

    dry = scrub_media_root(str(tmp_path), apply=False)
    assert dry.cleaned == ["1/2/abc/photo.jpg"]
    assert _has_gps(path)

    first = scrub_media_root(str(tmp_path), apply=True)
    assert len(first.cleaned) == 1 and not first.failed
    assert not _has_gps(path)
    assert _read(notes) == b"hi"

    after_first = _read(path)
    second = scrub_media_root(str(tmp_path), apply=True)
    assert second.cleaned == [] and second.already_clean == 1
    assert _read(path) == after_first


def test_unreadable_file_listed_and_kept(tmp_path):
    path = _put(tmp_path, "1/2/abc/broken.png", b"not a png")
    report = scrub_media_root(str(tmp_path), apply=True)
    assert [name for name, _ in report.failed] == ["1/2/abc/broken.png"]
    assert _read(path) == b"not a png"


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg not installed")
def test_video_location_tag_removed_and_idempotent(tmp_path):
    source = os.path.join(str(tmp_path), "src.mp4")
    subprocess.run(
        ["ffmpeg", "-nostdin", "-v", "error", "-f", "lavfi",
         "-i", "color=c=red:s=64x64:d=0.2", "-metadata", "location=+51.5-000.1/",
         "-pix_fmt", "yuv420p", source],
        check=True,
    )
    path = _put(tmp_path, "1/2/abc/clip.mp4", _read(source))
    os.unlink(source)
    assert b"loci" in _read(path)

    assert len(scrub_media_root(str(tmp_path), apply=True).cleaned) == 1
    assert b"loci" not in _read(path)
    assert scrub_media_root(str(tmp_path), apply=True).cleaned == []


def _av(tmp_path, name: str, args: list[str]) -> bytes:
    out = os.path.join(str(tmp_path), "fixture_" + name)
    subprocess.run(
        ["ffmpeg", "-nostdin", "-v", "error", "-f", "lavfi", *args,
         "-metadata", "location=+51.5-000.1/", out],
        check=True,
    )
    return _read(out)


def _image(fmt: str) -> bytes:
    buffer = io.BytesIO()
    exif = Image.Exif()
    exif[GPS_IFD] = {1: "N", 2: (51.0, 30.0, 0.0), 3: "W", 4: (0.0, 7.0, 0.0)}
    Image.new("RGB", (8, 8), "red").save(buffer, format=fmt, exif=exif)
    return buffer.getvalue()


@pytest.mark.parametrize(
    "name,fmt", [("a.png", "PNG"), ("a.gif", "GIF"), ("a.webp", "WEBP")]
)
def test_second_run_is_a_noop_for_every_image_format(tmp_path, name, fmt):
    path = _put(tmp_path, "1/2/u/" + name, _image(fmt))
    scrub_media_root(str(tmp_path), apply=True)
    after_first = _read(path)
    second = scrub_media_root(str(tmp_path), apply=True)
    assert second.cleaned == [] and not second.failed
    assert _read(path) == after_first


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg not installed")
@pytest.mark.parametrize(
    "name,args",
    [
        ("c.webm", ["-i", "color=c=red:s=64x64:d=0.2", "-c:v", "libvpx"]),
        ("c.mov", ["-i", "color=c=red:s=64x64:d=0.2", "-pix_fmt", "yuv420p"]),
    ],
)
def test_second_run_is_a_noop_for_other_containers(tmp_path, name, args):
    root = tmp_path / "root"
    path = _put(root, "1/2/u/" + name, _av(tmp_path, name, args))
    scrub_media_root(str(root), apply=True)
    after_first = _read(path)
    second = scrub_media_root(str(root), apply=True)
    assert second.cleaned == [] and not second.failed
    assert _read(path) == after_first


def test_bmp_is_left_for_the_row_rename(tmp_path):
    path = _put(tmp_path, "1/2/u/a.bmp", _image("BMP"))
    report = scrub_media_root(str(tmp_path), apply=True)
    assert report.skipped == ["1/2/u/a.bmp"] and _read(path) == _image("BMP")


def test_unlink_reporting_keeps_going_after_a_failure(tmp_path):
    from services.media_scrub import ScrubReport, unlink_reporting

    good = _put(tmp_path, "good.heic", b"x")
    stuck = os.path.join(str(tmp_path), "stuck")
    os.mkdir(stuck)
    report = ScrubReport()
    unlink_reporting([stuck, os.path.join(str(tmp_path), "gone"), good], report)
    assert [path for path, _ in report.failed] == [stuck]
    assert not os.path.exists(good)

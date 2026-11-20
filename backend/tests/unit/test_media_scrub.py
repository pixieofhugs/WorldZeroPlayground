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

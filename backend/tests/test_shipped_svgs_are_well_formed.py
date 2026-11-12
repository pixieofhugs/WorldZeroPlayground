"""Guard: every committed SVG parses as well-formed XML.

An unparseable `mask-image` SVG silently paints nothing while every other check
stays green (#2683). `git ls-files` covers SVGs added anywhere.
"""
import subprocess
import xml.etree.ElementTree as ElementTree
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]


def _committed_svgs() -> list[Path]:
    listing = subprocess.run(
        ["git", "ls-files", "-z", "*.svg"],
        cwd=_REPO_ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    return [_REPO_ROOT / name for name in listing.stdout.split("\0") if name]


def test_every_committed_svg_parses_as_xml() -> None:
    paths = _committed_svgs()
    assert paths, "no committed .svg files found - has the glob or the repo root moved?"

    broken: list[str] = []
    for path in paths:
        try:
            ElementTree.parse(path)
        except ElementTree.ParseError as error:
            broken.append(f"{path.relative_to(_REPO_ROOT).as_posix()}: {error}")

    assert not broken, (
        "these SVGs are not well-formed XML, so no browser can decode them "
        "(a `--` inside a comment is the classic cause - XML forbids it; use an "
        "em dash or a single hyphen): " + "; ".join(broken)
    )

"""Guard: every SVG this repo commits parses as well-formed XML.

An SVG is an XML document, and a browser that cannot parse one does not fall
back to anything - it decodes nothing. When that SVG is a CSS `mask-image`,
"decodes nothing" means the masked element is masked out entirely: it keeps its
box, its background and its computed style, and paints zero ink.

That is what happened to Albescent's sigil (#2683). `labyrinth.svg` carried a
`--` as an em dash inside its explanatory comment, which XML forbids, so
`AlbescentSigil` painted nothing on every surface in both themes. `favicon.svg`
had the identical defect and the tab icon was dead with it.

Nothing else in the repo could see it. The files are served `200
image/svg+xml` with the right bytes - they are *served* fine, just unparseable;
`getComputedStyle` reports the mask URL happily, because CSS accepts the URL
and the decode fails later; layout is unchanged, because the box survives; the
bundle wires the component up correctly. Every green check stayed green while
the mark was invisible for weeks.

So the check belongs at the only seam that can catch it: the bytes on disk, fed
to a real XML parser. `git ls-files` is the file list rather than a hardcoded
set of directories, so an SVG added anywhere is covered the day it lands.
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

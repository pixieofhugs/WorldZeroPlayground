"""Bake live copy overrides into the catalogs, so they become the default copy.

    python3 scripts/promote_copy.py            # from prod
    python3 scripts/promote_copy.py --dev      # from dev.worldzero.org

Writes each public ``GET /copy-overrides`` value into
``frontend/src/locales/en/<ns>.json`` at its dotted key; commit as a PR.

An all-asterisks override means "nothing belongs here": never written, listed as
``DELETE ns:key`` for you to remove by hand. A key not already in the catalog is
``REFUSE``d (exit non-zero); plurals bake at their ``_one``/``_other`` keys.

After the PR deploys, Revert the rows in the copy-edit page, or they shadow later
catalog edits. Stdlib only; runs on the host.
"""

import json
import sys
import urllib.request
from pathlib import Path

CATALOGS = Path(__file__).resolve().parent.parent / "frontend/src/locales/en"
API = {"prod": "https://api.worldzero.org", "dev": "https://api.dev.worldzero.org"}


def promote(overrides: list[dict], catalogs: Path) -> list[str]:
    """Returns one line per changed key, then one DELETE line per marker."""
    changed, markers, files = [], [], {}
    for o in overrides:
        v = o["value"]
        if isinstance(v, str) and v.strip() and not v.strip().strip("*"):
            markers.append(
                f"DELETE {o['ns']}:{o['key']} — marked as no copy; delete this key and its element"
            )
            continue
        path = catalogs / f"{o['ns']}.json"
        if not path.exists():
            changed.append(f"SKIP {o['ns']}:{o['key']} — no {path.name}")
            continue
        data = files.setdefault(path, json.loads(path.read_text()))
        *parents, leaf = o["key"].split(".")
        node = data
        for part in parents:
            node = node.get(part) if isinstance(node, dict) else None
        if not isinstance(node, dict) or not isinstance(node.get(leaf), str):
            changed.append(f"REFUSE {o['ns']}:{o['key']} — not a string in the catalog; nothing written")
            continue
        if node[leaf] != o["value"]:
            node[leaf] = o["value"]
            changed.append(f"{o['ns']}:{o['key']} = {o['value']!r}")
    for path, data in files.items():
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    return changed + markers


def _check() -> None:
    import tempfile

    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / "x.json"
        p.write_text('{"a": {"b": "old", "c": "same"}}')
        out = promote(
            [
                {"ns": "x", "key": "a.b", "value": "new"},
                {"ns": "x", "key": "a.c", "value": "same"},
                {"ns": "nope", "key": "k", "value": "v"},
            ],
            Path(d),
        )
        assert json.loads(p.read_text()) == {"a": {"b": "new", "c": "same"}}
        assert len(out) == 2 and out[1].startswith("SKIP"), out

        # Markers (#3114).
        p.write_text('{"a": {"b": "keep"}}')
        out = promote(
            [
                {"ns": "x", "key": "a.b", "value": " *** "},
                {"ns": "x", "key": "gone.leaf", "value": "*"},
                {"ns": "x", "key": "a.d", "value": "* five stars *"},
            ],
            Path(d),
        )
        assert json.loads(p.read_text()) == {"a": {"b": "keep"}}
        assert out == [
            "REFUSE x:a.d — not a string in the catalog; nothing written",
            "DELETE x:a.b — marked as no copy; delete this key and its element",
            "DELETE x:gone.leaf — marked as no copy; delete this key and its element",
        ], out

        # Stale unsuffixed plural refused, its real form still bakes (#3165).
        p.write_text('{"m": {"n_one": "Member", "n_other": "Members"}}')
        out = promote(
            [
                {"ns": "x", "key": "m.n", "value": "dead leaf"},
                {"ns": "x", "key": "m.n_other", "value": "Folk"},
                {"ns": "x", "key": "q.r.s", "value": "dead branch"},
            ],
            Path(d),
        )
        assert json.loads(p.read_text()) == {"m": {"n_one": "Member", "n_other": "Folk"}}
        assert out[0].startswith("REFUSE x:m.n ") and out[2].startswith("REFUSE x:q.r.s "), out

        # Marker-only catalogs are not rewritten (#3084's feed.json rows).
        feed = Path(d) / "feed.json"
        before = (CATALOGS / "feed.json").read_bytes()
        feed.write_bytes(before)
        baked = {
            "factionSelect.ua.banner": "******************",
            "factionSelect.ua.masthead": "*******************",
            "factionSelect.ua.subtitle": "***************",
            "factionSelect.ua.status.locked": "*******************",
            "factionSelect.wow.banner": "********************",
        }
        out = promote([{"ns": "feed", "key": k, "value": v} for k, v in baked.items()], Path(d))
        assert feed.read_bytes() == before
        assert len(out) == 5 and all(line.startswith("DELETE feed:") for line in out), out


if __name__ == "__main__":
    if "--check" in sys.argv:
        _check()
        sys.exit(print("ok"))
    base = API["dev" if "--dev" in sys.argv else "prod"]
    with urllib.request.urlopen(f"{base}/copy-overrides") as r:
        lines = promote(json.load(r), CATALOGS)
    print("\n".join(lines) or "Nothing to promote — catalogs already match.")
    sys.exit(any(line.startswith("REFUSE") for line in lines))

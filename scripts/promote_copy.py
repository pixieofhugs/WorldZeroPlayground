"""Bake live copy overrides into the catalogs, so they become the default copy.

    python3 scripts/promote_copy.py            # from prod
    python3 scripts/promote_copy.py --dev      # from dev.worldzero.org

Reads the public ``GET /copy-overrides`` (no credentials), writes each value
into ``frontend/src/locales/en/<ns>.json`` at its dotted key, and prints what
changed. Commit the result as a PR.

Once that PR ships, the rows are redundant but still win over the file — so a
later catalog edit to the same key would be shadowed. Revert them in the page
(copy-edit → Revert) after the deploy. Stdlib only; runs on the host.
"""

import json
import sys
import urllib.request
from pathlib import Path

CATALOGS = Path(__file__).resolve().parent.parent / "frontend/src/locales/en"
API = {"prod": "https://api.worldzero.org", "dev": "https://api.dev.worldzero.org"}


def promote(overrides: list[dict], catalogs: Path) -> list[str]:
    """Write every override into its catalog. Returns one line per changed key."""
    changed, files = [], {}
    for o in overrides:
        path = catalogs / f"{o['ns']}.json"
        if not path.exists():
            changed.append(f"SKIP {o['ns']}:{o['key']} — no {path.name}")
            continue
        data = files.setdefault(path, json.loads(path.read_text()))
        *parents, leaf = o["key"].split(".")
        node = data
        for part in parents:
            node = node.setdefault(part, {})
        if node.get(leaf) != o["value"]:
            new = "" if leaf in node else " (NEW KEY)"
            node[leaf] = o["value"]
            changed.append(f"{o['ns']}:{o['key']}{new} = {o['value']!r}")
    for path, data in files.items():
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    return changed


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


if __name__ == "__main__":
    if "--check" in sys.argv:
        _check()
        sys.exit(print("ok"))
    base = API["dev" if "--dev" in sys.argv else "prod"]
    with urllib.request.urlopen(f"{base}/copy-overrides") as r:
        lines = promote(json.load(r), CATALOGS)
    print("\n".join(lines) or "Nothing to promote — catalogs already match.")

#!/usr/bin/env python3
"""Per-key i18n reference check (the #1039 / #1068 method).

Usage:  python scripts/i18nKeyRefs.py <namespace>          e.g. praxis

For EVERY leaf key in `src/locales/en/<namespace>.json`, search the source tree
for an ANCHORED reference to that key's full dotted path:

    '<key>      "<key>      `<key>      <namespace>:<key>

The anchor matters. A namespace-level sweep ("is the string `detail` used
anywhere?") reports every key as live and proves nothing — that is the mistake
this script exists to avoid. Anchoring on the opening quote / backtick / the
`ns:key` form means `t('detail.owner.edit')`, a key in a lookup table such as
`UNSUBMIT_COPY`, and a `<Trans i18nKey="...">` all count, while an unrelated
substring does not.

i18next PLURAL forms are probed too: a catalog key ending `_one` / `_other` /
`_zero` / `_two` / `_few` / `_many` is also considered referenced if its BASE is
referenced, since call sites write `t('x.count', { count: n })`.

Reports:  KEPT (referenced)  and  DELETABLE (not referenced anywhere).
Exit code 1 if anything is deletable, so it can gate a commit.

DELETABLE IS A CANDIDATE LIST, NEVER A DELETE ORDER. A key composed at runtime
has no literal anywhere and reads as deletable while being very much alive.
There is a live example in this repo: `components/duel/wowLists.tsx` calls
``t(`duelSeal.wow.${scope}.sub`)``, so all six `duelSeal.wow.*` keys report
DELETABLE and must NOT be removed. Before deleting anything, grep the source for
template-literal `t(` calls and check none of them can build the key. The useful
signal is the DIFF of this report before and after a change — the keys a change
newly orphaned — not its absolute output.
"""
from __future__ import annotations

import io
import json
import os
import re
import sys

PLURAL_SUFFIXES = ("_zero", "_one", "_two", "_few", "_many", "_other")
SOURCE_EXTENSIONS = (".ts", ".tsx", ".js", ".jsx", ".html")
SKIP_DIRECTORIES = {"node_modules", "dist", "coverage", ".git", "locales"}


def leaf_keys(node, prefix=""):
    if isinstance(node, dict):
        for name, child in node.items():
            yield from leaf_keys(child, f"{prefix}.{name}" if prefix else name)
    else:
        yield prefix


def source_blob(roots):
    chunks = []
    for root in roots:
        for directory, subdirectories, filenames in os.walk(root):
            subdirectories[:] = [d for d in subdirectories if d not in SKIP_DIRECTORIES]
            for filename in filenames:
                if filename.endswith(SOURCE_EXTENSIONS):
                    path = os.path.join(directory, filename)
                    chunks.append(io.open(path, encoding="utf-8", errors="ignore").read())
    return "\n".join(chunks)


def referenced(key: str, blob: str, namespace: str) -> bool:
    escaped = re.escape(key)
    pattern = re.compile(rf"""(['"`]|{re.escape(namespace)}:){escaped}(?![\w.])""")
    return bool(pattern.search(blob))


def main() -> int:
    namespace = sys.argv[1] if len(sys.argv) > 1 else "praxis"
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    catalog_path = os.path.join(here, "src", "locales", "en", f"{namespace}.json")
    catalog = json.load(io.open(catalog_path, encoding="utf-8"))
    blob = source_blob([os.path.join(here, "src"), os.path.join(here, "e2e")])

    kept, deletable = [], []
    for key in leaf_keys(catalog):
        probes = [key]
        for suffix in PLURAL_SUFFIXES:
            if key.endswith(suffix):
                probes.append(key[: -len(suffix)])
        (kept if any(referenced(p, blob, namespace) for p in probes) else deletable).append(key)

    for key in deletable:
        print(f"DELETABLE  {key}")
    print(f"\n{len(kept)} kept, {len(deletable)} deletable, {len(kept) + len(deletable)} total")
    return 1 if deletable else 0


if __name__ == "__main__":
    sys.exit(main())

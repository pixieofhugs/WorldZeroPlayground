#!/usr/bin/env python3
"""Per-key i18n reference check (#1039 / #1068).

Usage:  python frontend/scripts/i18nKeyRefs.py <namespace>   e.g. praxis
(Lives in `frontend/scripts/`, not the top-level `scripts/`.)

For each leaf key in `src/locales/en/<namespace>.json`, looks for an anchored
reference to its full dotted path ('<key>  "<key>  `<key>  <namespace>:<key>);
a bare substring sweep would call every key live. Plural keys (`_one`, `_other`,
...) also count if their base is referenced.

    KEPT       referenced by app code
    TEST-ONLY  referenced only from tests (`__tests__/`, `*.test.*`, `*.spec.*`,
               `e2e/`): dead (#2598)
    DELETABLE  not referenced

Exits 1 if anything is deletable or test-only. `--ignore-tests` folds TEST-ONLY
into DELETABLE. A backticked key in a comment counts as a reference.

DELETABLE is a candidate list, never a delete order: runtime-composed keys have
no literal, e.g. ``t(`duelSeal.wow.${scope}.sub`)`` in `wowLists.tsx`, and the
whole `errors` namespace (``t(`errors:codes.${code}`)``; guarded instead by
`backend/tests/unit/test_i18n_catalog_coverage.py`). The useful signal is the
diff of this report across a change.
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


def is_test_path(path: str) -> bool:
    """A test file, whose references do not keep a key alive (#2598)."""
    normalized = path.replace(os.sep, "/")
    if "/__tests__/" in normalized or "/e2e/" in normalized:
        return True
    name = os.path.basename(normalized)
    return ".test." in name or ".spec." in name


def source_blobs(roots) -> tuple[str, str]:
    """(app code, test code) — the same walk, split by who is reading."""
    app, tests = [], []
    for root in roots:
        for directory, subdirectories, filenames in os.walk(root):
            subdirectories[:] = [d for d in subdirectories if d not in SKIP_DIRECTORIES]
            for filename in filenames:
                if not filename.endswith(SOURCE_EXTENSIONS):
                    continue
                path = os.path.join(directory, filename)
                text = io.open(path, encoding="utf-8", errors="ignore").read()
                (tests if is_test_path(path) else app).append(text)
    return "\n".join(app), "\n".join(tests)


def referenced(key: str, blob: str, namespace: str) -> bool:
    escaped = re.escape(key)
    pattern = re.compile(rf"""(['"`]|{re.escape(namespace)}:){escaped}(?![\w.])""")
    return bool(pattern.search(blob))


def main() -> int:
    argv = [a for a in sys.argv[1:] if not a.startswith("--")]
    fold_tests = "--ignore-tests" in sys.argv[1:]
    namespace = argv[0] if argv else "praxis"
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    catalog_path = os.path.join(here, "src", "locales", "en", f"{namespace}.json")
    catalog = json.load(io.open(catalog_path, encoding="utf-8"))
    app_blob, test_blob = source_blobs(
        [os.path.join(here, "src"), os.path.join(here, "e2e")]
    )

    kept, test_only, deletable = [], [], []
    for key in leaf_keys(catalog):
        probes = [key]
        for suffix in PLURAL_SUFFIXES:
            if key.endswith(suffix):
                probes.append(key[: -len(suffix)])
        if any(referenced(p, app_blob, namespace) for p in probes):
            kept.append(key)
        elif not fold_tests and any(referenced(p, test_blob, namespace) for p in probes):
            test_only.append(key)
        else:
            deletable.append(key)

    for key in test_only:
        print(f"TEST-ONLY  {key}")
    for key in deletable:
        print(f"DELETABLE  {key}")
    total = len(kept) + len(test_only) + len(deletable)
    summary = f"\n{len(kept)} kept, "
    if not fold_tests:
        summary += f"{len(test_only)} test-only, "
    print(f"{summary}{len(deletable)} deletable, {total} total")
    return 1 if deletable or test_only else 0


if __name__ == "__main__":
    sys.exit(main())

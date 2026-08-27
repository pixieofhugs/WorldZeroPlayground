#!/usr/bin/env python3
"""Per-key i18n reference check (the #1039 / #1068 method).

Usage:  python frontend/scripts/i18nKeyRefs.py <namespace>   e.g. praxis

THE PATH IS `frontend/scripts/`, NOT `scripts/`. It resolves its catalog and its
source roots from `__file__`, so it runs from any cwd — but the repo ALSO has a
top-level `scripts/`, and this tool has never lived there. #2598 was measured
twice against `scripts/i18nKeyRefs.py`, found nothing, and both times concluded
the TEST-ONLY column below was unbuilt when it had already shipped. Spelling the
path out here is cheaper than a third re-measure.

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

Reports three columns, because two were not enough (#2598):

    KEPT       referenced by APP code
    TEST-ONLY  referenced, but only from tests — DEAD, see below
    DELETABLE  not referenced anywhere

A TEST-ONLY KEY IS A DEAD KEY. This script used to count any reference at all,
which is how `common:actions.accept` / `.decline` / `.submit` survived it: their
only references were in `sidebarPendingRequests.test.tsx`, in assertions that
the rendered HTML does **not** contain them. A key whose only reader asserts its
own absence is not alive, and a tool built to find orphans reported it KEPT.
Tests are `__tests__/` directories, `*.test.*` / `*.spec.*` files, and the whole
`e2e/` tree.

Exit code 1 if anything is deletable OR test-only, so it can gate a commit.
Pass `--ignore-tests` to drop the distinction and fold TEST-ONLY into DELETABLE,
which is the same verdict stated in two columns instead of three.

The backtick anchor cannot tell a template literal from PROSE: a key named in a
`backticked` aside inside a comment counts as a reference. That is why the split
matters rather than merely being tidier — such a mention in a test now lands in
TEST-ONLY, where it reads as dead, instead of in KEPT, where it read as alive.

DELETABLE IS A CANDIDATE LIST, NEVER A DELETE ORDER. A key composed at runtime
has no literal anywhere and reads as deletable while being very much alive.
Two live examples in this repo:

* `components/duel/wowLists.tsx` calls ``t(`duelSeal.wow.${scope}.sub`)``, so
  all six `duelSeal.wow.*` keys report DELETABLE and must NOT be removed.
* **The whole `errors` namespace.** `utils/errors.ts` builds its key from the
  backend's wire `code` (``t(`errors:codes.${code}`)``, #1401), so this script
  reports *every* key in `errors.json` as deletable — "0 kept, 38 deletable" is
  the expected output there, not a finding. The real guard for that namespace is
  `backend/tests/unit/test_i18n_catalog_coverage.py`, which holds the keys level
  with the `ErrorCode` enum, the raise sites' contexts, and their `params`.

Before deleting anything, grep the source for template-literal `t(` calls and
check none of them can build the key. The useful signal is the DIFF of this
report before and after a change — the keys a change newly orphaned — not its
absolute output.
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

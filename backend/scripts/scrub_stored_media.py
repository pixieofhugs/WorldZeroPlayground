"""Strip location metadata from media already in MEDIA_ROOT (#3590).

Dry run by default; ``--apply`` rewrites files in place. Idempotent. Files that
won't strip are listed and left untouched. Logic: ``services/media_scrub.py``.
"""

import argparse
import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from script_utils import add_env_argument, get_settings  # noqa: E402
from services.media_scrub import scrub_media_root  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    add_env_argument(parser)
    parser.add_argument("--apply", action="store_true", help="Rewrite files in place.")
    args = parser.parse_args()

    media_root = get_settings(args.env).MEDIA_ROOT
    print(f"Environment : {args.env}")
    print(f"Media root  : {os.path.realpath(media_root)}")
    mode = "APPLY - files WILL be rewritten" if args.apply else "dry run"
    print(f"Mode        : {mode}\n")
    if not os.path.isdir(media_root):
        print("MEDIA_ROOT does not exist - nothing to scrub.")
        return 1

    report = scrub_media_root(media_root, args.apply)
    verb = "Rewrote" if args.apply else "Would rewrite"
    print(f"Scanned {report.scanned} media file(s); {report.already_clean} clean.")
    print(f"{verb} {len(report.cleaned)} file(s).")
    for path in report.cleaned:
        print(f"  {path}")
    print(f"Skipped {len(report.skipped)} non-media/escaping file(s).")
    for path in report.skipped:
        print(f"  {path}")
    print(f"Could NOT strip {len(report.failed)} file(s) (left untouched):")
    for path, reason in report.failed:
        print(f"  {path}: {reason}")
    if not args.apply and report.cleaned:
        print("\nDry run - nothing changed. Re-run with --apply.")
    return 1 if report.failed else 0


if __name__ == "__main__":
    sys.exit(main())

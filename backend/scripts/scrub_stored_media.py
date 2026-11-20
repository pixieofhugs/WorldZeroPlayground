"""Strip location metadata from media already in MEDIA_ROOT (#3590).

Dry run by default; ``--apply`` rewrites files in place. Idempotent. Files that
won't strip are listed and left untouched. Logic: ``services/media_scrub.py``.
"""

import argparse
import asyncio
import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine  # noqa: E402

from script_utils import add_env_argument, get_settings  # noqa: E402
from services.media import quarantine_root  # noqa: E402
from services.media_scrub import convert_heic_rows, scrub_media_root, unlink_reporting  # noqa: E402


async def convert_heic(database_url: str, media_root: str, apply: bool):
    engine = create_async_engine(database_url, echo=False)
    try:
        async with async_sessionmaker(engine, expire_on_commit=False)() as session:
            report, to_unlink = await convert_heic_rows(session, media_root, apply)
            await (session.commit() if apply else session.rollback())
        unlink_reporting(to_unlink, report)
    finally:
        await engine.dispose()
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    add_env_argument(parser)
    parser.add_argument("--apply", action="store_true", help="Rewrite files in place.")
    args = parser.parse_args()

    settings = get_settings(args.env)
    media_root = settings.MEDIA_ROOT
    print(f"Environment : {args.env}")
    print(f"Media root  : {os.path.realpath(media_root)}")
    mode = "APPLY - files WILL be rewritten" if args.apply else "dry run"
    print(f"Mode        : {mode}\n")
    if not os.path.isdir(media_root):
        print("MEDIA_ROOT does not exist - nothing to scrub.")
        return 1

    report = scrub_media_root(media_root, args.apply)
    # Withdrawn praxes' media: restore_media_to_mount would bring any GPS back.
    quarantine = quarantine_root()
    if os.path.isdir(quarantine):
        held = scrub_media_root(quarantine, args.apply)
        report.scanned += held.scanned
        report.already_clean += held.already_clean
        report.cleaned += [f"[quarantine] {path}" for path in held.cleaned]
        report.skipped += [f"[quarantine] {path}" for path in held.skipped]
        report.failed += [(f"[quarantine] {path}", why) for path, why in held.failed]
    heic = asyncio.run(convert_heic(settings.DATABASE_URL, media_root, args.apply))
    report.scanned += heic.scanned
    report.failed += heic.failed
    verb = "Rewrote" if args.apply else "Would rewrite"
    print(f"HEIC -> .jpg: {verb} {len(heic.cleaned)} row(s); old .heic URLs stop.")
    for line in heic.cleaned:
        print(f"  {line}")
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

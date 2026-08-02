"""
Report — and optionally unlink — media files that no database row points at.

A thin CLI over ``services.media_sweep``. The reconciliation rules, and why the
disk is read before the database, live in that module's docstring; do not grow a
second copy of them here.

    python scripts/sweep_orphan_media.py                  # dry run, dev
    python scripts/sweep_orphan_media.py --env prod       # dry run, prod
    python scripts/sweep_orphan_media.py --apply          # actually unlink
    python scripts/sweep_orphan_media.py --apply --yes    # skip the confirmation
    python scripts/sweep_orphan_media.py --min-age-minutes 0   # judge fresh files too

**Dry run is the default and unlinking is opt-in**, because this deletes user
data that no undo exists for: the file is the artefact, and MEDIA_ROOT has no
version history. Every run prints counts and total bytes before it is asked
whether to act, so ``--apply`` is only ever the second thing you type.

WHY THIS EXISTS BEYOND ROUTINE HYGIENE
--------------------------------------
``MEDIA_ROOT`` is a separate disk that a database wipe cannot reach, and
character ids restart at 1. So after a reset every file on disk is an orphan,
and a *new* character writes into the previous occupant's directory. This sweep
is what clears the accumulation. ``scripts/reset_render_db.py`` empties the disk
as part of a Render reset, which handles the case going forward — this handles
everything the resets before it left behind, and any local or self-managed
environment that was wiped by other means. See docs/agents/db-migrations.md.
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
from services.media_sweep import (  # noqa: E402
    DEFAULT_MIN_AGE_SECONDS,
    MediaPathShape,
    SweepReport,
    find_orphans,
    load_known_paths,
    media_root_is_sweepable,
    prune_empty_directories,
    scan_media_root,
    summarise_by_shape,
    total_bytes,
    unlink_orphans,
)

MEBIBYTE = 1024 * 1024
# Enough to see the pattern without paging thousands of lines past an operator
# who is about to make an irreversible decision.
PATHS_LISTED = 40

SHAPE_LABELS = {
    MediaPathShape.avatar: "avatar   <character_id>/avatar/...",
    MediaPathShape.praxis: "praxis   <character_id>/<praxis_id>/...",
    MediaPathShape.unrecognised: "other    (neither shape)",
}


def format_size(size_bytes: int) -> str:
    return f"{size_bytes / MEBIBYTE:.1f} MiB"


def print_report(report: SweepReport, min_age_seconds: float) -> None:
    """Everything an operator needs before deciding whether to --apply."""
    print(f"Scanned     : {len(report.scanned)} file(s), {format_size(total_bytes(report.scanned))}")
    # ASCII arrows on purpose: this prints to a Windows console under cp1252 as
    # readily as to a Render shell, and a report that raises UnicodeEncodeError
    # halfway through is a report an operator acts on without having read.
    print(
        f"Claimed by  : {report.known.avatar_rows} character row(s) "
        f"-> {len(report.known.avatar_paths)} avatar path(s), "
        f"{report.known.media_item_rows} media_item row(s) "
        f"-> {len(report.known.media_item_paths)} media path(s)"
    )
    if report.known.avatar_rows and not report.known.claimed_paths:
        print("              (no row claims any file on this disk - a wiped or foreign database?)")

    if report.escaping:
        print(f"\nSkipped     : {len(report.escaping)} path(s) resolving outside MEDIA_ROOT (never ours):")
        for path in report.escaping[:PATHS_LISTED]:
            print(f"  {path}")

    if report.too_recent:
        print(
            f"\nHeld back   : {len(report.too_recent)} unclaimed file(s), "
            f"{format_size(total_bytes(report.too_recent))} - younger than "
            f"{min_age_seconds / 60:.0f} min, so possibly an upload mid-flight. "
            f"Use --min-age-minutes 0 to include them."
        )

    print(
        f"\nOrphans     : {len(report.orphans)} file(s), "
        f"{format_size(total_bytes(report.orphans))}"
    )
    summary = summarise_by_shape(report.orphans)
    for shape in MediaPathShape:
        count, size_bytes = summary[shape]
        print(f"  {SHAPE_LABELS[shape]:<40} {count:>6} file(s)  {format_size(size_bytes):>12}")

    if report.orphans:
        print()
        for scanned_file in report.orphans[:PATHS_LISTED]:
            print(f"  {scanned_file.relative_path}")
        if len(report.orphans) > PATHS_LISTED:
            print(f"  ... and {len(report.orphans) - PATHS_LISTED} more")


async def run(env: str, apply: bool, yes: bool, min_age_seconds: float) -> int:
    settings = get_settings(env)
    media_root = settings.MEDIA_ROOT

    print(f"Environment : {env}")
    print(f"Database    : {settings.DATABASE_URL.split('@')[-1]}")  # host/db only, no creds
    print(f"Media root  : {os.path.realpath(media_root)}")
    print(f"Mode        : {'APPLY - files WILL be unlinked' if apply else 'dry run'}\n")

    if not media_root_is_sweepable(media_root):
        print(f"ERROR: refusing to sweep MEDIA_ROOT={media_root!r} - that is not a media disk.")
        return 1
    if not os.path.isdir(os.path.realpath(media_root)):
        print("MEDIA_ROOT does not exist - nothing to sweep.")
        return 0

    # Disk first, database second: see services/media_sweep.py.
    scanned, escaping = scan_media_root(media_root)

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with async_session() as session:
            known = await load_known_paths(session, media_root)
    finally:
        await engine.dispose()

    report = find_orphans(media_root, scanned, escaping, known, min_age_seconds)
    print_report(report, min_age_seconds)

    if not report.orphans:
        print("\nNothing to remove.")
        return 0

    if not apply:
        print("\nDry run - nothing was deleted. Re-run with --apply to unlink.")
        return 0

    if not yes:
        answer = input(f"\nType 'delete' to unlink {len(report.orphans)} file(s): ").strip()
        if answer != "delete":
            print("Aborted.")
            return 1

    removed, freed, failures = unlink_orphans(report.orphans)
    pruned = prune_empty_directories(media_root)
    print(f"\nRemoved {removed} file(s), freed {format_size(freed)}; pruned {pruned} empty directory(ies).")
    if failures:
        print(f"{len(failures)} file(s) could not be removed:")
        for failure in failures[:PATHS_LISTED]:
            print(f"  {failure}")
        return 1
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Report media files with no database row behind them; --apply to unlink."
    )
    add_env_argument(parser)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Actually unlink the orphans. Without this the script only reports.",
    )
    parser.add_argument(
        "--yes", "-y",
        action="store_true",
        help="Skip the typed confirmation (for non-interactive runs). Only meaningful with --apply.",
    )
    parser.add_argument(
        "--min-age-minutes",
        type=float,
        default=DEFAULT_MIN_AGE_SECONDS / 60,
        help=(
            "Hold back unclaimed files younger than this, since an upload writes its "
            "file before its row commits. 0 disables the grace period."
        ),
    )
    args = parser.parse_args()
    sys.exit(asyncio.run(run(args.env, args.apply, args.yes, args.min_age_minutes * 60)))


if __name__ == "__main__":
    main()

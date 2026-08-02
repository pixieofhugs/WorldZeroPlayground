"""
Wipe the database named in DATABASE_URL, rebuild its schema, and clear MEDIA_ROOT.

Drops and recreates the `public` schema (destroying every table and row), then
runs `alembic upgrade head` to rebuild from the migration chain, then empties
the media disk. It does NOT seed — seeding happens on the next deploy, when
`start.sh` runs `seed.py`.

The media step exists because uploads live on a Render *disk*, which no schema
drop can reach: every avatar and praxis image would otherwise survive as an
orphan pointing at a row that no longer exists. Pass `--keep-media` to skip it.
Only the disk's CONTENTS are removed, never MEDIA_ROOT itself — that is the
mount point, and removing it would break the mount.

Designed to run from **Render Shell** (worldzero-backend → Shell), where
`DATABASE_URL` and `MEDIA_ROOT` are already injected by `render.yaml`. Nothing
needs to be pasted or stored, and no production credential ever lands on a
laptop:

    python scripts/reset_render_db.py

Recovery procedure after a migration squash. See docs/agents/db-migrations.md.

For a local dev database use `scripts/reset_db.sh` instead — it also reseeds,
which this deliberately does not.
"""

import asyncio
import os
import shutil
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlsplit

import asyncpg

# Refuse to empty a directory that is obviously not a media disk. MEDIA_ROOT is
# read from the environment rather than defaulted, so an unset value skips the
# step entirely instead of guessing a path and deleting it.
FORBIDDEN_MEDIA_ROOTS = {"/", "/app", "/usr", "/etc", "/var", "/home", "/root"}


def plain_dsn(database_url: str) -> str:
    """asyncpg wants a bare postgresql:// scheme, not SQLAlchemy's +asyncpg."""
    return database_url.replace("postgresql+asyncpg://", "postgresql://", 1).replace(
        "postgres://", "postgresql://", 1
    )


def resolve_media_root() -> Path | None:
    """The media disk to empty, or None with a printed reason to skip it."""
    raw = os.environ.get("MEDIA_ROOT", "").strip()
    if not raw:
        print("  MEDIA_ROOT is not set — skipping media (refusing to guess a path).")
        return None
    # Check the raw value as well as the resolved one: this runs on Linux, where
    # `/app` resolves to `/app`, but the guard must not quietly depend on that.
    root = Path(raw).resolve()
    normalised = "/" + raw.replace("\\", "/").strip("/") if raw.strip("/") else "/"
    if normalised in FORBIDDEN_MEDIA_ROOTS or str(root) in FORBIDDEN_MEDIA_ROOTS or root.parent == root:
        sys.exit(f"Refusing to empty MEDIA_ROOT={raw} — that is not a media disk.")
    if not root.is_dir():
        print(f"  MEDIA_ROOT={root} does not exist — nothing to clear.")
        return None
    return root


def measure(root: Path) -> tuple[int, int]:
    """(file count, total bytes) beneath root, ignoring anything unreadable."""
    files = 0
    total = 0
    for path in root.rglob("*"):
        if path.is_file() or path.is_symlink():
            files += 1
            try:
                total += path.lstat().st_size
            except OSError:
                pass
    return files, total


def empty_directory(root: Path) -> None:
    """Remove everything INSIDE root. Never removes root itself (the mount)."""
    for entry in root.iterdir():
        if entry.is_dir() and not entry.is_symlink():
            shutil.rmtree(entry)
        else:
            entry.unlink()


async def drop_and_recreate_public_schema(dsn: str) -> None:
    connection = await asyncpg.connect(dsn=dsn)
    try:
        await connection.execute("DROP SCHEMA public CASCADE")
        await connection.execute("CREATE SCHEMA public")
    finally:
        await connection.close()


def main() -> None:
    keep_media = "--keep-media" in sys.argv[1:]

    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url:
        sys.exit(
            "DATABASE_URL is not set. On Render it is injected automatically — "
            "run this from the worldzero-backend service's Shell tab."
        )

    dsn = plain_dsn(database_url)
    parts = urlsplit(dsn)
    database_name = parts.path.lstrip("/").split("?")[0]

    # Print the target BEFORE asking. The prompt used to say only "the Render
    # production database", so a DATABASE_URL pointing somewhere unexpected was
    # unfalsifiable at the one moment it mattered.
    print("This DROPS the public schema — every table and row is destroyed.")
    print(f"  host:     {parts.hostname or 'localhost'}:{parts.port or 5432}")
    print(f"  database: {database_name}")
    print(f"  user:     {parts.username}")

    media_root = None if keep_media else resolve_media_root()
    if media_root is not None:
        files, total = measure(media_root)
        print(f"  media:    {media_root} — {files} file(s), {total / 1_048_576:.1f} MiB")
    elif keep_media:
        print("  media:    kept (--keep-media)")

    if input(f"\nType the database name ({database_name}) to continue: ").strip() != database_name:
        sys.exit("Aborted.")

    print("\n[1/3] Dropping and recreating public schema...")
    asyncio.run(drop_and_recreate_public_schema(dsn))
    print("      Done.")

    # scripts/ sits inside the backend package, which is the image's WORKDIR on
    # Render and `backend/` in a checkout — parent.parent is the alembic root in
    # both.
    backend_directory = Path(__file__).resolve().parent.parent
    print("\n[2/3] Running alembic upgrade head...")
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=backend_directory,
        env={**os.environ, "DATABASE_URL": database_url},
    )
    if result.returncode != 0:
        # Media is deliberately left alone: the files are already orphaned, and
        # keeping them means a retry can still report what it is about to delete.
        sys.exit(result.returncode)

    if media_root is None:
        print("\n[3/3] Media left untouched.")
    else:
        print(f"\n[3/3] Emptying {media_root}...")
        empty_directory(media_root)
        print("      Done.")

    print(
        "\nSchema rebuilt. Now redeploy (Render → worldzero-backend → Manual Deploy) "
        "so start.sh runs seed.py — this script does not seed."
    )


if __name__ == "__main__":
    main()

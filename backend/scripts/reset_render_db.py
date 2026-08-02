"""
Wipe the database named in DATABASE_URL and rebuild its schema.

Drops and recreates the `public` schema (destroying every table and row), then
runs `alembic upgrade head` to rebuild from the migration chain. It does NOT
seed — seeding happens on the next deploy, when `start.sh` runs `seed.py`.

Designed to run from **Render Shell** (worldzero-backend → Shell), where
`DATABASE_URL` is already injected from the `worldzero-db` instance by
`render.yaml`. Nothing needs to be pasted or stored, and no production
credential ever lands on a laptop:

    python scripts/reset_render_db.py

Recovery procedure after a migration squash. See docs/agents/db-migrations.md.

For a local dev database use `scripts/reset_db.sh` instead — it also reseeds,
which this deliberately does not.
"""

import asyncio
import os
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlsplit

import asyncpg


def plain_dsn(database_url: str) -> str:
    """asyncpg wants a bare postgresql:// scheme, not SQLAlchemy's +asyncpg."""
    return database_url.replace("postgresql+asyncpg://", "postgresql://", 1).replace(
        "postgres://", "postgresql://", 1
    )


async def drop_and_recreate_public_schema(dsn: str) -> None:
    connection = await asyncpg.connect(dsn=dsn)
    try:
        await connection.execute("DROP SCHEMA public CASCADE")
        await connection.execute("CREATE SCHEMA public")
    finally:
        await connection.close()


def main() -> None:
    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url:
        sys.exit(
            "DATABASE_URL is not set. On Render it is injected automatically — "
            "run this from the worldzero-backend service's Shell tab."
        )

    dsn = plain_dsn(database_url)
    parts = urlsplit(dsn)
    database_name = parts.path.lstrip("/").split("?")[0]
    host = parts.hostname or "localhost"

    # Print the target BEFORE asking. The prompt used to say only "the Render
    # production database", so a DATABASE_URL pointing somewhere unexpected was
    # unfalsifiable at the one moment it mattered.
    print("This DROPS the public schema — every table and row is destroyed.")
    print(f"  host:     {host}:{parts.port or 5432}")
    print(f"  database: {database_name}")
    print(f"  user:     {parts.username}")
    if input(f"\nType the database name ({database_name}) to continue: ").strip() != database_name:
        sys.exit("Aborted.")

    print("\n[1/2] Dropping and recreating public schema...")
    asyncio.run(drop_and_recreate_public_schema(dsn))
    print("      Done.")

    # scripts/ sits inside the backend package, which is the image's WORKDIR on
    # Render and `backend/` in a checkout — parent.parent is the alembic root
    # in both.
    backend_dir = Path(__file__).resolve().parent.parent
    print("\n[2/2] Running alembic upgrade head...")
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=backend_dir,
        env={**os.environ, "DATABASE_URL": database_url},
    )
    if result.returncode != 0:
        sys.exit(result.returncode)

    print(
        "\nSchema rebuilt. Now redeploy (Render → worldzero-backend → Manual Deploy) "
        "so start.sh runs seed.py — this script does not seed."
    )


if __name__ == "__main__":
    main()

"""
Drop and recreate the isolated e2e database named in DATABASE_URL.

Used by frontend/e2e/run-e2e.sh (and the e2e CI workflow) to guarantee every
Playwright run starts from an empty, freshly-migrated database. Refuses to
touch anything whose name doesn't end in `_e2e`, so it can never nuke the
dev or prod database by accident.

Usage (DATABASE_URL must point at the e2e database, e.g. .../worldzero_e2e):
    python scripts/reset_e2e_db.py
"""

import asyncio
import os
import sys
from urllib.parse import urlsplit

import asyncpg

E2E_DATABASE_SUFFIX = "_e2e"
MAINTENANCE_DATABASE = "postgres"


async def reset_e2e_database() -> None:
    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url:
        sys.exit("DATABASE_URL is not set — export it before running (alembic reads it too).")

    # asyncpg.connect wants a plain postgresql:// scheme
    plain_url = database_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    plain_url = plain_url.replace("postgres://", "postgresql://", 1)
    parts = urlsplit(plain_url)
    database_name = parts.path.lstrip("/").split("?")[0]

    if not database_name.endswith(E2E_DATABASE_SUFFIX):
        sys.exit(
            f"Refusing to reset '{database_name}' — this script only drops databases "
            f"ending in '{E2E_DATABASE_SUFFIX}'. Check DATABASE_URL."
        )

    connection = await asyncpg.connect(
        host=parts.hostname or "localhost",
        port=parts.port or 5432,
        user=parts.username,
        password=parts.password,
        database=MAINTENANCE_DATABASE,
    )
    try:
        # FORCE (PG13+) kicks any lingering connections from a previous run
        await connection.execute(f'DROP DATABASE IF EXISTS "{database_name}" WITH (FORCE)')
        await connection.execute(f'CREATE DATABASE "{database_name}"')
    finally:
        await connection.close()

    print(f"Reset e2e database '{database_name}' on {parts.hostname}:{parts.port or 5432}")


if __name__ == "__main__":
    asyncio.run(reset_e2e_database())

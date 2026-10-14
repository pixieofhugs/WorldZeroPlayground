"""Pre-flight: refuse to deploy a DB stamped at a revision that no longer exists.

A migration squash invalidates the Alembic stamp in every existing DB. When that
happens `alembic upgrade head` dies with a cryptic "Can't locate revision ...".
This check runs first and fails loud, naming the fix. It never mutates the DB.

See docs/agents/db-migrations.md.
"""
import asyncio
import os
import sys
from pathlib import Path

_ALEMBIC_INI = Path(__file__).resolve().parent.parent / "alembic.ini"


def stamp_is_known(stamped: str | None, known: set[str]) -> bool:
    """Can the DB proceed? True if it's fresh (no stamp) or the stamp is a known revision."""
    return stamped is None or stamped in known


def _known_revisions() -> set[str]:
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    script = ScriptDirectory.from_config(Config(str(_ALEMBIC_INI)))
    return {rev.revision for rev in script.walk_revisions()}


def _stamped_revision(dsn: str) -> str | None:
    import asyncpg

    async def fetch() -> str | None:
        conn = await asyncpg.connect(dsn=dsn, timeout=5)
        try:
            return await conn.fetchval("SELECT version_num FROM alembic_version")
        except asyncpg.exceptions.UndefinedTableError:
            return None  # fresh DB, no alembic_version table yet
        finally:
            await conn.close()

    return asyncio.run(fetch())


def unknown_stamp_message(stamped: str | None) -> str:
    """What the operator is told when the stamp is unknown (no host-specific steps)."""
    return (
        f"DB stamped at unknown revision '{stamped}' — chain was likely squashed.\n"
        f"Recover: do NOT drop this database. `alembic stamp --purge` it to a\n"
        f"revision this image knows, from the incoming image:\n"
        f"`docker compose run --rm backend alembic stamp --purge <revision>`\n"
        f"(a plain `stamp` cannot resolve the old revision either), then restart.\n"
        f"A throwaway dev stack can instead\n"
        f"be wiped with `docker compose down -v`.\n"
        f"See docs/agents/db-migrations.md and deploy/RESTORE.md.\n"
    )


def main() -> None:
    url = os.environ["DATABASE_URL"]
    dsn = url.replace("postgresql+asyncpg://", "postgresql://", 1)
    stamped = _stamped_revision(dsn)
    if not stamp_is_known(stamped, _known_revisions()):
        sys.stderr.write(unknown_stamp_message(stamped))
        sys.exit(1)


if __name__ == "__main__":
    main()

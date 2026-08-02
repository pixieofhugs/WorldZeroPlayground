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


def main() -> None:
    url = os.environ["DATABASE_URL"]
    dsn = url.replace("postgresql+asyncpg://", "postgresql://", 1)
    stamped = _stamped_revision(dsn)
    if not stamp_is_known(stamped, _known_revisions()):
        sys.stderr.write(
            f"DB stamped at unknown revision '{stamped}' — chain was likely squashed.\n"
            f"Recover: open this service's Shell tab, run `python scripts/reset_render_db.py`,\n"
            f"then redeploy. DATABASE_URL and MEDIA_ROOT are already set there.\n"
            f"See docs/agents/db-migrations.md.\n"
        )
        sys.exit(1)


if __name__ == "__main__":
    main()

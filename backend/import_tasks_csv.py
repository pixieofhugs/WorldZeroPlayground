"""Import tasks from a CSV file into the World Zero database.

A thin CLI over ``services.task_import``. Parsing, validation and insertion all
live in that service and are shared with ``POST /admin/tasks/import-csv``, the
admin-UI path (#1376) — do not grow a second CSV parser here.

Usage:
    python import_tasks_csv.py path/to/tasks.csv              # dev
    python import_tasks_csv.py path/to/tasks.csv --env prod   # prod
    add --dry-run to any of the above to validate without writing

CSV columns expected: Name, Faction, Description, Level, Points

The import is atomic: if any row fails validation nothing is written, and every
failing row is listed so the file can be fixed in one pass. Legacy faction slugs
are normalised automatically (see FACTION_ALIASES in the service) and each
correction is reported.
"""

import argparse
import asyncio
import sys
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from models.account import Account, AccountStatus
from models.roles import AccountRole, Role
from script_utils import add_env_argument, get_settings
from services.task_import import TaskImportError, import_tasks_from_csv

DEFAULT_CSV_PATH = Path.home() / "Downloads" / "W0 tasks - Unsorted.csv"


async def _first_admin_account(session) -> Account | None:
    """Any active admin account — the CLI has no signed-in user to credit."""
    result = await session.execute(
        select(Account)
        .join(AccountRole, AccountRole.account_id == Account.id)
        .join(Role, Role.id == AccountRole.role_id)
        .where(Role.name == "admin", Account.status == AccountStatus.active)
        .limit(1)
    )
    return result.scalar_one_or_none()


async def run(csv_path: Path, dry_run: bool, env: str) -> int:
    settings = get_settings(env)
    print(f"Environment : {env}")
    print(f"Database    : {settings.DATABASE_URL.split('@')[-1]}\n")  # host/db only

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    try:
        async with async_session() as session:
            admin = await _first_admin_account(session)
            if admin is None:
                print("ERROR: No active admin account found in the database.")
                return 1

            try:
                outcome = await import_tasks_from_csv(
                    csv_path.read_bytes(), admin, session
                )
            except TaskImportError as exc:
                print("Import rejected — nothing was written:\n")
                for error in exc.errors:
                    print(f"  {error.msg}")
                await session.rollback()
                return 1

            for warning in outcome.warnings:
                print(f"  {warning}")
            if outcome.warnings:
                print()

            for title in outcome.created_titles:
                print(f"  {title}")

            # The service only flushes; committing (or not) is the caller's call,
            # which is what makes --dry-run a real exercise of the real path.
            if dry_run:
                await session.rollback()
                print(f"\nDRY RUN — {outcome.created_count} tasks would be created.")
            else:
                await session.commit()
                print(f"\nInserted {outcome.created_count} tasks successfully.")
    finally:
        await engine.dispose()

    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Import tasks from a CSV into World Zero.")
    parser.add_argument(
        "csv_path", nargs="?", default=str(DEFAULT_CSV_PATH), help="Path to the CSV file"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Validate without writing to the database"
    )
    add_env_argument(parser)
    args = parser.parse_args()

    csv_path = Path(args.csv_path)
    if not csv_path.exists():
        print(f"ERROR: CSV file not found: {csv_path}")
        sys.exit(1)

    sys.exit(asyncio.run(run(csv_path, args.dry_run, args.env)))


if __name__ == "__main__":
    main()

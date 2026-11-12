"""Close the live era and open the next one — the rollover, from a shell.

    python scripts/era_reset.py pixie                 # dev: print the plan, change nothing
    python scripts/era_reset.py pixie --yes           # dev: perform the rollover
    python scripts/era_reset.py pixie --env prod --yes

Thin CLI over ``services.era.apply_era_reset`` (semantics: ADR-0042). Irreversible
and NOT idempotent: without ``--yes`` it prints the plan and exits 1. ``USERNAME``
must be an admin (``Era.started_by`` audit FK). The primary door is
``PUT /admin/eras/live`` (ADR-0091); this re-opens the era the DB says is live,
for outages, and refuses an unregistered ``config_key`` rather than fall back.
Unlike the route it allows re-opening the live era (a new season, same rules).
"""

import argparse
import asyncio
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import select  # noqa: E402
from sqlalchemy.ext.asyncio import (  # noqa: E402
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from dependencies import account_has_admin_role  # noqa: E402
from game_config import EraConfig, era_config_for_key  # noqa: E402
from models.character import Character  # noqa: E402
from models.era import Era  # noqa: E402
from script_utils import add_env_argument, get_settings  # noqa: E402
from services.admin_service import list_active_characters  # noqa: E402
from services.era import (  # noqa: E402
    apply_era_reset,
    commit_and_bind_live_era,
    get_current_era_row_safe,
    lock_era_rollover,
)


def print_plan(
    current_era_row: Era, opening: EraConfig, character_count: int
) -> None:
    """``opening`` is passed, not read off ``CURRENT_ERA``: a plan run binds nothing."""
    print(
        f"Closing     : era id={current_era_row.id} "
        f"config_key={current_era_row.config_key!r} (opened {current_era_row.started_at})"
    )
    print(f"Opening     : {opening.name!r} config_key={opening.config_key!r}")
    print(f"Characters  : {character_count} active (banned characters are skipped)")
    print(
        "Resets      : "
        f"score={opening.reset_score}, "
        f"all_time_score={opening.reset_all_time_score}, "
        f"level={opening.reset_level}, "
        f"vote_budget={opening.reset_vote_budget}, "
        f"faction={opening.reset_faction}"
    )
    print("Also        : every unresolved duel is frozen, and the board is retired")


async def reset_era(session: AsyncSession, username: str, confirmed: bool) -> int:
    """Print the plan; roll over only if ``confirmed``. Exit 0 only on rollover."""
    operator = (
        await session.execute(
            select(Character).where(Character.username == username)
        )
    ).scalar_one_or_none()
    if operator is None:
        print(f"ERROR: no character found with username '{username}'")
        return 1
    if not await account_has_admin_role(operator.account_id, session):
        print(
            f"ERROR: '{username}' is not an admin, and Era.started_by records who "
            f"opened the era. Run elevate_admin.py first, or name an admin."
        )
        return 1

    # Same lock as `PUT /admin/eras/live`, taken BEFORE the read so a concurrent
    # admin-page rollover can't open a second era. Held until rollback/commit.
    await lock_era_rollover(session)

    current_era_row = await get_current_era_row_safe(session)
    if current_era_row is None:
        print("ERROR: no era row for the current config - run seed.py before a rollover.")
        return 1

    # Re-open the DB's live era (ADR-0091), never the compile-time one. Unlike
    # `rebind_live_era`, refuse on an unknown key: falling back would silently
    # roll the game back to Era 1.
    opening = era_config_for_key(current_era_row.config_key)
    if opening is None:
        print(
            f"ERROR: the live Era row (id={current_era_row.id}) names config_key "
            f"{current_era_row.config_key!r}, which no era file registers.\n"
            f"       This script re-opens the LIVE era, and it cannot resolve "
            f"which one that is. Nothing was changed.\n"
            f"       Restore the era file, or roll into a registered era from "
            f"the admin page."
        )
        return 1

    characters = await list_active_characters(session)
    print_plan(current_era_row, opening, len(characters))

    if not confirmed:
        print("\nNothing was changed. Re-run with --yes to perform the rollover.")
        return 1

    new_era_row = Era(
        name=opening.name,
        config_key=opening.config_key,
        started_by=operator.account_id,
    )
    session.add(new_era_row)
    await session.flush()
    await apply_era_reset(characters, new_era_row, session, era=opening)
    await commit_and_bind_live_era(session, opening)
    print(f"\nEra {new_era_row.id} is open; {len(characters)} character(s) reset.")
    return 0


async def run(username: str, env: str, confirmed: bool) -> int:
    settings = get_settings(env)
    print(f"Environment : {env}")
    print(f"Database    : {settings.DATABASE_URL.split('@')[-1]}")  # host/db only, no creds
    print(f"Mode        : {'APPLY - the era WILL roll over' if confirmed else 'plan only'}\n")

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with async_session() as session:
            # reset_era commits itself (binding must follow the commit).
            exit_code = await reset_era(session, username, confirmed)
    finally:
        await engine.dispose()
    return exit_code


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Close the live era and open the next one. Prints the plan unless --yes."
    )
    parser.add_argument(
        "username",
        help="Character username of the operator; their account is recorded as Era.started_by.",
    )
    add_env_argument(parser)
    parser.add_argument(
        "--yes", "-y",
        action="store_true",
        help="Actually perform the rollover. Without this the script only prints the plan.",
    )
    args = parser.parse_args()
    sys.exit(asyncio.run(run(args.username, args.env, args.yes)))


if __name__ == "__main__":
    main()

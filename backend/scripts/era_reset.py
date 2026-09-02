"""Close the live era and open the next one — the rollover, from a shell.

    python scripts/era_reset.py pixie                 # dev: print the plan, change nothing
    python scripts/era_reset.py pixie --yes           # dev: perform the rollover
    python scripts/era_reset.py pixie --env prod --yes

A thin CLI over :func:`services.era.apply_era_reset`; the reset semantics live
there and in the ``EraConfig`` flags it reads (ADR-0042), not here. This module
only assembles what the operation needs — the new ``Era`` row, the character set
— and decides whether the operator has actually asked for it.

**Nothing happens without ``--yes``.** This is the most destructive operation in
the system: scores, levels, vote budgets and faction membership reset per the
era's flags, every unresolved duel is frozen into a permanent result, and the
whole board is retired. There is no undo. So the default run prints the plan and
exits non-zero, and ``--yes`` is only ever the second thing you type —
``scripts/reset_e2e_db.py`` guards itself the same way. That gate is also the
*only* thing standing between you and a second rollover: opening an era is not
idempotent, so a confirmed re-run opens another one, exactly as re-calling the
route did. Re-runnability here means "the plan-only run changes nothing", not
"running it twice is free".

``USERNAME`` is the operator, and it is required because ``Era.started_by`` is
the rollover's audit trail: a not-null FK recording *who* opened the era. This
script refuses a username whose account is not an admin, which is the one thing
``PUT /admin/era/reset`` guaranteed that a shell prompt otherwise would not.
That route was this operation's only entry point and was deleted in #1667 —
unreachable from the UI, and a destructive rollover behind any authenticated
admin session is a blast radius nothing was using.

**This is no longer the primary door (#827, ADR-0091).** ``PUT /admin/eras/live``
and the admin page's era selector are, because a mod can reach them and they can
*choose* which era to open — the two things #1667's route lacked. This script
re-opens whichever era the database already says is live, which is what it always
did back when the compile-time era and the live era were the same thing. It stays
for the shell: a rollover when the site is down, or when nobody can sign in.
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
from game_config import CURRENT_ERA  # noqa: E402
from models.character import Character  # noqa: E402
from models.era import Era  # noqa: E402
from script_utils import add_env_argument, get_settings  # noqa: E402
from services.admin_service import list_active_characters  # noqa: E402
from services.era import (  # noqa: E402
    apply_era_reset,
    get_current_era_row_safe,
    rebind_live_era,
)


def print_plan(current_era_row: Era, character_count: int) -> None:
    """Everything an operator needs before an irreversible decision."""
    print(
        f"Closing     : era id={current_era_row.id} "
        f"config_key={current_era_row.config_key!r} (opened {current_era_row.started_at})"
    )
    print(f"Opening     : {CURRENT_ERA.name!r} config_key={CURRENT_ERA.config_key!r}")
    print(f"Characters  : {character_count} active (banned characters are skipped)")
    # Read off the era, never restated here: the flags ARE the reset (ADR-0042).
    print(
        "Resets      : "
        f"score={CURRENT_ERA.reset_score}, "
        f"all_time_score={CURRENT_ERA.reset_all_time_score}, "
        f"level={CURRENT_ERA.reset_level}, "
        f"vote_budget={CURRENT_ERA.reset_vote_budget}, "
        f"faction={CURRENT_ERA.reset_faction}"
    )
    print("Also        : every unresolved duel is frozen, and the board is retired")


async def reset_era(session: AsyncSession, username: str, confirmed: bool) -> int:
    """Print the plan and, only if ``confirmed``, perform the rollover.

    Returns a process exit code: 0 when the era rolled over, 1 for every
    refusal — including the un-confirmed run, which is a rollover that did not
    happen and should not read as success to whatever invoked it.
    """
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

    current_era_row = await get_current_era_row_safe(session)
    if current_era_row is None:
        print("ERROR: no era row for the current config - run seed.py before a rollover.")
        return 1

    # Point CURRENT_ERA at whatever the DATABASE says is live before printing a
    # plan about it (ADR-0091, #827). Without this the script would re-open the
    # *compile-time* era, so running it after a mod has rolled the game forward
    # from the admin page would silently roll it back. This one call is why
    # `print_plan` and the row built below need no edit: the live era is one
    # object refreshed in place, not a name each of them re-reads.
    await rebind_live_era(session)

    characters = await list_active_characters(session)
    print_plan(current_era_row, len(characters))

    if not confirmed:
        print("\nNothing was changed. Re-run with --yes to perform the rollover.")
        return 1

    new_era_row = Era(
        name=CURRENT_ERA.name,
        config_key=CURRENT_ERA.config_key,
        started_by=operator.account_id,
    )
    session.add(new_era_row)
    await session.flush()
    await apply_era_reset(characters, new_era_row, session)
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
            exit_code = await reset_era(session, username, confirmed)
            if exit_code == 0:
                await session.commit()
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

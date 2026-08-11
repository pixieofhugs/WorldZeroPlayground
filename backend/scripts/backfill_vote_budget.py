"""Rebuild ``votes_spent_this_era`` for the live era from the vote table.

    python scripts/backfill_vote_budget.py               # dry run, dev
    python scripts/backfill_vote_budget.py --env prod    # dry run, prod
    python scripts/backfill_vote_budget.py --apply       # actually write

The repair half of the 2026-08-02 vote dedupe (#1531): the vote budget is the
one *stored* number in the system — ``votes_available`` is derived from it on
read — so anything that removes a vote row behind the service's back leaves its
caster permanently charged for a vote that no longer exists. The identity being
restored, and the two ways it can fail, live in
:func:`services.character_stats.recompute_votes_spent_this_era`; do not grow a
second copy of them here.

**Dry run is the default and writing is opt-in**, because a recompute cannot
tell a stale counter from a hand-set one: ``set_character_stats`` writes this
same field to translate an admin's ``votes_available`` grant, and nothing on the
row records that it was hand-set. So the run prints every before/after pair and
waits to be asked again. Idempotent once applied — a second run finds nothing
left to change and reports zero.

Run this BEFORE ``scripts/backfill_character_stats.py``, never in the same pass:
both write ``CharacterStats``.

Was ``POST /admin/characters/backfill-vote-budget``, which nothing called; the
route is deleted in #1667.
"""

import argparse
import asyncio
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from fastapi import HTTPException  # noqa: E402
from sqlalchemy.ext.asyncio import (  # noqa: E402
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from script_utils import add_env_argument, get_settings  # noqa: E402
from services.character_stats import recompute_votes_spent_this_era  # noqa: E402


async def backfill_vote_budget(session: AsyncSession, apply: bool) -> int:
    """Report — and with ``apply``, write — every drifted vote-spend counter.

    Returns a process exit code: 0 whether or not anything changed, 1 only when
    the era's rules make the counter unrebuildable (the service says so).
    """
    try:
        repairs = await recompute_votes_spent_this_era(session, dry_run=not apply)
    except HTTPException as refusal:
        # The service refuses an era that carries vote spend forward; a 409 to a
        # route is a one-line explanation to an operator, not a traceback.
        print(f"ERROR: {refusal.detail}")
        return 1

    print(f"Drifted     : {len(repairs)} character(s)")
    for repair in repairs:
        print(
            f"  character {repair.character_id}: "
            f"votes_spent {repair.before} -> {repair.after}"
        )

    if not repairs:
        print("\nNothing to repair.")
    elif apply:
        print(f"\nDone: {len(repairs)} counter(s) rewritten.")
    else:
        print(
            "\nDry run - nothing was written. Check no line above is an admin's "
            "hand-set vote grant, then re-run with --apply."
        )
    return 0


async def run(env: str, apply: bool) -> int:
    settings = get_settings(env)
    print(f"Environment : {env}")
    print(f"Database    : {settings.DATABASE_URL.split('@')[-1]}")  # host/db only, no creds
    print(f"Mode        : {'APPLY - counters WILL be rewritten' if apply else 'dry run'}\n")

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with async_session() as session:
            exit_code = await backfill_vote_budget(session, apply)
            if exit_code == 0 and apply:
                await session.commit()
    finally:
        await engine.dispose()
    return exit_code


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Rebuild votes_spent_this_era from the vote table; --apply to write."
    )
    add_env_argument(parser)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Actually rewrite the counters. Without this the script only reports.",
    )
    args = parser.parse_args()
    sys.exit(asyncio.run(run(args.env, args.apply)))


if __name__ == "__main__":
    main()

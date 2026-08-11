"""Recompute every active character's ``CharacterStats`` for the live era.

    python scripts/backfill_character_stats.py              # dev
    python scripts/backfill_character_stats.py --env prod

The break-glass tool for a scoring repair: scores are recomputed rather than
stored as a running total, so a bug anywhere in the recalc path leaves every
score wrong until something recomputes them. #1345 (the era bound) and #1373
(failed praxes score zero) are both changes whose backfill this is.

**Idempotent, and boring on a healthy database.** It re-derives each row from
the votes already in the table, so a second run writes the same numbers as the
first and a run against correct data is a no-op. ``all_time_score`` included:
that field moves by delta (``_credit_all_time_score``), and the delta applied
here is ``recomputed - stored``, so a second pass applies zero. Pinned by
``tests/integration/test_vote_dedupe_repair.py``.

**Silent by construction** — ``emit_taunts=False`` (ADR-0068). Recomputing a
score everyone already had is not an overtake, and a backfill must never mail
the whole playerbase a volley of taunts about history.

Two limits worth knowing before leaning on it: it recalcs the CURRENT era's row
only, so a change to a closed era's praxis needs ``recalculate_character_stats``
with that ``era_row``; and it skips banned characters
(``list_active_characters``). Run
``scripts/backfill_vote_budget.py`` BEFORE this, never in the same pass — both
write ``CharacterStats`` (#1531).

Was ``POST /admin/characters/backfill-stats``, which nothing called; the route
is deleted in #1667.
"""

import argparse
import asyncio
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy.ext.asyncio import (  # noqa: E402
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from script_utils import add_env_argument, get_settings  # noqa: E402
from services.admin_service import list_active_characters  # noqa: E402
from services.character_stats import recalculate_character_stats  # noqa: E402
from services.era import get_current_era_row_safe  # noqa: E402


async def backfill_character_stats(session: AsyncSession) -> int:
    """Recalculate every active character against the live era row.

    Returns a process exit code: 0 on success, 1 if there is no era to recalc
    against.
    """
    era_row = await get_current_era_row_safe(session)
    if era_row is None:
        print("ERROR: no era row for the current config - run seed.py first.")
        return 1

    characters = await list_active_characters(session)
    print(f"Recalculating {len(characters)} active character(s) against era {era_row.id}...")
    for character in characters:
        await recalculate_character_stats(
            character.id, session, era_row=era_row, emit_taunts=False
        )
    await session.flush()
    print(f"Done: {len(characters)} character(s) recalculated.")
    return 0


async def run(env: str) -> int:
    settings = get_settings(env)
    print(f"Environment : {env}")
    print(f"Database    : {settings.DATABASE_URL.split('@')[-1]}\n")  # host/db only, no creds

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with async_session() as session:
            exit_code = await backfill_character_stats(session)
            if exit_code == 0:
                await session.commit()
    finally:
        await engine.dispose()
    return exit_code


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Recompute CharacterStats for every active character in the live era."
    )
    add_env_argument(parser)
    args = parser.parse_args()
    sys.exit(asyncio.run(run(args.env)))


if __name__ == "__main__":
    main()

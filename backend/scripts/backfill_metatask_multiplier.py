"""Re-bank the scores ADR-0086 moved, and count them first (#2633).

    python scripts/backfill_metatask_multiplier.py              # dry run, dev
    python scripts/backfill_metatask_multiplier.py --apply      # write
    python scripts/backfill_metatask_multiplier.py --env prod --apply

Persisted ``CharacterStats.score`` / ``all_time_score`` don't self-correct.
Only praxes with metatask points under a non-1.0 resolved multiplier move.
Writes via ``recalculate_character_stats`` (a delta, never ``SUM(score)``,
which would undo ``EraConfig.reset_all_time_score``); ``emit_taunts=False``
(ADR-0068). Characters can level down; delivered invitations are never revoked.
"""

import argparse
import asyncio
import sys
from collections import defaultdict
from decimal import Decimal
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

from game_config import CURRENT_ERA, EraConfig, era_config_for_key  # noqa: E402
from models.character import Character, CharacterStatus  # noqa: E402
from models.era import Era  # noqa: E402
from models.meta_task import PraxisMetaTask  # noqa: E402
from models.praxis import (  # noqa: E402
    UNSCORED_MODERATION_STATUSES,
    Praxis,
    PraxisMember,
    PraxisStatus,
    PraxisType,
)
from script_utils import add_env_argument, get_settings  # noqa: E402
from services.character_stats import recalculate_character_stats  # noqa: E402
from services.era import get_era_row_for_praxis, get_or_create_stats  # noqa: E402
from services.praxis_scoring import Contribution, compute_contributions  # noqa: E402
from services.scoring import exact  # noqa: E402

_UNIT = Decimal(1)


def _old_total(contribution: Contribution) -> Decimal:
    """Pre-ADR-0086 ``compute_praxis_score``, in ``Decimal`` as live (#1578)."""
    return (
        exact(contribution.base_points + contribution.metatask_points)
        * exact(contribution.faction_multiplier)
        * exact(contribution.duel_multiplier)
        + exact(contribution.points_from_votes)
        + exact(contribution.habit_bonus_points)
    )


def _moves(contribution: Contribution) -> bool:
    """The affected-set predicate: metatask points under a non-1.0 multiplier."""
    if contribution.metatask_points <= 0:
        return False
    resolved = exact(contribution.faction_multiplier) * exact(
        contribution.duel_multiplier
    )
    return resolved != _UNIT


async def _stakeholders(
    session: AsyncSession,
) -> dict[int, tuple[Praxis, list[int]]]:
    """Every scoreable praxis carrying a metatask, with the characters it pays
    (collab members, else the author — as ``recalculate_character_stats``)."""
    result = await session.execute(
        select(Praxis)
        .join(PraxisMetaTask, PraxisMetaTask.praxis_id == Praxis.id)
        .where(
            Praxis.status == PraxisStatus.submitted,
            Praxis.moderation_status.notin_(list(UNSCORED_MODERATION_STATUSES)),
        )
        .distinct()
    )
    praxes = list(result.scalars().all())
    if not praxes:
        return {}

    members = await session.execute(
        select(PraxisMember.praxis_id, PraxisMember.character_id).where(
            PraxisMember.praxis_id.in_([p.id for p in praxes])
        )
    )
    members_by_praxis: dict[int, list[int]] = defaultdict(list)
    for praxis_id, character_id in members.all():
        members_by_praxis[praxis_id].append(character_id)

    return {
        p.id: (
            p,
            members_by_praxis.get(p.id, [])
            if p.type == PraxisType.collab
            else [p.created_by_id],
        )
        for p in praxes
    }


async def backfill_metatask_multiplier(session: AsyncSession, apply: bool) -> int:
    """Count the praxes ADR-0086 moves and, with ``apply``, re-bank. Exit 0."""
    candidates = await _stakeholders(session)
    print(f"Praxes carrying a metatask (the whole search space): {len(candidates)}")
    if not candidates:
        print("\nAFFECTED ROWS: 0 - no praxis carries a metatask. Nothing to backfill.")
        return 0

    banned = {
        character_id
        for (character_id,) in (
            await session.execute(
                select(Character.id).where(Character.status == CharacterStatus.banned)
            )
        ).all()
    }

    # No ``Praxis.era_id``: era is resolved at seal time, as the vote path does.
    era_rows: dict[int, Era] = {}
    grouped: dict[tuple[int, int], list[Praxis]] = defaultdict(list)
    for praxis, character_ids in candidates.values():
        era_row = await get_era_row_for_praxis(praxis, session)
        era_rows[era_row.id] = era_row
        for character_id in character_ids:
            if character_id in banned:
                continue
            grouped[(character_id, era_row.id)].append(praxis)

    affected_praxes = 0
    affected_pairs: list[tuple[int, int]] = []
    raw_delta = Decimal(0)

    for (character_id, era_id), praxes in sorted(grouped.items()):
        era_row = era_rows[era_id]
        era: EraConfig | None = era_config_for_key(era_row.config_key)
        if era is None:
            print(
                f"  ! era {era_id} has unknown config_key '{era_row.config_key}'"
                " - skipped, its rules are not in this build"
            )
            continue
        character = await session.get(Character, character_id)
        if character is None:
            continue
        stats = await get_or_create_stats(session, character_id, era_id)
        contributions = await compute_contributions(
            praxes, character, era, session, character_level=stats.level
        )
        moved = [c for c in contributions.values() if _moves(c)]
        if not moved:
            continue
        affected_praxes += len(moved)
        affected_pairs.append((character_id, era_id))
        pair_delta = sum(
            (exact(c.total) - _old_total(c) for c in moved), Decimal(0)
        )
        raw_delta += pair_delta
        print(
            f"  character {character_id} ({character.display_name}) era {era_id}: "
            f"{len(moved)} praxis/es, raw delta {pair_delta:+}"
        )

    print(f"\nAFFECTED ROWS: {affected_praxes} praxis/es across {len(affected_pairs)} "
          f"(character, era) pair(s); summed per-praxis delta {raw_delta:+}")
    if affected_praxes == 0:
        print("Nothing to backfill - every metatask sits under a x1.0 multiplier.")
        return 0

    if not apply:
        print("\nDRY RUN - nothing written. Re-run with --apply to re-bank these rows.")
        return 0

    print("\nRe-banking...")
    banked_delta = 0
    for character_id, era_id in affected_pairs:
        era_row = era_rows[era_id]
        era = era_config_for_key(era_row.config_key)
        if era is None:  # pragma: no cover - filtered above
            continue
        stats = await get_or_create_stats(session, character_id, era_id)
        before_score, before_level = stats.score, stats.level
        await recalculate_character_stats(
            character_id, session, era=era, era_row=era_row, emit_taunts=False
        )
        banked_delta += stats.score - before_score
        note = (
            ""
            if stats.level == before_level
            else f", level {before_level} -> {stats.level}"
        )
        print(
            f"  character {character_id} era {era_id}: "
            f"score {before_score} -> {stats.score}{note}"
        )
    await session.flush()
    print(
        f"\nDone: {len(affected_pairs)} (character, era) pair(s) re-banked, "
        f"banked score delta {banked_delta:+}."
    )
    print(
        "all_time_score moved by the same delta on that era's row and every "
        "later one (_credit_all_time_score)."
    )
    return 0


async def run(env: str, apply: bool) -> int:
    settings = get_settings(env)
    print(f"Environment : {env}")
    print(f"Database    : {settings.DATABASE_URL.split('@')[-1]}")  # host/db only
    print(f"Mode        : {'APPLY' if apply else 'dry run'}")
    print(f"Live era    : {CURRENT_ERA.config_key}\n")

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with async_session() as session:
            exit_code = await backfill_metatask_multiplier(session, apply)
            if exit_code == 0 and apply:
                await session.commit()
    finally:
        await engine.dispose()
    return exit_code


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Count and re-bank the CharacterStats rows ADR-0086 moves (#2633). "
            "Dry run unless --apply is given."
        )
    )
    add_env_argument(parser)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write the recalculated rows. Without it the script only counts.",
    )
    args = parser.parse_args()
    sys.exit(asyncio.run(run(args.env, args.apply)))


if __name__ == "__main__":
    main()

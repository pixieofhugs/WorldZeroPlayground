"""0047 declines surplus live duels instead of failing the deploy (#3654).

Seam: the migration's own ``DEDUPE_SQL`` against a TEMP ``duel`` table
shadowing the real one.
"""
import importlib.util
from pathlib import Path

import pytest
from sqlalchemy import text

_PATH = (
    Path(__file__).resolve().parents[2] / "alembic/versions/0047_duel_live_unique.py"
)


@pytest.mark.asyncio
async def test_dedupe_keeps_one_live_duel_per_side(db_session):
    spec = importlib.util.spec_from_file_location("duel_unique_migration", _PATH)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)

    await db_session.execute(text(
        "CREATE TEMP TABLE duel (id int, challenger_praxis_id int, "
        "opponent_praxis_id int, status varchar, declined_at timestamptz, "
        "created_at timestamptz)"
    ))
    # id, challenger, opponent, status; lower id = older
    rows = [
        (1, 10, None, "pending"),   # praxis 10: active beats older pending
        (2, 10, 20, "active"),
        (3, 10, None, "settled"),   # newer settled loses to the active
        (4, 11, None, "pending"),   # praxis 11: two pending -> oldest kept
        (5, 11, None, "pending"),
        (6, 12, None, "declined"),  # not live, untouched
        (7, 12, None, "pending"),
        (8, 13, 20, "pending"),     # opponent 20 already holds active 2
    ]
    for i, c, o, st in rows:
        await db_session.execute(
            text(
                "INSERT INTO duel VALUES (:i, :c, :o, :s, NULL, "
                "now() + CAST(:i AS int) * interval '1 second')"
            ),
            {"i": i, "c": c, "o": o, "s": st},
        )
    for side in ("challenger", "opponent"):
        await db_session.execute(text(migration.DEDUPE_SQL.format(side=side)))
    got = dict((await db_session.execute(
        text("SELECT id, status FROM duel ORDER BY id")
    )).all())
    assert got == {
        1: "declined", 2: "active", 3: "declined", 4: "pending", 5: "declined",
        6: "declined", 7: "pending", 8: "declined",
    }
    stamped = (await db_session.execute(
        text(
            "SELECT count(*) FROM duel "
            "WHERE status='declined' AND declined_at IS NULL"
        )
    )).scalar()
    assert stamped == 1  # only the untouched pre-declined row 6

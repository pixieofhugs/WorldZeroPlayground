"""0023's clean-up step turns stored locations into airport codes or '' (#2798).

Seam: the migration's own ``CLEAN_SQL`` against a table of unconstrained text. The
real column is already ``String(3)`` here, so a TEMP table (which shadows it on the
search path) stands in for the pre-narrowing column.
"""
import importlib.util
from pathlib import Path

import pytest
from sqlalchemy import text

_PATH = (
    Path(__file__).resolve().parents[2]
    / "alembic/versions/0023_character_location_code.py"
)


@pytest.mark.asyncio
async def test_clean_sql_keeps_codes_and_clears_the_rest(db_session):
    spec = importlib.util.spec_from_file_location("loc_migration", _PATH)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)

    await db_session.execute(
        text("CREATE TEMP TABLE character (id int, location varchar NOT NULL)")
    )
    cases = {
        1: "pdx ",
        2: "PDX",
        3: "",
        4: "14 Elm Street, Portland OR 97201",
        5: "P1X",
        6: "PDXX",
    }
    for i, v in cases.items():
        await db_session.execute(
            text("INSERT INTO character VALUES (:i, :v)"), {"i": i, "v": v}
        )
    await db_session.execute(text(migration.CLEAN_SQL))
    result = await db_session.execute(text("SELECT id, location FROM character"))
    rows = dict(result.all())
    assert rows == {1: "PDX", 2: "PDX", 3: "", 4: "", 5: "", 6: ""}

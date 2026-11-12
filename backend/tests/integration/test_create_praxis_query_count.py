"""#2873 — one ``create_praxis`` resolves the era row once and the stats once.

Per-table counts, not a total, so unrelated queries don't move it. Behaviour is
tested in ``test_signup_eligibility.py`` and ``test_level_jump_signup.py``.
"""
import re
from contextlib import contextmanager

import pytest
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.era import Era
from models.faction import Faction
from models.praxis import PraxisType
from services.praxis import create_praxis
from tests.integration.factories import make_task


@contextmanager
def _count_selects(db_connection):
    """Collect SELECTs on the test connection (copied, not a conftest fixture)."""
    selects: list[str] = []
    sync_connection = db_connection.sync_connection

    def before_cursor_execute(
        conn, cursor, statement, parameters, context, executemany
    ):
        if statement.lstrip().upper().startswith("SELECT"):
            selects.append(statement)

    event.listen(sync_connection, "before_cursor_execute", before_cursor_execute)
    try:
        yield selects
    finally:
        event.remove(sync_connection, "before_cursor_execute", before_cursor_execute)


def _reads_of(statements: list[str], table: str) -> int:
    """Word-anchored: ``character_stats.era_id`` would match a bare ``era``."""
    pattern = re.compile(rf"\bFROM {table}\b")
    return sum(1 for statement in statements if pattern.search(statement))


@pytest.mark.asyncio
async def test_one_signup_reads_the_era_row_and_the_stats_row_once_each(
    db_session: AsyncSession,
    db_connection,
    character: Character,
    era: Era,
    some_faction: Faction,
):
    task = await make_task(
        db_session,
        character,
        title="A task anyone may claim",
        description="",
        level_required=0,
        commit=True,
    )

    with _count_selects(db_connection) as statements:
        await create_praxis(task.id, PraxisType.solo, character.id, db_session)

    assert _reads_of(statements, "era") == 1
    assert _reads_of(statements, "character_stats") == 1

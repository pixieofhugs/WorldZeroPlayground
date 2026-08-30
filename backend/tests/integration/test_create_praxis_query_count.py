"""#2873 — one ``create_praxis`` resolves the era row once and the stats once.

**The seam under test** is :func:`services.praxis.create_praxis` → its two
helpers. A single sign-up used to resolve the live ``Era`` row and the
character's ``CharacterStats`` **three times**: once inside
:func:`services.signup_eligibility.evaluate_signup`, once in
``_check_create_preconditions`` immediately after that predicate returned, and
once in ``create_praxis`` itself immediately after the preconditions returned.
Three reads of one fact, none of which could disagree usefully.

The assertion is a *per-table* count rather than a total, because that is the
defect stated exactly: the era row is one row and the stats are one row, so one
sign-up should SELECT each of them once. A total would also move when an
unrelated query is added or removed and would say nothing about this bug.

The behaviour half lives in the files that already own it —
``test_signup_eligibility.py`` (the gates), ``test_level_jump_signup.py``
(#811's stamp, which reads the same stats row this collapses) and
``test_task_can_sign_up_filter.py`` (the browse's page-wide precompute). This
file only counts.
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
    """Collect every SELECT issued on the test connection while the block runs.

    The same twelve lines as ``test_task_list_query_count.py`` and
    ``test_praxis_list_query_count.py``, copied for the same reason they copy
    each other: a query counter that lives in ``conftest.py`` is a fixture every
    test file inherits and none of them declares, and this is cheaper to read
    where it is used than to look up.
    """
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
    """How many of ``statements`` select FROM ``table``.

    Word-anchored: ``character_stats.era_id`` appears in the projection of the
    stats read, so a bare substring test for ``era`` would count it twice.
    """
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

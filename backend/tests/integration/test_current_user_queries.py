"""Query-count guard for the /auth/me composition (#1381).

Every signed-in page load gates on this request, so the number of round trips it
makes is a behaviour worth pinning: a regression here is paid by the whole site.
The seam under test is ``services.current_user.build_current_user`` — the counter
listens on SQLAlchemy's ``Engine`` class (events on the class fire for every
engine, including the async engine behind the test connection) and keeps only
SELECTs, so transaction bookkeeping cannot skew the count.
"""
import contextlib

import pytest
from httpx import AsyncClient
from sqlalchemy import event, select
from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.invitation_letter import InvitationLetter
from models.roles import AccountRole, Role
from tests.integration.factories import DEFAULT_FACTION_SLUG


@contextlib.contextmanager
def count_selects():
    statements: list[str] = []

    def _record(conn, cursor, statement, parameters, context, executemany) -> None:
        if statement.lstrip().upper().startswith("SELECT"):
            statements.append(statement)

    event.listen(Engine, "before_cursor_execute", _record)
    try:
        yield statements
    finally:
        event.remove(Engine, "before_cursor_execute", _record)


@pytest.fixture
async def dressed_viewer(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
) -> Account:
    """A signed-in viewer with every /auth/me branch live.

    Admin role, a carried life at the albescent level gate, and an invitation
    letter — so the counted request exercises the deepest path rather than the
    early-return one.
    """
    account.active_character_id = character.id

    role = Role(name="admin")
    db_session.add(role)
    await db_session.flush()
    db_session.add(
        AccountRole(account_id=account.id, role_id=role.id, granted_by=account.id)
    )

    stats = await db_session.scalar(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats.level = CURRENT_ERA.albescent_level_required
    stats.score = 1000

    db_session.add(
        InvitationLetter(
            character_id=character.id,
            era_id=era.id,
            faction_slug=DEFAULT_FACTION_SLUG,
        )
    )
    await db_session.commit()
    return account


@pytest.mark.asyncio
async def test_auth_me_query_count(
    client: AsyncClient,
    dressed_viewer: Account,
    auth_headers: dict,
):
    """/auth/me stays within its round-trip budget.

    Baseline before #1381 was 12 SELECTs (11 in ``build_current_user`` plus the
    auth dependency's account load), four of which re-read the same Era row.
    Raise this number only with a reason.
    """
    with count_selects() as statements:
        resp = await client.get("/auth/me", headers=auth_headers)

    assert resp.status_code == 200
    assert len(statements) <= 8, "\n\n".join(statements)

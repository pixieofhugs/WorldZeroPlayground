"""account_role and praxis_invite refuse duplicate rows at the DB (#3432)."""
import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.character import Character
from models.praxis import Praxis, PraxisInvite, PraxisInviteStatus
from models.roles import AccountRole, Role


async def test_account_role_is_unique_per_account(
    db_session: AsyncSession, account: Account
):
    role = Role(name="mod", description="")
    db_session.add(role)
    await db_session.flush()

    def grant() -> AccountRole:
        return AccountRole(
            account_id=account.id, role_id=role.id, granted_by=account.id
        )

    db_session.add(grant())
    await db_session.flush()
    with pytest.raises(IntegrityError):
        db_session.add(grant())
        await db_session.flush()
    await db_session.rollback()


async def test_only_one_pending_invite_but_resend_after_decline(
    db_session: AsyncSession,
    praxis_collab: Praxis,
    character: Character,
    character3: Character,
):
    def invite(status: PraxisInviteStatus) -> PraxisInvite:
        return PraxisInvite(
            praxis_id=praxis_collab.id,
            inviter_id=character.id,
            invitee_id=character3.id,
            status=status,
        )

    db_session.add_all(
        [invite(PraxisInviteStatus.declined), invite(PraxisInviteStatus.pending)]
    )
    await db_session.flush()

    with pytest.raises(IntegrityError):
        db_session.add(invite(PraxisInviteStatus.pending))
        await db_session.flush()
    await db_session.rollback()

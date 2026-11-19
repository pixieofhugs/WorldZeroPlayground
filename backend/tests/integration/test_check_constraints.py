"""The DB refuses era-independent bad rows on its own (#3441)."""
import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.praxis import Praxis
from models.relationship import Relationship, RelationshipType
from models.task import Task
from models.vote import Vote


@pytest.mark.parametrize("value", [0, -1])
async def test_vote_value_must_be_positive(
    db_session: AsyncSession, praxis_solo: Praxis, character2: Character, value: int
):
    db_session.add(
        Vote(
            praxis_id=praxis_solo.id,
            voter_character_id=character2.id,
            voter_account_id=character2.account_id,
            value=value,
        )
    )
    with pytest.raises(IntegrityError, match="ck_vote_value_positive"):
        await db_session.flush()
    await db_session.rollback()


async def test_task_point_value_cannot_be_negative(
    db_session: AsyncSession, active_task: Task
):
    active_task.point_value = -1
    with pytest.raises(IntegrityError, match="ck_task_point_value_nonnegative"):
        await db_session.flush()
    await db_session.rollback()


async def test_relationship_cannot_target_yourself(
    db_session: AsyncSession, character: Character
):
    db_session.add(
        Relationship(
            from_character_id=character.id,
            to_character_id=character.id,
            type=RelationshipType.friend,
        )
    )
    with pytest.raises(IntegrityError, match="ck_relationship_no_self_relationship"):
        await db_session.flush()
    await db_session.rollback()

"""A closed era's praxis scores and Task Crown freeze (ADR-0099).

Votes cast in the live era on a closed-era praxis count toward the live era's
total, so the praxis's own number, and the crown that ranks by it, stay put.
"""
from datetime import timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.era import Era
from models.faction import Faction
from models.task import Task, TaskStatus
from models.vote import Vote
from services.vote import cast_vote_on_praxis
from tests.integration.test_era_scoped_recalc import (  # noqa: F401  (fixtures)
    _sealed_praxis,
    current_era,
    prior_era,
)


async def _cards(client: AsyncClient, task_id: int) -> dict[int, dict]:
    response = await client.get("/praxes", params={"task_id": task_id, "era_scope": "all_eras"})
    assert response.status_code == 200
    return {card["id"]: card for card in response.json()}


@pytest.mark.asyncio
async def test_closed_era_crown_and_score_ignore_votes_cast_later(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    character3: Character,
    prior_era: Era,
    current_era: Era,
    some_faction: Faction,
):
    task = Task(
        title="Shared task",
        description="",
        point_value=100,
        level_required=0,
        status=TaskStatus.active,
        created_by_id=character.id,
    )
    db_session.add(task)
    await db_session.flush()
    old = await _sealed_praxis(
        db_session, character, title="Old", points=100, task=task,
        sealed_at=prior_era.started_at + timedelta(days=1),
    )
    live = await _sealed_praxis(
        db_session, character3, title="Live", points=100, task=task,
        sealed_at=current_era.started_at + timedelta(minutes=1),
    )
    db_session.add_all(
        [
            Vote(
                praxis_id=old.id, voter_character_id=character2.id,
                voter_account_id=character2.account_id, value=2,
                era_id=prior_era.id,
            ),
            Vote(
                praxis_id=live.id, voter_character_id=character2.id,
                voter_account_id=character2.account_id, value=3,
                era_id=current_era.id,
            ),
        ]
    )
    await db_session.commit()

    before = await _cards(client, task.id)
    assert before[live.id]["is_top_for_task"] and not before[old.id]["is_top_for_task"]

    await cast_vote_on_praxis(character3, old.id, 5, db_session)
    await db_session.commit()

    after = await _cards(client, task.id)
    assert after[old.id]["score"] == before[old.id]["score"]
    assert {i: c["is_top_for_task"] for i, c in after.items()} == {
        i: c["is_top_for_task"] for i, c in before.items()
    }
    # The live era's displayed score is what the crown ranked by.
    top = max(after.values(), key=lambda card: card["score"])
    assert top["is_top_for_task"]

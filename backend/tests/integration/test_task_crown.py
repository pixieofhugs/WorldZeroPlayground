"""Task Crown ``is_top_for_task`` (ADR-0028, #354): top submitted praxis by displayed
score (ADR-0028 amendment, #3417); all ties crowned, including all-zero."""
import pytest
from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.era import Era
from models.faction import Faction
from models.praxis import UNSCORED_MODERATION_STATUSES, ModerationStatus, Praxis
from models.task import Task
from services.praxis_out import crowned_praxis_ids
from tests.integration.factories import make_duel


async def _create_and_submit_praxis(
    client: AsyncClient, task_id: int, title: str, headers: dict
) -> int:
    create_resp = await client.post(
        "/praxes",
        json={"task_id": task_id, "type": "solo", "title": title},
        headers=headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]
    submit_resp = await client.post(f"/praxes/{praxis_id}/submit", headers=headers)
    assert submit_resp.status_code == 200
    return praxis_id


async def _crown_by_id(client: AsyncClient, task_id: int, headers: dict | None = None) -> dict[int, bool]:
    list_resp = await client.get(
        "/praxes", params={"task_id": task_id}, headers=headers or {}
    )
    assert list_resp.status_code == 200
    return {card["id"]: card["is_top_for_task"] for card in list_resp.json()}


@pytest.mark.asyncio
async def test_sole_entrant_is_crowned(
    client: AsyncClient,
    character2: Character,
    active_task: Task,
    auth_headers2: dict,
):
    praxis_id = await _create_and_submit_praxis(
        client, active_task.id, "Sole entrant", auth_headers2
    )

    crowns = await _crown_by_id(client, active_task.id)
    assert crowns == {praxis_id: True}

    detail_resp = await client.get(f"/praxes/{praxis_id}")
    assert detail_resp.status_code == 200
    assert detail_resp.json()["is_top_for_task"] is True


@pytest.mark.asyncio
async def test_higher_vote_praxis_takes_the_crown(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    praxis1_id = await _create_and_submit_praxis(
        client, active_task.id, "Challenger", auth_headers
    )
    praxis2_id = await _create_and_submit_praxis(
        client, active_task.id, "Champion", auth_headers2
    )

    crowns = await _crown_by_id(client, active_task.id)
    assert crowns == {praxis1_id: True, praxis2_id: True}

    vote_resp = await client.post(
        f"/praxes/{praxis2_id}/vote", json={"value": 4}, headers=auth_headers
    )
    assert vote_resp.status_code == 200

    crowns = await _crown_by_id(client, active_task.id)
    assert crowns == {praxis1_id: False, praxis2_id: True}


@pytest.mark.asyncio
async def test_tied_vote_points_crown_all(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    praxis1_id = await _create_and_submit_praxis(
        client, active_task.id, "Co-champion A", auth_headers
    )
    praxis2_id = await _create_and_submit_praxis(
        client, active_task.id, "Co-champion B", auth_headers2
    )

    resp = await client.post(
        f"/praxes/{praxis2_id}/vote", json={"value": 3}, headers=auth_headers
    )
    assert resp.status_code == 200
    resp = await client.post(
        f"/praxes/{praxis1_id}/vote", json={"value": 3}, headers=auth_headers2
    )
    assert resp.status_code == 200

    crowns = await _crown_by_id(client, active_task.id)
    assert crowns == {praxis1_id: True, praxis2_id: True}


@pytest.mark.asyncio
async def test_in_progress_praxis_neither_competes_nor_wears_the_crown(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Still drafting"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    draft_id = create_resp.json()["id"]

    submitted_id = await _create_and_submit_praxis(
        client, active_task.id, "Published", auth_headers2
    )

    # The draft's member sees both cards (ADR-0024).
    crowns = await _crown_by_id(client, active_task.id, headers=auth_headers)
    assert crowns == {draft_id: False, submitted_id: True}


@pytest.mark.asyncio
async def test_crown_follows_displayed_score_not_raw_votes(
    db_session: AsyncSession, era: Era, some_faction: Faction
):
    """A forfeiting duelist with more raw stars loses the crown to the duel winner."""
    duel, challenger, opponent = await make_duel(
        db_session, era, label="crown", forfeiter="challenger",
        challenger_votes=5, opponent_votes=1, commit=True,
    )
    assert await crowned_praxis_ids([duel.task_id], db_session) == {
        duel.opponent_praxis_id
    }


async def _moderate(db: AsyncSession, praxis_id: int, status: ModerationStatus) -> None:
    await db.execute(
        update(Praxis).where(Praxis.id == praxis_id).values(moderation_status=status)
    )
    await db.commit()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "status", sorted(UNSCORED_MODERATION_STATUSES, key=lambda s: s.value)
)
async def test_unscored_praxis_neither_wears_nor_blocks_crown(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    status: ModerationStatus,
):
    task_id = active_task.id
    honest = await _create_and_submit_praxis(client, task_id, "Honest", auth_headers)
    spam = await _create_and_submit_praxis(client, task_id, "Spam", auth_headers2)
    vote = await client.post(
        f"/praxes/{spam}/vote", json={"value": 5}, headers=auth_headers
    )
    assert vote.status_code == 200
    assert await crowned_praxis_ids([active_task.id], db_session) == {spam}

    await _moderate(db_session, spam, status)

    # The honest praxis is now the sole entrant (ADR-0028).
    assert await crowned_praxis_ids([active_task.id], db_session) == {honest}


@pytest.mark.asyncio
async def test_flagged_praxis_still_competes_for_crown(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    await _create_and_submit_praxis(client, active_task.id, "Honest", auth_headers)
    flagged = await _create_and_submit_praxis(
        client, active_task.id, "Flagged", auth_headers2
    )
    await client.post(
        f"/praxes/{flagged}/vote", json={"value": 5}, headers=auth_headers
    )
    await _moderate(db_session, flagged, ModerationStatus.flagged)

    assert await crowned_praxis_ids([active_task.id], db_session) == {flagged}

"""#3774: "mine" for votes and completions means creator OR member."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.relationship import Relationship, RelationshipType
from models.task import Task


async def _items(client: AsyncClient, headers: dict, item_type: str, feed_filter: str) -> list[dict]:
    resp = await client.get(
        "/activity-feed", params={"filter": feed_filter, "limit": 100}, headers=headers
    )
    assert resp.status_code == 200, resp.text
    return [item for item in resp.json()["items"] if item["type"] == item_type]


async def _collab(
    db_session: AsyncSession, task: Task, creator: Character, members: list[Character]
) -> Praxis:
    collab = Praxis(
        task_id=task.id,
        created_by_id=creator.id,
        type=PraxisType.collab,
        status=PraxisStatus.submitted,
        title="Ours",
        body_text="proof",
    )
    db_session.add(collab)
    await db_session.flush()
    db_session.add_all(
        PraxisMember(praxis_id=collab.id, character_id=member.id) for member in members
    )
    await db_session.commit()
    await db_session.refresh(collab, ["members"])  # the vote route reads it lazily
    return collab


@pytest.mark.asyncio
async def test_creator_and_member_each_get_one_vote_card_and_one_after_rerating(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    character3: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
    auth_headers3: dict,
):
    collab = await _collab(db_session, active_task, character, [character, character2])
    vote = await client.post(
        f"/praxes/{collab.id}/vote", json={"value": 4}, headers=auth_headers3
    )
    assert vote.status_code == 200, vote.text

    for headers in (auth_headers, auth_headers2):
        assert len(await _items(client, headers, "vote_on_mine", "your_stuff")) == 1

    await client.post(f"/praxes/{collab.id}/vote", json={"value": 2}, headers=auth_headers3)
    for headers in (auth_headers, auth_headers2):
        assert await _items(client, headers, "vote_on_mine", "your_stuff") == []
        assert len(await _items(client, headers, "vote_changed_on_mine", "your_stuff")) == 1


@pytest.mark.asyncio
async def test_friend_who_only_joined_a_collab_gives_one_completion_card_as_actor(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    character3: Character,
    active_task: Task,
    auth_headers: dict,
):
    db_session.add(
        Relationship(
            from_character_id=character.id,
            to_character_id=character2.id,
            type=RelationshipType.friend,
        )
    )
    await db_session.commit()
    collab = await _collab(db_session, active_task, character3, [character3, character2])

    cards = await _items(client, auth_headers, "friend_completion", "friends")
    assert [card["item_key"] for card in cards] == [f"friend_completion:{collab.id}"]
    assert cards[0]["payload"]["character_id"] == character2.id
    assert cards[0]["actor_display_name"] == character2.display_name

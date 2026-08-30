"""#2159 — a plain comment on your praxis is a feed event.

THE SEAM UNDER TEST is the feed's source registry —
``services.activity_feed.FEED_SOURCES`` — read end to end through
``GET /activity-feed``. The feed is a UNION read-model over source tables and
stores nothing of its own, so "emit an event" here means "add a source that can
see the ``comment`` rows that already exist", not a write on the comment-create
path. That is why every test below creates its comment through the ordinary
``POST /praxes/{id}/comments`` route: if the row only appears because a test
reached past the real path, the feature is not built.

``comment_mention`` fires when someone **@mentions** you; before this issue a
plain comment on your own praxis produced nothing from any of the sixteen
sources, which is the whole of the parent issue's *"if someone comments on a
thing"*.

THE ONE THAT SHIPS WRONG is the double. A comment that both @mentions you and
sits on your praxis matches two sources, and the naive registry entry prints two
rows for one comment. Being named is the stronger signal, so ``comment_mention``
wins and ``comment_on_mine`` withholds — asserted on the TOTAL number of
comment-shaped rows, not on the presence of the winner, because a test that only
looks for ``comment_mention`` passes while the duplicate sits right beside it.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.task import Task

#: The two comment-shaped feed types. Assertions count rows across BOTH, so the
#: suppression cannot be satisfied by a winner that merely exists.
COMMENT_TYPES = ("comment_on_mine", "comment_mention")


async def _comment_rows(client: AsyncClient, headers: dict) -> list[dict]:
    """Every comment-shaped row on the viewer's `your_stuff` tab."""
    resp = await client.get(
        "/activity-feed", params={"filter": "your_stuff"}, headers=headers
    )
    assert resp.status_code == 200, resp.text
    return [item for item in resp.json()["items"] if item["type"] in COMMENT_TYPES]


@pytest.mark.asyncio
async def test_a_plain_comment_on_my_praxis_is_a_feed_row(
    client: AsyncClient,
    character: Character,
    character2: Character,
    praxis_solo: Praxis,
    auth_headers: dict,
    auth_headers2: dict,
):
    """The defect itself: someone comments, and the author is told."""
    create = await client.post(
        f"/praxes/{praxis_solo.id}/comments",
        json={"body_text": "this is genuinely good"},
        headers=auth_headers2,
    )
    assert create.status_code == 201, create.text

    rows = await _comment_rows(client, auth_headers)
    assert [row["type"] for row in rows] == ["comment_on_mine"]

    row = rows[0]
    assert row["item_key"] == f"comment_on_mine:{create.json()['id']}"
    assert row["actor_display_name"] == character2.display_name
    assert row["payload"]["praxis_id"] == praxis_solo.id
    assert row["payload"]["character_id"] == character2.id
    assert row["payload"]["excerpt"] == "this is genuinely good"


@pytest.mark.asyncio
async def test_a_mentioning_comment_on_my_praxis_is_one_row_not_two(
    client: AsyncClient,
    character: Character,
    character2: Character,
    praxis_solo: Praxis,
    auth_headers: dict,
    auth_headers2: dict,
):
    """The double. One comment, one row — and the row is the mention.

    Both sources match this comment: it @mentions ``character`` AND it sits on
    ``character``'s own praxis. Being named is the stronger signal, so the
    mention is what survives.
    """
    create = await client.post(
        f"/praxes/{praxis_solo.id}/comments",
        json={"body_text": f"@{character.username} what did you use for this?"},
        headers=auth_headers2,
    )
    assert create.status_code == 201, create.text

    rows = await _comment_rows(client, auth_headers)
    assert [row["type"] for row in rows] == ["comment_mention"]


@pytest.mark.asyncio
async def test_my_own_comment_on_my_own_praxis_is_not_a_row(
    client: AsyncClient,
    character: Character,
    era,
    db_session: AsyncSession,
    praxis_solo: Praxis,
    auth_headers: dict,
):
    """You are not news to yourself."""
    from models.character_stats import CharacterStats
    from sqlalchemy import select

    stats = (
        await db_session.execute(
            select(CharacterStats).where(
                CharacterStats.character_id == character.id,
                CharacterStats.era_id == era.id,
            )
        )
    ).scalar_one()
    stats.level = 5
    await db_session.commit()

    create = await client.post(
        f"/praxes/{praxis_solo.id}/comments",
        json={"body_text": "replying to myself"},
        headers=auth_headers,
    )
    assert create.status_code == 201, create.text

    assert await _comment_rows(client, auth_headers) == []


@pytest.mark.asyncio
async def test_a_collab_member_who_did_not_author_it_still_gets_the_row(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """"Yours" is membership, not only authorship — the collab half of the rule.

    ``character2`` authors the collab and comments on it; ``character`` is a
    member who wrote neither. The row is news to the member and not to the
    commenter, even though the commenter is the one who created the praxis.
    """
    collab = Praxis(
        task_id=active_task.id,
        created_by_id=character2.id,
        type=PraxisType.collab,
        status=PraxisStatus.submitted,
        title="Ours",
        body_text="proof",
    )
    db_session.add(collab)
    await db_session.flush()
    db_session.add_all(
        [
            PraxisMember(praxis_id=collab.id, character_id=character2.id),
            PraxisMember(praxis_id=collab.id, character_id=character.id),
        ]
    )
    await db_session.commit()

    create = await client.post(
        f"/praxes/{collab.id}/comments",
        json={"body_text": "adding the last photo tonight"},
        headers=auth_headers2,
    )
    assert create.status_code == 201, create.text

    rows = await _comment_rows(client, auth_headers)
    assert [row["type"] for row in rows] == ["comment_on_mine"]
    assert rows[0]["payload"]["praxis_id"] == collab.id

    # ...and the commenter, who authored the praxis, is told nothing.
    assert await _comment_rows(client, auth_headers2) == []


@pytest.mark.asyncio
async def test_a_withdrawn_comment_takes_its_row_with_it(
    client: AsyncClient,
    character2: Character,
    praxis_solo: Praxis,
    auth_headers: dict,
    auth_headers2: dict,
):
    """Same visibility rule the mention card already obeys.

    A withdrawn comment is gone from the public thread; a feed card that outlived
    it would republish text its author had retracted.
    """
    create = await client.post(
        f"/praxes/{praxis_solo.id}/comments",
        json={"body_text": "wait, ignore me"},
        headers=auth_headers2,
    )
    assert create.status_code == 201, create.text
    assert len(await _comment_rows(client, auth_headers)) == 1

    delete = await client.delete(
        f"/comments/{create.json()['id']}", headers=auth_headers2
    )
    assert delete.status_code == 204, delete.text

    assert await _comment_rows(client, auth_headers) == []

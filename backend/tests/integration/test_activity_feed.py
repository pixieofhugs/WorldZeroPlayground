"""Integration tests for /activity-feed endpoint.

Exercises the activity feed service end-to-end via the router.  The primary
purpose is to catch ORM-level regressions such as the Praxis.character_id ->
Praxis.created_by_id rename (Bug 5): the queries would only fail at runtime,
not at import time.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from models.character import Character
from models.task import Task


@pytest.mark.asyncio
async def test_activity_feed_shows_votes_on_mine(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """character owns a praxis, character2 votes on it, feed shows vote_on_mine entry."""
    # character creates a solo praxis
    create_resp = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Feed praxis"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    praxis_id = create_resp.json()["id"]

    # character2 votes on it (voter != praxis owner, distinct accounts)
    vote_resp = await client.post(
        f"/praxes/{praxis_id}/vote",
        json={"value": 4},
        headers=auth_headers2,
    )
    assert vote_resp.status_code == 200

    # character fetches their activity feed
    feed_resp = await client.get(
        "/activity-feed",
        params={"filter": "your_stuff"},
        headers=auth_headers,
    )
    assert feed_resp.status_code == 200
    data = feed_resp.json()

    vote_items = [item for item in data["items"] if item["type"] == "vote_on_mine"]
    assert len(vote_items) == 1, f"Expected one vote_on_mine item, got: {data['items']}"
    entry = vote_items[0]
    assert entry["payload"]["praxis_id"] == praxis_id
    assert entry["payload"]["value"] == 4
    assert entry["actor_display_name"] == character2.display_name


# Maps each filter-tab query param to its badge-count key in the response.
_TAB_TO_COUNT_KEY = {
    "all": "all",
    "friends": "friends",
    "foes": "foes",
    "your_stuff": "your_stuff",
    "global": "global_count",
    "requests": "requests",
}


@pytest.mark.asyncio
async def test_badge_count_equals_windowed_fetch_length_per_tab(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    character3: Character,
    active_task: Task,
    auth_headers: dict,
):
    """Every badge count must equal the length of that tab's windowed fetch.

    This is the invariant ADR-0036 buys by deriving counts from each source's
    own query. It is the net that would have caught the three pre-registry
    count drifts:

    1. ``duel_challenge`` had no count closure -> ``your_stuff`` undercounted.
    2. ``requests`` counted only pending ``PraxisInvite`` -> pending duels missed.
    3. counts ignored the ``before`` cursor / SUB_QUERY_LIMIT window.

    We seed one item per source so a pending duel challenge lands in both
    ``your_stuff`` and ``requests``; under the old counts those tabs would read
    ``count < len(items)``.
    """
    from models.duel import Duel, DuelStatus
    from models.praxis import (
        Praxis,
        PraxisInvite,
        PraxisInviteStatus,
        PraxisMember,
        PraxisStatus,
        PraxisType,
    )
    from models.relationship import Relationship, RelationshipStatus, RelationshipType
    from models.taunt_message import TauntMessage, TauntTriggerType
    from models.vote import Vote

    # --- your_stuff: vote_on_mine -----------------------------------------
    my_praxis = Praxis(
        task_id=active_task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        status=PraxisStatus.submitted,
        title="My submitted praxis",
        body_text="proof",
    )
    db_session.add(my_praxis)
    await db_session.flush()
    db_session.add(PraxisMember(praxis_id=my_praxis.id, character_id=character.id))
    db_session.add(
        Vote(
            praxis_id=my_praxis.id,
            voter_character_id=character2.id,
            voter_account_id=character2.account_id,
            value=3,
        )
    )

    # --- your_stuff + requests: collab_invite (pending) -------------------
    collab_praxis = Praxis(
        task_id=active_task.id,
        created_by_id=character2.id,
        type=PraxisType.collab,
        status=PraxisStatus.in_progress,
        title="Collab praxis",
        body_text="proof",
    )
    db_session.add(collab_praxis)
    await db_session.flush()
    db_session.add(
        PraxisInvite(
            praxis_id=collab_praxis.id,
            inviter_id=character2.id,
            invitee_id=character.id,
            status=PraxisInviteStatus.pending,
        )
    )

    # --- your_stuff + requests: duel_challenge (pending) — bugs 1 & 2 -----
    challenger_praxis = Praxis(
        task_id=active_task.id,
        created_by_id=character2.id,
        type=PraxisType.solo,
        status=PraxisStatus.in_progress,
        title="Duel challenger praxis",
        body_text="proof",
    )
    db_session.add(challenger_praxis)
    await db_session.flush()
    db_session.add(
        Duel(
            task_id=active_task.id,
            challenger_praxis_id=challenger_praxis.id,
            opponent_character_id=character.id,
            status=DuelStatus.pending,
        )
    )

    # --- friends: friend_completion ---------------------------------------
    db_session.add(
        Relationship(
            from_character_id=character.id,
            to_character_id=character2.id,
            type=RelationshipType.friend,
            status=RelationshipStatus.active,
        )
    )
    friend_praxis = Praxis(
        task_id=active_task.id,
        created_by_id=character2.id,
        type=PraxisType.solo,
        status=PraxisStatus.submitted,
        title="Friend completion",
        body_text="proof",
    )
    db_session.add(friend_praxis)

    # --- foes: foe_taunt --------------------------------------------------
    db_session.add(
        Relationship(
            from_character_id=character.id,
            to_character_id=character3.id,
            type=RelationshipType.foe,
            status=RelationshipStatus.active,
        )
    )
    db_session.add(
        TauntMessage(
            from_character_id=character3.id,
            to_character_id=character.id,
            faction_slug="ua",
            trigger_type=TauntTriggerType.score_overtake,
        )
    )

    await db_session.commit()

    # For every tab, the badge count must equal the number of items the same
    # windowed fetch returns (limit high enough that pagination can't truncate).
    for tab, count_key in _TAB_TO_COUNT_KEY.items():
        resp = await client.get(
            "/activity-feed",
            params={"filter": tab, "limit": 100},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["counts"][count_key] == len(data["items"]), (
            f"tab={tab}: badge {data['counts'][count_key]} != "
            f"len(items) {len(data['items'])}"
        )

    # Bug 1 & 2 made observable: the pending duel must be counted in BOTH the
    # your_stuff and requests badges (old code counted it in neither).
    your_stuff = (
        await client.get(
            "/activity-feed",
            params={"filter": "your_stuff", "limit": 100},
            headers=auth_headers,
        )
    ).json()
    assert any(i["type"] == "duel_challenge" for i in your_stuff["items"])
    assert your_stuff["counts"]["your_stuff"] == 3  # vote + collab invite + duel

    requests = (
        await client.get(
            "/activity-feed",
            params={"filter": "requests", "limit": 100},
            headers=auth_headers,
        )
    ).json()
    assert any(i["type"] == "duel_challenge" for i in requests["items"])
    assert requests["counts"]["requests"] == 2  # pending collab invite + pending duel


@pytest.mark.asyncio
async def test_activity_feed_shows_collaborator_submitted(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """A co-member submitting their part of a collab the viewer is in surfaces a
    collaborator_submitted entry in the viewer's feed (#571)."""
    create = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "Team"},
        headers=auth_headers2,
    )
    praxis_id = create.json()["id"]
    inv = await client.post(
        f"/praxes/{praxis_id}/invite",
        json={"invitee_id": character.id},
        headers=auth_headers2,
    )
    await client.post(
        f"/praxes/{praxis_id}/invite/{inv.json()['id']}/respond",
        json={"accept": True},
        headers=auth_headers,
    )
    # character2 submits their part -> pending; character (a co-member) should see it.
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)

    feed = await client.get(
        "/activity-feed", params={"filter": "your_stuff"}, headers=auth_headers
    )
    assert feed.status_code == 200
    items = [i for i in feed.json()["items"] if i["type"] == "collaborator_submitted"]
    assert len(items) == 1, feed.json()["items"]
    entry = items[0]
    assert entry["payload"]["praxis_id"] == praxis_id
    assert entry["payload"]["character_id"] == character2.id
    assert entry["actor_display_name"] == character2.display_name

    # The submitter does not get a notification about their own submission.
    own = await client.get(
        "/activity-feed", params={"filter": "your_stuff"}, headers=auth_headers2
    )
    assert not [
        i for i in own.json()["items"] if i["type"] == "collaborator_submitted"
    ]


@pytest.mark.asyncio
async def test_activity_feed_awaiting_submission_in_requests(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """A collab awaiting the viewer's own submission surfaces as an
    ``awaiting_submission`` request (panel + badge), and clears once they
    submit (#updates-badge — 'waiting on you to submit')."""
    create = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "Team"},
        headers=auth_headers2,
    )
    praxis_id = create.json()["id"]
    inv = await client.post(
        f"/praxes/{praxis_id}/invite",
        json={"invitee_id": character.id},
        headers=auth_headers2,
    )
    await client.post(
        f"/praxes/{praxis_id}/invite/{inv.json()['id']}/respond",
        json={"accept": True},
        headers=auth_headers,
    )

    # character joined but hasn't submitted -> it's in their court.
    requests = (
        await client.get(
            "/activity-feed", params={"filter": "requests", "limit": 100},
            headers=auth_headers,
        )
    ).json()
    awaiting = [i for i in requests["items"] if i["type"] == "awaiting_submission"]
    assert len(awaiting) == 1, requests["items"]
    assert awaiting[0]["payload"]["praxis_id"] == praxis_id
    assert awaiting[0]["payload"]["praxis_type"] == "collab"
    # Count/badge stays consistent with the fetch (ADR-0036 invariant).
    assert requests["counts"]["requests"] == len(requests["items"])

    # Once character submits their part, the praxis leaves their requests bucket.
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)
    after = (
        await client.get(
            "/activity-feed", params={"filter": "requests", "limit": 100},
            headers=auth_headers,
        )
    ).json()
    assert not [i for i in after["items"] if i["type"] == "awaiting_submission"]

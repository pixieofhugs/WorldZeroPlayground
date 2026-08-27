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
from tests.integration.factories import DEFAULT_FACTION_SLUG


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
            faction_slug=DEFAULT_FACTION_SLUG,
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

    # ADR-0070: the pending duel and the pending invite are obligations, so they
    # left `your_stuff` for the queue — and the badge left with them.
    your_stuff = (
        await client.get(
            "/activity-feed",
            params={"filter": "your_stuff", "limit": 100},
            headers=auth_headers,
        )
    ).json()
    assert not any(i["type"] == "duel_challenge" for i in your_stuff["items"])
    assert your_stuff["counts"]["your_stuff"] == 1  # the vote, and nothing else

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
async def test_collaborator_submitted_carries_the_viewers_own_state(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """#2284 — the row says whether the READER still owes their part.

    ``collaborator_submitted`` describes the submitter and, until now, nothing
    else, so the renderer had no way to tell "they filed, you haven't" from
    "you both filed" and offered its Submit-yours CTA on both. The fact belongs
    on the wire rather than inferred client-side: the viewer's own
    ``PraxisMember`` row is one join from a query that already selects it.

    The row itself stays either way — a collaborator filing their part is real
    news whether or not you filed yours. Only the CTA is at stake, which is why
    this is a payload field and not a predicate in the WHERE. Contrast
    ``_collab_invites_query``, where the *whole card* was unanswerable (#2279).
    """
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
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers2)

    async def viewer_row() -> dict:
        feed = await client.get(
            "/activity-feed", params={"filter": "your_stuff"}, headers=auth_headers
        )
        assert feed.status_code == 200
        rows = [
            i for i in feed.json()["items"] if i["type"] == "collaborator_submitted"
        ]
        assert len(rows) == 1, feed.json()["items"]
        return rows[0]

    still_owed = await viewer_row()
    assert still_owed["payload"]["viewer_has_submitted"] is False, (
        "the viewer has not filed their part, so the CTA is still live"
    )

    # The reporter's case: the viewer files too, and the row survives.
    await client.post(f"/praxes/{praxis_id}/submit", headers=auth_headers)

    filed = await viewer_row()
    assert filed["payload"]["viewer_has_submitted"] is True, (
        "the viewer has filed, so the CTA must drop"
    )


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


@pytest.mark.asyncio
async def test_one_member_collab_owes_nobody_until_someone_joins(
    client: AsyncClient,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
    auth_headers2: dict,
):
    """A collab you created and never added anyone to is not an obligation (#1980).

    The rule ``_awaiting_submission_query`` means is "somebody else is involved",
    and it used to be written as a *type* check — so a collab with one member
    told its creator, the instant they pressed save, that it was waiting on them.
    Asserted on **both** halves of the ADR-0070 partition: the item has to leave
    the Requests queue and the ``/me/sidebar`` badge together, since the badge is
    a COUNT over the same source query rather than a second predicate.
    """
    create = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "collab", "title": "Just me"},
        headers=auth_headers2,
    )
    assert create.status_code in (200, 201), create.text
    praxis_id = create.json()["id"]

    async def awaiting_for_creator() -> list[dict]:
        requests = (
            await client.get(
                "/activity-feed", params={"filter": "requests", "limit": 100},
                headers=auth_headers2,
            )
        ).json()
        # The badge and the queue must agree at every step, not just at the end.
        sidebar = await client.get("/me/sidebar", headers=auth_headers2)
        assert sidebar.json()["pending_requests_count"] == len(requests["items"])
        return [i for i in requests["items"] if i["type"] == "awaiting_submission"]

    assert await awaiting_for_creator() == [], (
        "a collab with only its creator in it is a solo draft in every respect "
        "the rule cares about — nobody is waiting on anybody"
    )

    # The moment a second member lands, somebody genuinely is waiting.
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

    appeared = await awaiting_for_creator()
    assert len(appeared) == 1, appeared
    assert appeared[0]["payload"]["praxis_id"] == praxis_id


@pytest.mark.asyncio
async def test_solo_praxis_never_awaits_its_own_author(
    client: AsyncClient,
    active_task: Task,
    auth_headers: dict,
):
    """The behaviour the old type check bought, kept by the membership rule.

    A duel side is a ``solo`` praxis with one member (ADR-0011), so this is also
    the guard that #1980 left duels alone.
    """
    create = await client.post(
        "/praxes",
        json={"task_id": active_task.id, "type": "solo", "title": "Mine"},
        headers=auth_headers,
    )
    assert create.status_code in (200, 201), create.text

    requests = (
        await client.get(
            "/activity-feed", params={"filter": "requests", "limit": 100},
            headers=auth_headers,
        )
    ).json()
    assert not [i for i in requests["items"] if i["type"] == "awaiting_submission"]


# ---------------------------------------------------------------------------
# The type axis and the cursor, at the HTTP seam (#1420 part 2)
#
# These exercise the *wire* deliberately: `types` is a repeated bare key, which
# is the one shape a naive client serialiser gets wrong (`types[]=a`) and the
# one shape FastAPI reads as nothing at all — 200, unfiltered list, green CI.
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_types_intersects_with_the_filter_rather_than_replacing_it(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
):
    """``filter=friends&types=friend_signup`` is friend signups only."""
    from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
    from models.relationship import Relationship, RelationshipStatus, RelationshipType

    db_session.add(
        Relationship(
            from_character_id=character.id,
            to_character_id=character2.id,
            type=RelationshipType.friend,
            status=RelationshipStatus.active,
        )
    )
    # friend_completion: the friend submitted something of their own.
    db_session.add(
        Praxis(
            task_id=active_task.id,
            created_by_id=character2.id,
            type=PraxisType.solo,
            status=PraxisStatus.submitted,
            title="Friend did it",
            body_text="proof",
        )
    )
    # friend_signup: both of them are on the same in-progress task.
    mine = Praxis(
        task_id=active_task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        status=PraxisStatus.in_progress,
        title="Mine",
        body_text="proof",
    )
    theirs = Praxis(
        task_id=active_task.id,
        created_by_id=character2.id,
        type=PraxisType.solo,
        status=PraxisStatus.in_progress,
        title="Theirs",
        body_text="proof",
    )
    db_session.add_all([mine, theirs])
    await db_session.flush()
    db_session.add_all(
        [
            PraxisMember(praxis_id=mine.id, character_id=character.id),
            PraxisMember(praxis_id=theirs.id, character_id=character2.id),
        ]
    )
    await db_session.commit()

    unfiltered = await client.get(
        "/activity-feed",
        params={"filter": "friends", "limit": 100},
        headers=auth_headers,
    )
    assert {i["type"] for i in unfiltered.json()["items"]} == {
        "friend_completion",
        "friend_signup",
    }

    narrowed = await client.get(
        "/activity-feed",
        params={"filter": "friends", "limit": 100, "types": ["friend_signup"]},
        headers=auth_headers,
    )
    assert narrowed.status_code == 200, narrowed.text
    assert [i["type"] for i in narrowed.json()["items"]] == ["friend_signup"]

    # A type outside the rail is an intersection, not a replacement: the rail
    # still wins, so this is empty rather than "every vote on your praxis".
    outside = await client.get(
        "/activity-feed",
        params={"filter": "friends", "limit": 100, "types": ["vote_on_mine"]},
        headers=auth_headers,
    )
    assert outside.json()["items"] == []


@pytest.mark.asyncio
async def test_types_accepts_more_than_one_value(
    client: AsyncClient, character: Character, active_task: Task, auth_headers: dict
):
    """A repeated bare key, which is the only spelling this endpoint reads.

    A client that sends ``types[]=a&types[]=b`` instead hands FastAPI a key it
    does not know, and the answer is a 200 with an *unfiltered* list — no error,
    no failing test, just the filter quietly gone. Asserted here so the endpoint
    owns the rule rather than any one client library remembering it.
    """
    response = await client.get(
        "/activity-feed",
        params={"limit": 100, "types": ["global_task", "era_announcement"]},
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    types = {item["type"] for item in response.json()["items"]}
    assert types == {"global_task", "era_announcement"}


@pytest.mark.asyncio
async def test_an_unknown_type_is_ignored_and_an_empty_list_filters_nothing(
    client: AsyncClient, character: Character, active_task: Task, auth_headers: dict
):
    """The feed is a read projection: a stale bookmark must not hard-fail, and
    an empty selection can never mean "match nothing"."""
    baseline = await client.get(
        "/activity-feed", params={"limit": 100}, headers=auth_headers
    )
    baseline_types = {item["type"] for item in baseline.json()["items"]}
    assert baseline_types, "the fixture must put something in the feed"

    for params in (
        {"limit": 100, "types": ["no_such_type"]},
        {"limit": 100, "types": []},
        {"limit": 100, "types": [""]},
    ):
        response = await client.get(
            "/activity-feed", params=params, headers=auth_headers
        )
        assert response.status_code == 200, (params, response.text)
        assert {
            item["type"] for item in response.json()["items"]
        } == baseline_types, params

    # A known value alongside an unknown one still filters on the known one.
    mixed = await client.get(
        "/activity-feed",
        params={"limit": 100, "types": ["no_such_type", "global_task"]},
        headers=auth_headers,
    )
    assert {item["type"] for item in mixed.json()["items"]} == {"global_task"}


@pytest.mark.asyncio
async def test_a_malformed_before_cursor_is_a_422_not_a_500(
    client: AsyncClient, character: Character, auth_headers: dict
):
    """``before`` is a client-supplied cursor, so it is a trust boundary."""
    response = await client.get(
        "/activity-feed", params={"before": "not-a-date"}, headers=auth_headers
    )
    assert response.status_code == 422, response.text

    good = await client.get(
        "/activity-feed",
        params={"before": "2999-01-01T00:00:00+00:00"},
        headers=auth_headers,
    )
    assert good.status_code == 200, good.text


@pytest.mark.asyncio
async def test_a_malformed_payload_is_dropped_and_its_siblings_still_serve(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    active_task: Task,
    auth_headers: dict,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
):
    """One drifted payload costs one card, never the page (#1402).

    The owner's fail-soft ruling in one test. The feed is a read projection over
    fifteen unrelated tables, so a producer whose shape has drifted must not be
    able to take the whole surface down with it — and "the feed still 200s" is
    only worth anything if the *other* items are still in it. Hence the two
    kinds of survivor asserted below: a second row from the SAME source, which
    proves the drop is per-item rather than per-source, and a row from a
    different source on the same tab.

    The drift simulated here is the one ``extra="forbid"`` exists to catch and
    the one a green test suite would otherwise wave through: somebody tucks an
    undeclared key into a payload for a card they are building. A missing field
    is caught by the field being required; an added one is caught by nothing
    else at all.
    """
    import logging
    from dataclasses import replace as replace_dataclass

    from models.task import TaskStatus

    import services.activity_feed as feed_service
    from schemas.activity_feed import GlobalTaskPayload

    # A second global_task row, so the dropped item has a same-source sibling.
    sibling_task = Task(
        title="Sibling Task",
        description="Survives the drop",
        point_value=5,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=DEFAULT_FACTION_SLUG,
    )
    db_session.add(sibling_task)
    await db_session.commit()
    await db_session.refresh(sibling_task)

    poisoned_task_id = active_task.id
    global_source = next(
        source
        for source in feed_service.FEED_SOURCES
        if source.item_type == feed_service.FEED_ITEM_TYPE_GLOBAL_TASK
    )
    healthy_to_item = global_source.to_item

    def drifted_to_item(row):
        """The global_task producer, drifted for exactly one row."""
        if row.id == poisoned_task_id:
            GlobalTaskPayload(
                task_id=row.id,
                task_title=row.title,
                task_point_value=row.point_value,
                task_level_required=row.level_required,
                task_faction_slug=row.primary_faction_slug,
                task_banner_url="/media/undeclared.png",
            )
        return healthy_to_item(row)

    monkeypatch.setattr(
        feed_service,
        "FEED_SOURCES",
        tuple(
            replace_dataclass(source, to_item=drifted_to_item)
            if source is global_source
            else source
            for source in feed_service.FEED_SOURCES
        ),
    )

    with caplog.at_level(logging.ERROR, logger="services.activity_feed"):
        response = await client.get(
            "/activity-feed", params={"filter": "global"}, headers=auth_headers
        )

    assert response.status_code == 200, response.text
    items = response.json()["items"]

    global_task_ids = [
        item["payload"]["task_id"] for item in items if item["type"] == "global_task"
    ]
    assert poisoned_task_id not in global_task_ids, "the malformed item was served"
    assert sibling_task.id in global_task_ids, "a same-source sibling was dropped too"
    assert any(item["type"] == "era_announcement" for item in items), (
        "a sibling from another source was dropped too"
    )

    # Logged loudly, and named well enough to find the row: item_key + the error.
    assert f"global_task:{poisoned_task_id}" in caplog.text
    assert "task_banner_url" in caplog.text


def test_every_registry_type_has_a_schema_variant():
    """The union's fifteen discriminator tags ARE the registry's fifteen types.

    ``Literal`` will not accept a variable, so the type strings are spelled
    twice: once as ``FEED_ITEM_TYPE_*`` in the service, which stays the registry
    authority, and once as a ``Literal`` in each schema variant. This is the
    seam that keeps them equal — a new feed type with no schema variant would
    otherwise serialise fine right up until the response model refused it, and a
    retired one would linger in the OpenAPI forever.
    """
    from typing import get_args

    from schemas.activity_feed import ActivityFeedItem
    from services.activity_feed import FEED_ITEM_TYPES

    variants = get_args(get_args(ActivityFeedItem)[0])
    tags = {get_args(variant.model_fields["type"].annotation)[0] for variant in variants}
    assert tags == set(FEED_ITEM_TYPES)


@pytest.mark.asyncio
async def test_friend_signup_carries_the_task_level(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    active_task: Task,
    auth_headers: dict,
):
    """The friend-signup card's level badge, at the HTTP seam (#1518).

    ``normalizeFeedItem`` has read ``p.task_level_required ?? null`` on this
    card since it was written while the producer never emitted the key, so the
    badge was permanently blank and the ``?? null`` kept anybody from noticing.
    Asserting the *value* is the point — that the number arrives from the task
    row rather than a schema default — hence the level below is not the
    fixture's 0.

    The presence assertion is not filler. Payload shapes are ``extra="forbid"``
    (#1402), so a key added to the builder but not to ``FriendSignupPayload``
    fails validation and the whole item is dropped from the feed rather than
    rendered without a badge.
    """
    from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
    from models.relationship import Relationship, RelationshipStatus, RelationshipType

    active_task.level_required = 3
    db_session.add(
        Relationship(
            from_character_id=character.id,
            to_character_id=character2.id,
            type=RelationshipType.friend,
            status=RelationshipStatus.active,
        )
    )
    mine = Praxis(
        task_id=active_task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        status=PraxisStatus.in_progress,
        title="Mine",
        body_text="proof",
    )
    theirs = Praxis(
        task_id=active_task.id,
        created_by_id=character2.id,
        type=PraxisType.solo,
        status=PraxisStatus.in_progress,
        title="Theirs",
        body_text="proof",
    )
    db_session.add_all([mine, theirs])
    await db_session.flush()
    db_session.add_all(
        [
            PraxisMember(praxis_id=mine.id, character_id=character.id),
            PraxisMember(praxis_id=theirs.id, character_id=character2.id),
        ]
    )
    await db_session.commit()

    response = await client.get(
        "/activity-feed",
        params={"filter": "friends", "limit": 100, "types": ["friend_signup"]},
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    items = [i for i in response.json()["items"] if i["type"] == "friend_signup"]
    assert len(items) == 1, f"the friend_signup item was dropped: {response.json()}"
    assert items[0]["payload"]["task_level_required"] == 3

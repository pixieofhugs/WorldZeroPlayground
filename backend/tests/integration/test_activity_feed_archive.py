"""Integration tests for feed item identity and the archive (#1193).

Everything here runs against the real feed service and the real routes — the
whole point of the issue is that item identity is *derived*, so a mocked feed
would prove nothing about it.

``full_feed`` seeds one item of all sixteen feed types for ``character``. It is
deliberately heavy: the acceptance criterion is "every one of the 16 types
yields a stable ``item_key``", and there is no way to check that without all
sixteen actually present.
"""
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode
from models.character import Character
from models.comment import Comment, CommentMention
from models.duel import Duel, DuelStatus
from models.era import Era
from models.faction_defection_history import FactionDefectionHistory
from models.feed_dismissal import FeedDismissal
from models.invitation_letter import InvitationLetter
from models.nudge import Nudge
from models.praxis import (
    ModerationStatus,
    Praxis,
    PraxisInvite,
    PraxisInviteStatus,
    PraxisMember,
    PraxisStatus,
    PraxisType,
)
from models.relationship import Relationship, RelationshipStatus, RelationshipType
from models.task import Task
from models.taunt_message import TauntMessage, TauntTriggerType
from services.activity_feed import (
    FEED_ITEM_TYPE_AWAITING_SUBMISSION,
    FEED_ITEM_TYPE_COLLAB_INVITE,
    FEED_ITEM_TYPE_COLLABORATOR_SUBMITTED,
    FEED_ITEM_TYPE_COMMENT_MENTION,
    FEED_ITEM_TYPE_DUEL_CHALLENGE,
    FEED_ITEM_TYPE_FOE_TAUNT,
    FEED_ITEM_TYPE_FRIEND_COMPLETION,
    FEED_ITEM_TYPE_FRIEND_SIGNUP,
    FEED_ITEM_TYPE_GLOBAL_TASK,
    FEED_ITEM_TYPE_INVITATION_LETTER,
    FEED_ITEM_TYPE_NUDGE,
    FEED_ITEM_TYPES,
    ITEM_KEY_SEPARATOR,
    REQUEST_ITEM_TYPES,
)
from tests.integration.factories import DEFAULT_FACTION_SLUG

ALL_FILTER = "all"
FRIENDS_FILTER = "friends"
FOES_FILTER = "foes"
YOUR_STUFF_FILTER = "your_stuff"
GLOBAL_FILTER = "global"
REQUESTS_FILTER = "requests"

# Item counts per tab for the ``full_feed`` seed, derived by hand from the
# registry's filter membership. Asserting the numbers (not just "non-empty")
# is what makes "the counts drop" a real check.
#
# ADR-0070: the four request types are in the registry under ALL and YOUR_STUFF
# but leave the *live* stream, so those two tabs read four short of their
# registry membership. Archived is unaffected — see
# ``test_archived_still_shows_the_requests_the_stream_hides``.
SEEDED_ITEM_COUNTS = {
    ALL_FILTER: 12,
    FRIENDS_FILTER: 3,
    FOES_FILTER: 2,
    YOUR_STUFF_FILTER: 5,
    GLOBAL_FILTER: 2,
    REQUESTS_FILTER: 4,
}

# Which key in ``counts`` carries which tab's badge — ``global`` is the one the
# schema had to rename (``global_count``) around the Python keyword.
COUNT_KEYS = {
    ALL_FILTER: "all",
    FRIENDS_FILTER: "friends",
    FOES_FILTER: "foes",
    YOUR_STUFF_FILTER: "your_stuff",
    GLOBAL_FILTER: "global_count",
    REQUESTS_FILTER: "requests",
}


@pytest_asyncio.fixture
async def full_feed(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    character3: Character,
    era: Era,
    active_task: Task,
    some_faction,
) -> dict:
    """Seed exactly one feed item of every one of the 16 types for ``character``.

    Returns a handful of the seeded rows the tests need to assert against.
    """
    now = datetime.now(timezone.utc)

    # character2 is a friend, character3 a foe — this is what makes the
    # friend_* / foe_* sources contribute at all.
    db_session.add_all(
        [
            Relationship(
                from_character_id=character.id,
                to_character_id=character2.id,
                type=RelationshipType.friend,
                status=RelationshipStatus.active,
            ),
            Relationship(
                from_character_id=character.id,
                to_character_id=character3.id,
                type=RelationshipType.foe,
                status=RelationshipStatus.active,
            ),
        ]
    )

    # --- vote_on_mine + comment_mention: the viewer's own submitted praxis ---
    my_praxis = Praxis(
        task_id=active_task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        status=PraxisStatus.submitted,
        title="Mine",
        body_text="proof",
    )
    db_session.add(my_praxis)
    await db_session.flush()
    db_session.add(PraxisMember(praxis_id=my_praxis.id, character_id=character.id))
    from models.vote import Vote

    db_session.add(
        Vote(
            praxis_id=my_praxis.id,
            voter_character_id=character2.id,
            voter_account_id=character2.account_id,
            value=3,
        )
    )

    # --- vote_changed_on_mine: a SECOND voter who went back and re-rated -----
    # It has to be a second account: one vote per account per praxis
    # (``uq_vote_praxis_account``). Seeded by actually re-rating the row rather
    # than by hand-setting a timestamp, because ``updated_at > created_at`` is
    # the whole predicate the source partitions on (#1712) — writing the two
    # columns directly would seed the assertion instead of the behaviour.
    changed_vote = Vote(
        praxis_id=my_praxis.id,
        voter_character_id=character3.id,
        voter_account_id=character3.account_id,
        value=2,
    )
    db_session.add(changed_vote)
    await db_session.flush()
    changed_vote.value = 4
    await db_session.flush()
    mention_comment = Comment(
        praxis_id=my_praxis.id,
        created_by_id=character2.id,
        body_text="Look at this, @testcharacter",
        moderation_status=ModerationStatus.visible,
    )
    db_session.add(mention_comment)
    await db_session.flush()
    db_session.add(
        CommentMention(
            comment_id=mention_comment.id, mentioned_character_id=character.id
        )
    )

    # --- friend_completion / foe_completion ---------------------------------
    db_session.add_all(
        [
            Praxis(
                task_id=active_task.id,
                created_by_id=character2.id,
                type=PraxisType.solo,
                status=PraxisStatus.submitted,
                title="Friend did it",
                body_text="proof",
            ),
            Praxis(
                task_id=active_task.id,
                created_by_id=character3.id,
                type=PraxisType.solo,
                status=PraxisStatus.submitted,
                title="Foe did it",
                body_text="proof",
            ),
        ]
    )

    # --- foe_taunt ----------------------------------------------------------
    db_session.add(
        TauntMessage(
            from_character_id=character3.id,
            to_character_id=character.id,
            faction_slug=DEFAULT_FACTION_SLUG,
            trigger_type=TauntTriggerType.score_overtake,
        )
    )

    # --- the collab praxis: four types come off this one row -----------------
    # collab_invite (the invite), awaiting_submission (viewer's unfiled member
    # row), collaborator_submitted + friend_signup (character2's member row —
    # ONE praxis_member PK feeding two feed types, which is exactly why the key
    # carries a type prefix).
    collab_praxis = Praxis(
        task_id=active_task.id,
        created_by_id=character2.id,
        type=PraxisType.collab,
        status=PraxisStatus.in_progress,
        title="Team",
        body_text="proof",
    )
    db_session.add(collab_praxis)
    await db_session.flush()
    viewer_member = PraxisMember(
        praxis_id=collab_praxis.id, character_id=character.id, has_submitted=False
    )
    friend_member = PraxisMember(
        praxis_id=collab_praxis.id,
        character_id=character2.id,
        has_submitted=True,
        submitted_at=now,
    )
    collab_invite = PraxisInvite(
        praxis_id=collab_praxis.id,
        inviter_id=character2.id,
        invitee_id=character.id,
        status=PraxisInviteStatus.pending,
    )
    db_session.add_all([viewer_member, friend_member, collab_invite])

    # --- nudge --------------------------------------------------------------
    db_session.add(
        Nudge(
            from_character_id=character2.id,
            to_character_id=character.id,
            praxis_id=collab_praxis.id,
        )
    )

    # --- duel_challenge -----------------------------------------------------
    challenger_praxis = Praxis(
        task_id=active_task.id,
        created_by_id=character2.id,
        type=PraxisType.solo,
        status=PraxisStatus.in_progress,
        title="Fight me",
        body_text="proof",
    )
    db_session.add(challenger_praxis)
    await db_session.flush()
    duel = Duel(
        task_id=active_task.id,
        challenger_praxis_id=challenger_praxis.id,
        opponent_character_id=character.id,
        status=DuelStatus.pending,
    )
    db_session.add(duel)

    # --- invitation_letter + friend_defection --------------------------------
    # The letter is for a faction the viewer is NOT in (they are `ua`), so it is
    # unanswered per ADR-0070 and belongs in the queue. The already-joined case
    # gets its own test.
    letter = InvitationLetter(
        character_id=character.id, faction_slug="ephemerists", era_id=era.id
    )
    db_session.add_all(
        [
            letter,
            FactionDefectionHistory(
                character_id=character2.id, faction_slug="na", era_id=era.id
            ),
        ]
    )

    # global_task (active_task) and era_announcement (era) need no seeding.
    await db_session.commit()

    return {
        "collab_invite_id": collab_invite.id,
        "collab_praxis_id": collab_praxis.id,
        "viewer_member_id": viewer_member.id,
        "friend_member_id": friend_member.id,
        "duel_id": duel.id,
        "task_id": active_task.id,
        "letter_id": letter.id,
    }


async def _feed(
    client: AsyncClient,
    auth_headers: dict,
    feed_filter: str = ALL_FILTER,
    archived: bool = False,
) -> dict:
    params: dict = {"filter": feed_filter, "limit": 100}
    if archived:
        params["archived"] = "true"
    response = await client.get("/activity-feed", params=params, headers=auth_headers)
    assert response.status_code == 200, response.text
    return response.json()


def _observed_type_counts(feed: dict) -> dict[str, int]:
    """How many items of each type this response actually returned."""
    observed: dict[str, int] = {}
    for item in feed["items"]:
        observed[item["type"]] = observed.get(item["type"], 0) + 1
    return observed


def _published_type_counts(feed: dict) -> dict[str, int]:
    """The non-zero half of ``counts.by_type``.

    ``by_type`` publishes every type the current view *could* show, so it
    carries zeros for the facet rows the frontend hides (epic #1419 decision
    20). Dropping them is what makes it comparable with the item list.
    """
    return {
        item_type: count
        for item_type, count in feed["counts"]["by_type"].items()
        if count
    }


def _key_of(feed: dict, item_type: str) -> str:
    matches = [item["item_key"] for item in feed["items"] if item["type"] == item_type]
    assert len(matches) == 1, f"expected exactly one {item_type}: {matches}"
    return matches[0]


# ---------------------------------------------------------------------------
# 1. Identity
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_every_feed_type_yields_a_stable_item_key(
    client: AsyncClient, full_feed: dict, auth_headers: dict
):
    """All 16 types are present, keyed, and identical across two requests.

    ADR-0070 split the live surface in two: the twelve news types live in the
    stream, the four request types live in the queue. Between them the registry
    is still fully covered.
    """
    first = await _feed(client, auth_headers)
    second = await _feed(client, auth_headers)
    queue = await _feed(client, auth_headers, REQUESTS_FILTER)

    stream_types = {item["type"] for item in first["items"]}
    queue_types = {item["type"] for item in queue["items"]}
    assert stream_types | queue_types == FEED_ITEM_TYPES
    assert stream_types.isdisjoint(queue_types)
    assert len(first["items"]) == SEEDED_ITEM_COUNTS[ALL_FILTER]
    assert len(queue["items"]) == SEEDED_ITEM_COUNTS[REQUESTS_FILTER]

    first_keys = [item["item_key"] for item in first["items"]]
    second_keys = [item["item_key"] for item in second["items"]]
    # Same keys, same order — nothing about identity is derived from position.
    assert first_keys == second_keys
    assert len(set(first_keys)) == len(first_keys), "item keys must be unique"

    for item in first["items"]:
        item_type, separator, raw_id = item["item_key"].partition(ITEM_KEY_SEPARATOR)
        assert separator, item["item_key"]
        assert item_type == item["type"]
        assert int(raw_id) > 0, item["item_key"]


@pytest.mark.asyncio
async def test_one_source_row_two_types_get_distinct_keys(
    client: AsyncClient, full_feed: dict, auth_headers: dict
):
    """The type prefix is load-bearing, not decoration.

    ``friend_signup`` and ``collaborator_submitted`` are both built from the
    *same* ``praxis_member`` row. Without the type prefix they would share a key
    and archiving one would silently archive the other.
    """
    feed = await _feed(client, auth_headers)
    signup_key = _key_of(feed, FEED_ITEM_TYPE_FRIEND_SIGNUP)
    submitted_key = _key_of(feed, FEED_ITEM_TYPE_COLLABORATOR_SUBMITTED)

    member_id = str(full_feed["friend_member_id"])
    assert signup_key.endswith(ITEM_KEY_SEPARATOR + member_id)
    assert submitted_key.endswith(ITEM_KEY_SEPARATOR + member_id)
    assert signup_key != submitted_key


# ---------------------------------------------------------------------------
# 2. Dismiss / restore
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_dismiss_removes_the_item_and_drops_the_counts(
    client: AsyncClient, full_feed: dict, auth_headers: dict
):
    before = await _feed(client, auth_headers)
    target = _key_of(before, FEED_ITEM_TYPE_FRIEND_COMPLETION)

    response = await client.post(
        "/activity-feed/dismiss", json={"item_key": target}, headers=auth_headers
    )
    assert response.status_code == 200, response.text
    assert response.json() == {"item_key": target, "archived": True, "changed": True}

    after = await _feed(client, auth_headers)
    assert target not in [item["item_key"] for item in after["items"]]
    assert after["counts"]["all"] == before["counts"]["all"] - 1
    # The badge is computed on a separate path (_sum_counts_for_tab) — an
    # archive that doesn't move the numbers is a bug.
    assert after["counts"]["friends"] == before["counts"]["friends"] - 1
    assert after["counts"]["foes"] == before["counts"]["foes"]

    friends = await _feed(client, auth_headers, FRIENDS_FILTER)
    assert len(friends["items"]) == SEEDED_ITEM_COUNTS[FRIENDS_FILTER] - 1
    assert friends["counts"]["friends"] == len(friends["items"])


@pytest.mark.asyncio
async def test_restore_puts_the_item_back_in_its_original_position(
    client: AsyncClient, full_feed: dict, auth_headers: dict
):
    before = await _feed(client, auth_headers)
    original_order = [item["item_key"] for item in before["items"]]
    target = _key_of(before, FEED_ITEM_TYPE_COLLABORATOR_SUBMITTED)

    await client.post(
        "/activity-feed/dismiss", json={"item_key": target}, headers=auth_headers
    )
    response = await client.post(
        "/activity-feed/restore", json={"item_key": target}, headers=auth_headers
    )
    assert response.status_code == 200, response.text
    assert response.json() == {"item_key": target, "archived": False, "changed": True}

    after = await _feed(client, auth_headers)
    assert [item["item_key"] for item in after["items"]] == original_order
    assert after["counts"] == before["counts"]


@pytest.mark.asyncio
async def test_dismiss_and_restore_are_idempotent(
    client: AsyncClient, full_feed: dict, auth_headers: dict
):
    """The undo strip can fire twice; neither call is an error."""
    feed = await _feed(client, auth_headers)
    target = _key_of(feed, FEED_ITEM_TYPE_GLOBAL_TASK)

    first = await client.post(
        "/activity-feed/dismiss", json={"item_key": target}, headers=auth_headers
    )
    second = await client.post(
        "/activity-feed/dismiss", json={"item_key": target}, headers=auth_headers
    )
    assert first.json()["changed"] is True
    assert second.status_code == 200
    assert second.json()["changed"] is False

    await client.post(
        "/activity-feed/restore", json={"item_key": target}, headers=auth_headers
    )
    again = await client.post(
        "/activity-feed/restore", json={"item_key": target}, headers=auth_headers
    )
    assert again.status_code == 200
    assert again.json()["changed"] is False


@pytest.mark.asyncio
async def test_the_archive_is_per_character(
    client: AsyncClient,
    full_feed: dict,
    auth_headers: dict,
    auth_headers2: dict,
):
    """One player archiving a global event cannot hide it from anyone else."""
    feed = await _feed(client, auth_headers)
    target = _key_of(feed, FEED_ITEM_TYPE_GLOBAL_TASK)
    await client.post(
        "/activity-feed/dismiss", json={"item_key": target}, headers=auth_headers
    )

    other = await _feed(client, auth_headers2, "global")
    assert target in [item["item_key"] for item in other["items"]]


@pytest.mark.asyncio
async def test_a_mention_is_archivable_like_any_other_event(
    client: AsyncClient, full_feed: dict, auth_headers: dict
):
    """``comment_mention`` is an EVENT, not a standing obligation (#1196).

    Someone said your name; there is nothing to answer and nothing clears itself,
    so it takes the general archive rule. ``awaiting_submission`` is the sole
    exemption, and this pins that the mention had not quietly joined it during the
    long stretch when its card rendered as nothing and nobody could have noticed.
    """
    before = await _feed(client, auth_headers)
    target = _key_of(before, FEED_ITEM_TYPE_COMMENT_MENTION)

    response = await client.post(
        "/activity-feed/dismiss", json={"item_key": target}, headers=auth_headers
    )
    assert response.status_code == 200, response.text
    assert response.json() == {"item_key": target, "archived": True, "changed": True}

    after = await _feed(client, auth_headers)
    assert target not in [item["item_key"] for item in after["items"]]
    archived = await _feed(client, auth_headers, ALL_FILTER, archived=True)
    assert target in [item["item_key"] for item in archived["items"]]


# ---------------------------------------------------------------------------
# 3. awaiting_submission is not archivable
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_dismissing_awaiting_submission_is_rejected(
    client: AsyncClient, full_feed: dict, auth_headers: dict
):
    """It is state, not an event: archiving it would silence a standing
    obligation forever. It clears itself the moment the player files."""
    requests_feed = await _feed(client, auth_headers, REQUESTS_FILTER)
    target = _key_of(requests_feed, FEED_ITEM_TYPE_AWAITING_SUBMISSION)

    response = await client.post(
        "/activity-feed/dismiss", json={"item_key": target}, headers=auth_headers
    )
    assert response.status_code == 400, response.text
    detail = response.json()["detail"]
    assert detail["code"] == ErrorCode.feed_item_not_archivable.value
    assert "cannot be archived" in detail["message"]

    still_there = await _feed(client, auth_headers, REQUESTS_FILTER)
    assert target in [item["item_key"] for item in still_there["items"]]


@pytest.mark.parametrize(
    "item_key, expected_code",
    [
        ("no_such_type:1", ErrorCode.feed_item_key_unknown),
        ("no-separator", ErrorCode.feed_item_key_unknown),
        (f"{FEED_ITEM_TYPE_NUDGE}{ITEM_KEY_SEPARATOR}not-a-number",
         ErrorCode.feed_item_key_malformed),
    ],
)
@pytest.mark.asyncio
async def test_bad_item_keys_are_told_apart_by_code(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    item_key: str,
    expected_code: ErrorCode,
):
    """Three 400s on one route — an unknown type, a key with no separator, and a
    non-integer id. Before #1652 only the English sentence told them apart."""
    response = await client.post(
        "/activity-feed/dismiss", json={"item_key": item_key}, headers=auth_headers
    )
    assert response.status_code == 400, response.text
    assert response.json()["detail"]["code"] == expected_code.value


@pytest.mark.asyncio
async def test_dismiss_all_skips_awaiting_submission(
    client: AsyncClient, full_feed: dict, auth_headers: dict
):
    """A bulk archive must not 400 because one unarchivable row is on screen —
    and must not archive it either."""
    response = await client.post(
        "/activity-feed/dismiss-all",
        json={"filter": REQUESTS_FILTER},
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    # collab_invite + duel_challenge + invitation_letter archived;
    # awaiting_submission left alone.
    assert response.json() == {"count": 3, "archived": True}

    after = await _feed(client, auth_headers, REQUESTS_FILTER)
    assert [item["type"] for item in after["items"]] == [
        FEED_ITEM_TYPE_AWAITING_SUBMISSION
    ]
    assert after["counts"]["requests"] == 1


@pytest.mark.asyncio
async def test_unknown_and_malformed_keys_are_rejected(
    client: AsyncClient, character: Character, auth_headers: dict
):
    for bad_key in ("", "nonsense", "vote_on_mine", "no_such_type:1", "nudge:abc"):
        response = await client.post(
            "/activity-feed/dismiss", json={"item_key": bad_key}, headers=auth_headers
        )
        assert response.status_code == 400, f"{bad_key} -> {response.status_code}"


# ---------------------------------------------------------------------------
# 4. Archiving never answers anything
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_archiving_a_collab_invite_leaves_it_pending(
    client: AsyncClient,
    db_session: AsyncSession,
    full_feed: dict,
    auth_headers: dict,
):
    """ADR-0070: the archive is a view state, never a decision. The invite is
    still open and still unanswered — F2 tags it 'still waiting'."""
    feed = await _feed(client, auth_headers, REQUESTS_FILTER)
    target = _key_of(feed, FEED_ITEM_TYPE_COLLAB_INVITE)

    response = await client.post(
        "/activity-feed/dismiss", json={"item_key": target}, headers=auth_headers
    )
    assert response.status_code == 200

    invite = (
        await db_session.execute(
            select(PraxisInvite).where(PraxisInvite.id == full_feed["collab_invite_id"])
        )
    ).scalar_one()
    assert invite.status == PraxisInviteStatus.pending

    # ...and it is still answerable: the invite id in the archived item's key is
    # the one the respond endpoint takes.
    assert target.endswith(ITEM_KEY_SEPARATOR + str(invite.id))


# ---------------------------------------------------------------------------
# 5. Bulk + the archived view
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_dismiss_all_scopes_to_the_current_filter(
    client: AsyncClient, full_feed: dict, auth_headers: dict
):
    response = await client.post(
        "/activity-feed/dismiss-all",
        json={"filter": FRIENDS_FILTER},
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    assert response.json()["count"] == SEEDED_ITEM_COUNTS[FRIENDS_FILTER]

    friends = await _feed(client, auth_headers, FRIENDS_FILTER)
    assert friends["items"] == []
    assert friends["counts"]["friends"] == 0

    # Other filters keep whatever they didn't share with `friends`.
    foes = await _feed(client, auth_headers, FOES_FILTER)
    assert len(foes["items"]) == SEEDED_ITEM_COUNTS[FOES_FILTER]

    everything = await _feed(client, auth_headers)
    assert len(everything["items"]) == (
        SEEDED_ITEM_COUNTS[ALL_FILTER] - SEEDED_ITEM_COUNTS[FRIENDS_FILTER]
    )


@pytest.mark.asyncio
async def test_archived_view_ignores_the_type_slicing(
    client: AsyncClient, full_feed: dict, auth_headers: dict
):
    """The Archived tab returns everything archived, whatever tab it came from —
    a player looking for something they put away should not have to remember
    which tab they put it away from."""
    await client.post(
        "/activity-feed/dismiss-all",
        json={"filter": FRIENDS_FILTER},
        headers=auth_headers,
    )
    await client.post(
        "/activity-feed/dismiss-all",
        json={"filter": FOES_FILTER},
        headers=auth_headers,
    )

    # Asking with a `friends` filter still returns the foes items too.
    archived = await _feed(client, auth_headers, FRIENDS_FILTER, archived=True)
    archived_types = {item["type"] for item in archived["items"]}
    assert len(archived["items"]) == (
        SEEDED_ITEM_COUNTS[FRIENDS_FILTER] + SEEDED_ITEM_COUNTS[FOES_FILTER]
    )
    assert "foe_taunt" in archived_types
    assert FEED_ITEM_TYPE_FRIEND_COMPLETION in archived_types

    # The badges keep counting the live feed while the archive is on screen.
    assert archived["counts"]["friends"] == 0
    assert archived["counts"]["all"] == (
        SEEDED_ITEM_COUNTS[ALL_FILTER]
        - SEEDED_ITEM_COUNTS[FRIENDS_FILTER]
        - SEEDED_ITEM_COUNTS[FOES_FILTER]
    )

    # An empty archive is an empty list, not an error.
    await client.post("/activity-feed/restore-all", json={}, headers=auth_headers)
    assert (await _feed(client, auth_headers, ALL_FILTER, archived=True))["items"] == []


@pytest.mark.asyncio
async def test_restore_all_empties_the_archive(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    full_feed: dict,
    auth_headers: dict,
):
    before = await _feed(client, auth_headers)

    dismissed = await client.post(
        "/activity-feed/dismiss-all", json={}, headers=auth_headers
    )
    # Everything the ALL stream shows. The one unarchivable type
    # (``awaiting_submission``) is no longer in that stream at all — ADR-0070
    # moved it to the queue, and bulk archive is scoped to the active filter.
    assert dismissed.json()["count"] == SEEDED_ITEM_COUNTS[ALL_FILTER]

    emptied = await client.post(
        "/activity-feed/restore-all", json={}, headers=auth_headers
    )
    assert emptied.status_code == 200, emptied.text
    assert emptied.json() == {
        "count": SEEDED_ITEM_COUNTS[ALL_FILTER],
        "archived": False,
    }

    after = await _feed(client, auth_headers)
    assert [item["item_key"] for item in after["items"]] == [
        item["item_key"] for item in before["items"]
    ]
    remaining = (
        await db_session.execute(
            select(FeedDismissal).where(FeedDismissal.character_id == character.id)
        )
    ).scalars().all()
    assert remaining == []


@pytest.mark.asyncio
async def test_restore_all_can_be_scoped_to_one_filter(
    client: AsyncClient, full_feed: dict, auth_headers: dict
):
    await client.post("/activity-feed/dismiss-all", json={}, headers=auth_headers)

    restored = await client.post(
        "/activity-feed/restore-all",
        json={"filter": FOES_FILTER},
        headers=auth_headers,
    )
    assert restored.json()["count"] == SEEDED_ITEM_COUNTS[FOES_FILTER]

    foes = await _feed(client, auth_headers, FOES_FILTER)
    assert len(foes["items"]) == SEEDED_ITEM_COUNTS[FOES_FILTER]

    friends = await _feed(client, auth_headers, FRIENDS_FILTER)
    assert friends["items"] == []


# ---------------------------------------------------------------------------
# 6. Stale rows leave the LIVE feed — read-time only, never a write (#1301)
#
# Two halves of one rule: a feed item is derived from a source row, so "this
# stopped being relevant" is a property of that row and belongs in the source's
# WHERE. Nothing here writes `feed_dismissal` — ADR-0070 keeps the archive
# player-owned, and every assertion below holds with an empty archive.
# ---------------------------------------------------------------------------

async def _resolve_the_requests(db_session: AsyncSession, full_feed: dict) -> None:
    """Answer both requests: the invite accepted, the challenge accepted."""
    await db_session.execute(
        update(PraxisInvite)
        .where(PraxisInvite.id == full_feed["collab_invite_id"])
        .values(status=PraxisInviteStatus.accepted)
    )
    await db_session.execute(
        update(Duel)
        .where(Duel.id == full_feed["duel_id"])
        .values(status=DuelStatus.active)
    )
    await db_session.commit()


@pytest.mark.asyncio
async def test_a_nudge_retires_when_the_recipient_files(
    client: AsyncClient,
    db_session: AsyncSession,
    full_feed: dict,
    auth_headers: dict,
):
    """The nudge dies with the obligation it names, not with the praxis.

    The collab stays `in_progress` for everyone else — the collab case is
    exactly where the praxis status alone is not enough, so the predicate has to
    read the viewer's own member row the way `awaiting_submission` does.
    """
    before = await _feed(client, auth_headers)
    assert FEED_ITEM_TYPE_NUDGE in {item["type"] for item in before["items"]}

    await db_session.execute(
        update(PraxisMember)
        .where(PraxisMember.id == full_feed["viewer_member_id"])
        .values(has_submitted=True, submitted_at=datetime.now(timezone.utc))
    )
    await db_session.commit()

    praxis = (
        await db_session.execute(
            select(Praxis).where(Praxis.id == full_feed["collab_praxis_id"])
        )
    ).scalar_one()
    assert praxis.status == PraxisStatus.in_progress

    after = await _feed(client, auth_headers)
    types = [item["type"] for item in after["items"]]
    assert FEED_ITEM_TYPE_NUDGE not in types
    # The obligation itself clears out of the queue (its only live home now).
    queue = await _feed(client, auth_headers, REQUESTS_FILTER)
    assert FEED_ITEM_TYPE_AWAITING_SUBMISSION not in {
        item["type"] for item in queue["items"]
    }
    # The badge is a separate path; a stale nudge inflates a number too.
    assert after["counts"]["all"] == before["counts"]["all"] - 1
    assert after["counts"]["your_stuff"] == before["counts"]["your_stuff"] - 1
    assert after["counts"]["requests"] == before["counts"]["requests"] - 1


@pytest.mark.asyncio
async def test_a_nudge_retires_when_the_praxis_is_published(
    client: AsyncClient,
    db_session: AsyncSession,
    full_feed: dict,
    auth_headers: dict,
):
    """The other half of the predicate, isolated.

    The viewer's member row is still unfiled here, so only the praxis status can
    retire this one — a published collab owes nobody anything, whatever its
    member rows say.
    """
    await db_session.execute(
        update(Praxis)
        .where(Praxis.id == full_feed["collab_praxis_id"])
        .values(status=PraxisStatus.submitted)
    )
    await db_session.commit()

    after = await _feed(client, auth_headers)
    assert FEED_ITEM_TYPE_NUDGE not in {item["type"] for item in after["items"]}


@pytest.mark.asyncio
async def test_a_resolved_request_leaves_every_live_tab(
    client: AsyncClient,
    db_session: AsyncSession,
    full_feed: dict,
    auth_headers: dict,
):
    """`unanswered_requests_only` is a live-feed axis, not a per-tab one.

    Knowingly: the duel challenge moves with the invite — one flag governs both
    queries, and a resolved challenge is as stale as a resolved invite.
    """
    await _resolve_the_requests(db_session, full_feed)

    for tab in (ALL_FILTER, YOUR_STUFF_FILTER, REQUESTS_FILTER):
        feed = await _feed(client, auth_headers, tab)
        types = [item["type"] for item in feed["items"]]
        assert FEED_ITEM_TYPE_COLLAB_INVITE not in types, tab
        assert FEED_ITEM_TYPE_DUEL_CHALLENGE not in types, tab


@pytest.mark.asyncio
async def test_badge_counts_match_the_list_on_every_tab(
    client: AsyncClient,
    db_session: AsyncSession,
    full_feed: dict,
    auth_headers: dict,
):
    """The trap: items and counts were built from different predicates.

    Once the live feed is pending-only, a badge reading 5 over a list of 3 is
    the failure mode. Checked on every tab, with two resolved requests present.
    """
    await _resolve_the_requests(db_session, full_feed)

    for tab, count_key in COUNT_KEYS.items():
        feed = await _feed(client, auth_headers, tab)
        assert feed["counts"][count_key] == len(feed["items"]), tab

    # ...and the six tab badges keep describing the LIVE feed from inside the
    # archive. ``by_type`` deliberately does NOT — it describes the list it sits
    # above, which on this tab is the archive (issue #1420 part 1).
    live = await _feed(client, auth_headers)
    archived = await _feed(client, auth_headers, ALL_FILTER, archived=True)
    for badge in COUNT_KEYS.values():
        assert archived["counts"][badge] == live["counts"][badge], badge


@pytest.mark.asyncio
async def test_an_archived_request_stays_archived_after_it_is_answered(
    client: AsyncClient,
    db_session: AsyncSession,
    full_feed: dict,
    auth_headers: dict,
):
    """The stranding guard: the Archived tab keeps showing every status.

    A player archives a pending invite, then answers it elsewhere. Nothing else
    lists it, so the archive must not window itself to pending.
    """
    before = await _feed(client, auth_headers, REQUESTS_FILTER)
    invite_key = _key_of(before, FEED_ITEM_TYPE_COLLAB_INVITE)
    duel_key = _key_of(before, FEED_ITEM_TYPE_DUEL_CHALLENGE)
    for key in (invite_key, duel_key):
        response = await client.post(
            "/activity-feed/dismiss", json={"item_key": key}, headers=auth_headers
        )
        assert response.status_code == 200, response.text

    await _resolve_the_requests(db_session, full_feed)

    archived = await _feed(client, auth_headers, ALL_FILTER, archived=True)
    archived_keys = [item["item_key"] for item in archived["items"]]
    assert invite_key in archived_keys
    assert duel_key in archived_keys


# ---------------------------------------------------------------------------
# 7. An unanswered obligation lives in the queue, never in the stream (ADR-0070)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_unanswered_requests_are_absent_from_the_live_stream(
    client: AsyncClient, full_feed: dict, auth_headers: dict
):
    """The four request types leave ``all`` and ``your_stuff`` for the queue.

    They are still registry members of both tabs — ``FEED_SOURCES`` is untouched
    — so this can only be the separate context axis ADR-0070 asks for.
    """
    for tab in (ALL_FILTER, YOUR_STUFF_FILTER):
        feed = await _feed(client, auth_headers, tab)
        types = {item["type"] for item in feed["items"]}
        assert types.isdisjoint(REQUEST_ITEM_TYPES), tab

    queue = await _feed(client, auth_headers, REQUESTS_FILTER)
    assert {item["type"] for item in queue["items"]} == REQUEST_ITEM_TYPES


@pytest.mark.asyncio
async def test_the_stream_badges_drop_with_the_stream(
    client: AsyncClient, full_feed: dict, auth_headers: dict
):
    """ADR-0070 consequence 2: ``all`` and ``your_stuff`` drop, ``requests``
    does not. The badges come off the identical windowed subquery (ADR-0036),
    so a badge still counting the requests would be the drift that rule exists
    to prevent."""
    feed = await _feed(client, auth_headers)
    assert feed["counts"]["all"] == SEEDED_ITEM_COUNTS[ALL_FILTER]
    assert feed["counts"]["your_stuff"] == SEEDED_ITEM_COUNTS[YOUR_STUFF_FILTER]
    # The queue's own badge is untouched — it is what the bell reads.
    assert feed["counts"]["requests"] == SEEDED_ITEM_COUNTS[REQUESTS_FILTER]


@pytest.mark.asyncio
async def test_bulk_archive_on_the_stream_cannot_sweep_up_an_obligation(
    client: AsyncClient, full_feed: dict, auth_headers: dict
):
    """ADR-0070 at its sharpest: you cannot answer forty obligations in one
    click, because "Archive all" on ``all`` no longer reaches them."""
    response = await client.post(
        "/activity-feed/dismiss-all", json={"filter": ALL_FILTER}, headers=auth_headers
    )
    assert response.status_code == 200, response.text
    assert response.json()["count"] == SEEDED_ITEM_COUNTS[ALL_FILTER]

    queue = await _feed(client, auth_headers, REQUESTS_FILTER)
    assert {item["type"] for item in queue["items"]} == REQUEST_ITEM_TYPES
    assert queue["counts"]["requests"] == SEEDED_ITEM_COUNTS[REQUESTS_FILTER]


@pytest.mark.asyncio
async def test_archived_still_shows_the_requests_the_stream_hides(
    client: AsyncClient, full_feed: dict, auth_headers: dict
):
    """The trap the ADR calls out: Archived reads ``filter=all``, so dropping the
    four types out of the ALL source-set would have taken them out of the
    archive too."""
    queue = await _feed(client, auth_headers, REQUESTS_FILTER)
    archived_keys = []
    for item_type in sorted(REQUEST_ITEM_TYPES - {FEED_ITEM_TYPE_AWAITING_SUBMISSION}):
        key = _key_of(queue, item_type)
        response = await client.post(
            "/activity-feed/dismiss", json={"item_key": key}, headers=auth_headers
        )
        assert response.status_code == 200, response.text
        archived_keys.append(key)

    archived = await _feed(client, auth_headers, ALL_FILTER, archived=True)
    listed = [item["item_key"] for item in archived["items"]]
    for key in archived_keys:
        assert key in listed


@pytest.mark.asyncio
async def test_a_letter_for_the_faction_you_already_joined_is_not_a_request(
    client: AsyncClient,
    db_session: AsyncSession,
    full_feed: dict,
    character: Character,
    auth_headers: dict,
    era: Era,
):
    """ADR-0070's awkward case. ``invitation_letter`` has no status column, so
    "answered" is read off the character: they are already in ``ua``, so a ``ua``
    letter asks them for nothing and must not sit in the queue."""
    db_session.add(
        InvitationLetter(
            character_id=character.id, faction_slug=character.faction_slug, era_id=era.id
        )
    )
    await db_session.commit()

    queue = await _feed(client, auth_headers, REQUESTS_FILTER)
    letters = [
        item
        for item in queue["items"]
        if item["type"] == FEED_ITEM_TYPE_INVITATION_LETTER
    ]
    assert [item["payload"]["faction_slug"] for item in letters] == ["ephemerists"]
    assert queue["counts"]["requests"] == SEEDED_ITEM_COUNTS[REQUESTS_FILTER]


# ---------------------------------------------------------------------------
# 8. Per-type facet counts (#1420 part 1)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_per_type_counts_match_the_items_on_every_rail(
    client: AsyncClient, full_feed: dict, auth_headers: dict
):
    """ADR-0036 for the facet: the published number is the list's own length."""
    for tab in COUNT_KEYS:
        feed = await _feed(client, auth_headers, tab)
        assert _published_type_counts(feed) == _observed_type_counts(feed), tab
        # ...and the tab badge is still the sum of them.
        assert feed["counts"][COUNT_KEYS[tab]] == sum(
            feed["counts"]["by_type"].values()
        ), tab


@pytest.mark.asyncio
async def test_selecting_one_type_does_not_shrink_the_other_types_counts(
    client: AsyncClient, full_feed: dict, auth_headers: dict
):
    """The classic facet trap, and the whole reason for epic #1419 decision 19.

    ``full_feed`` puts one item of eleven types in the live stream. If the type
    axis were applied to its own counts, ticking ``nudge`` would zero the other
    ten and the player would have no way back.
    """
    unfiltered = await _feed(client, auth_headers)
    assert len(unfiltered["counts"]["by_type"]) == SEEDED_ITEM_COUNTS[ALL_FILTER]

    response = await client.get(
        "/activity-feed",
        params={"filter": ALL_FILTER, "limit": 100, "types": [FEED_ITEM_TYPE_NUDGE]},
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    narrowed = response.json()

    assert [item["type"] for item in narrowed["items"]] == [FEED_ITEM_TYPE_NUDGE]
    assert narrowed["counts"]["by_type"] == unfiltered["counts"]["by_type"]
    assert narrowed["counts"]["all"] == unfiltered["counts"]["all"]


@pytest.mark.asyncio
async def test_per_type_counts_respect_the_rail_they_sit_under(
    client: AsyncClient, full_feed: dict, auth_headers: dict
):
    """The other half of decision 19: the type facet *does* respect the rail."""
    friends = await _feed(client, auth_headers, FRIENDS_FILTER)
    assert set(friends["counts"]["by_type"]) == {
        FEED_ITEM_TYPE_FRIEND_COMPLETION,
        FEED_ITEM_TYPE_FRIEND_SIGNUP,
        "friend_defection",
    }
    assert FEED_ITEM_TYPE_FOE_TAUNT not in friends["counts"]["by_type"]


@pytest.mark.asyncio
async def test_archived_facet_counts_describe_the_archive(
    client: AsyncClient, full_feed: dict, auth_headers: dict
):
    """A second 15-source fan-out, on this tab only (#1419 decision 21).

    The six tab badges keep describing the live feed — that is a sidebar number
    and it must stay truthful while the archive is on screen. But the facet
    counts sit directly above the archived list, and a count that disagrees with
    the list under it is exactly the drift ADR-0036 exists to prevent.
    """
    live = await _feed(client, auth_headers)
    await client.post(
        "/activity-feed/dismiss-all", json={"filter": FOES_FILTER}, headers=auth_headers
    )

    archived = await _feed(client, auth_headers, ALL_FILTER, archived=True)
    assert _published_type_counts(archived) == _observed_type_counts(archived)
    assert _published_type_counts(archived) == {FEED_ITEM_TYPE_FOE_TAUNT: 1,
                                                "foe_completion": 1}
    # The facet is emphatically NOT the live one it would have been.
    assert archived["counts"]["by_type"] != live["counts"]["by_type"]
    # ...while the six badges still are.
    assert archived["counts"]["foes"] == 0
    assert archived["counts"]["all"] == live["counts"]["all"] - 2

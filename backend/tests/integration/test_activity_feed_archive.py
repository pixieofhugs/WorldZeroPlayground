"""Integration tests for feed item identity and the archive (#1193).

Everything here runs against the real feed service and the real routes — the
whole point of the issue is that item identity is *derived*, so a mocked feed
would prove nothing about it.

``full_feed`` seeds one item of all fifteen feed types for ``character``. It is
deliberately heavy: the acceptance criterion is "every one of the 15 types
yields a stable ``item_key``", and there is no way to check that without all
fifteen actually present.
"""
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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
    FEED_ITEM_TYPE_FRIEND_COMPLETION,
    FEED_ITEM_TYPE_FRIEND_SIGNUP,
    FEED_ITEM_TYPE_GLOBAL_TASK,
    FEED_ITEM_TYPES,
    ITEM_KEY_SEPARATOR,
)

ALL_FILTER = "all"
FRIENDS_FILTER = "friends"
FOES_FILTER = "foes"
REQUESTS_FILTER = "requests"

# Item counts per tab for the ``full_feed`` seed, derived by hand from the
# registry's filter membership. Asserting the numbers (not just "non-empty")
# is what makes "the counts drop" a real check.
SEEDED_ITEM_COUNTS = {
    ALL_FILTER: 15,
    FRIENDS_FILTER: 3,
    FOES_FILTER: 2,
    "your_stuff": 8,
    "global": 2,
    REQUESTS_FILTER: 3,
}


@pytest_asyncio.fixture
async def full_feed(
    db_session: AsyncSession,
    character: Character,
    character2: Character,
    character3: Character,
    era: Era,
    active_task: Task,
) -> dict:
    """Seed exactly one feed item of every one of the 15 types for ``character``.

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
            faction_slug="ua",
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
    db_session.add(
        Duel(
            task_id=active_task.id,
            challenger_praxis_id=challenger_praxis.id,
            opponent_character_id=character.id,
            status=DuelStatus.pending,
        )
    )

    # --- invitation_letter + friend_defection --------------------------------
    db_session.add_all(
        [
            InvitationLetter(
                character_id=character.id, faction_slug="ua", era_id=era.id
            ),
            FactionDefectionHistory(
                character_id=character2.id, faction_slug="na", era_id=era.id
            ),
        ]
    )

    # global_task (active_task) and era_announcement (era) need no seeding.
    await db_session.commit()

    return {
        "collab_invite_id": collab_invite.id,
        "friend_member_id": friend_member.id,
        "task_id": active_task.id,
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
    """All 15 types are present, keyed, and identical across two requests."""
    first = await _feed(client, auth_headers)
    second = await _feed(client, auth_headers)

    assert {item["type"] for item in first["items"]} == FEED_ITEM_TYPES
    assert len(first["items"]) == SEEDED_ITEM_COUNTS[ALL_FILTER]

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
    assert "cannot be archived" in response.json()["detail"]

    still_there = await _feed(client, auth_headers, REQUESTS_FILTER)
    assert target in [item["item_key"] for item in still_there["items"]]


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
    # collab_invite + duel_challenge archived; awaiting_submission left alone.
    assert response.json() == {"count": 2, "archived": True}

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
    """ADR-0065: the archive is a view state, never a decision. The invite is
    still open and still unanswered — F2 tags it 'still waiting'."""
    feed = await _feed(client, auth_headers)
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
    # Everything except the one unarchivable type.
    assert dismissed.json()["count"] == SEEDED_ITEM_COUNTS[ALL_FILTER] - 1

    emptied = await client.post(
        "/activity-feed/restore-all", json={}, headers=auth_headers
    )
    assert emptied.status_code == 200, emptied.text
    assert emptied.json() == {
        "count": SEEDED_ITEM_COUNTS[ALL_FILTER] - 1,
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

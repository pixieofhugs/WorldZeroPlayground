"""Feed item identity and the archive (#1193), against the real feed service.

``full_feed`` seeds one item of each of the 17 types: every type must yield a
stable ``item_key``.
"""
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode
from faction_slugs import real_faction_slugs
from game_config import CURRENT_ERA
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

#: A live-era faction the shared fixtures do NOT seat characters in (#2708).
OTHER_FACTION_SLUG = next(
    slug
    for slug in real_faction_slugs(CURRENT_ERA)
    if slug != DEFAULT_FACTION_SLUG
)

ALL_FILTER = "all"
FRIENDS_FILTER = "friends"
FOES_FILTER = "foes"
YOUR_STUFF_FILTER = "your_stuff"
GLOBAL_FILTER = "global"
REQUESTS_FILTER = "requests"

# Per-tab counts for ``full_feed``, derived by hand from registry membership.
# ADR-0070: the four request types leave the live stream, so ALL and YOUR_STUFF
# read four short of their registry membership.
SEEDED_ITEM_COUNTS = {
    ALL_FILTER: 13,
    FRIENDS_FILTER: 3,
    FOES_FILTER: 2,
    YOUR_STUFF_FILTER: 6,
    GLOBAL_FILTER: 2,
    REQUESTS_FILTER: 4,
}

# ``global`` is renamed ``global_count`` around the Python keyword.
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
    """Seed one feed item of each of the 17 types for ``character``."""
    now = datetime.now(timezone.utc)

    # character2 friend, character3 foe: feeds the friend_*/foe_* sources.
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

    # --- vote_on_mine + comment_mention ---
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

    # --- vote_changed_on_mine ---
    # Needs a second account (``uq_vote_praxis_account``). Re-rate for real:
    # ``updated_at > created_at`` is the predicate under test (#1712).
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
    # --- comment_on_mine (#2159) ---
    # A comment that is also a mention is ONE row (the mention), so this needs its
    # own plain comment.
    db_session.add(
        Comment(
            praxis_id=my_praxis.id,
            created_by_id=character2.id,
            body_text="No handle in this one",
            moderation_status=ModerationStatus.visible,
        )
    )

    # --- friend_completion / foe_completion ---
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

    # --- foe_taunt ---
    db_session.add(
        TauntMessage(
            from_character_id=character3.id,
            to_character_id=character.id,
            faction_slug=DEFAULT_FACTION_SLUG,
            trigger_type=TauntTriggerType.score_overtake,
        )
    )

    # --- collab praxis: collab_invite, awaiting_submission, and character2's member
    # row feeding collaborator_submitted + friend_signup (why keys carry a type).
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

    # --- nudge ---
    db_session.add(
        Nudge(
            from_character_id=character2.id,
            to_character_id=character.id,
            praxis_id=collab_praxis.id,
        )
    )

    # --- duel_challenge ---
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

    # --- invitation_letter + friend_defection ---
    # Letter is for a faction the viewer is NOT in, so unanswered (ADR-0070).
    letter = InvitationLetter(
        character_id=character.id, faction_slug=OTHER_FACTION_SLUG, era_id=era.id
    )
    db_session.add_all(
        [
            letter,
            FactionDefectionHistory(
                character_id=character2.id, faction_slug="na", era_id=era.id
            ),
        ]
    )

    # global_task and era_announcement need no seeding.
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
    """Per-type item counts in this response."""
    observed: dict[str, int] = {}
    for item in feed["items"]:
        observed[item["type"]] = observed.get(item["type"], 0) + 1
    return observed


def _published_type_counts(feed: dict) -> dict[str, int]:
    """Non-zero ``counts.by_type``; it carries zeros for hidden facets (#1419)."""
    return {
        item_type: count
        for item_type, count in feed["counts"]["by_type"].items()
        if count
    }


def _key_of(feed: dict, item_type: str) -> str:
    matches = [item["item_key"] for item in feed["items"] if item["type"] == item_type]
    assert len(matches) == 1, f"expected exactly one {item_type}: {matches}"
    return matches[0]


# --- 1. Identity ---

@pytest.mark.asyncio
async def test_every_feed_type_yields_a_stable_item_key(
    client: AsyncClient, full_feed: dict, auth_headers: dict
):
    """All 17 types present, keyed, and stable across two requests (stream + queue)."""
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
    """``friend_signup`` and ``collaborator_submitted`` share a ``praxis_member`` row;
    only the type prefix keeps their keys apart.
    """
    feed = await _feed(client, auth_headers)
    signup_key = _key_of(feed, FEED_ITEM_TYPE_FRIEND_SIGNUP)
    submitted_key = _key_of(feed, FEED_ITEM_TYPE_COLLABORATOR_SUBMITTED)

    member_id = str(full_feed["friend_member_id"])
    assert signup_key.endswith(ITEM_KEY_SEPARATOR + member_id)
    assert submitted_key.endswith(ITEM_KEY_SEPARATOR + member_id)
    assert signup_key != submitted_key


# --- 2. Dismiss / restore ---

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
    # Badges are a separate path (_sum_counts_for_tab); they must move too.
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
    """``comment_mention`` is an event, so archivable (#1196); only
    ``awaiting_submission`` is exempt.
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


# --- 3. awaiting_submission is not archivable ---

@pytest.mark.asyncio
async def test_dismissing_awaiting_submission_is_rejected(
    client: AsyncClient, full_feed: dict, auth_headers: dict
):
    """State, not event: archiving would silence a standing obligation."""
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
    """Three distinct 400s: unknown type, no separator, non-integer id (#1652)."""
    response = await client.post(
        "/activity-feed/dismiss", json={"item_key": item_key}, headers=auth_headers
    )
    assert response.status_code == 400, response.text
    assert response.json()["detail"]["code"] == expected_code.value


@pytest.mark.asyncio
async def test_dismiss_all_skips_awaiting_submission(
    client: AsyncClient, full_feed: dict, auth_headers: dict
):
    response = await client.post(
        "/activity-feed/dismiss-all",
        json={"filter": REQUESTS_FILTER},
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
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


# --- 4. Archiving never answers anything ---

@pytest.mark.asyncio
async def test_archiving_a_collab_invite_leaves_it_pending(
    client: AsyncClient,
    db_session: AsyncSession,
    full_feed: dict,
    auth_headers: dict,
):
    """ADR-0070: archive is a view state; the invite stays unanswered."""
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

    assert target.endswith(ITEM_KEY_SEPARATOR + str(invite.id))


# --- 5. Bulk + the archived view ---

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
    """Archived returns everything archived, whatever tab it came from."""
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

    archived = await _feed(client, auth_headers, FRIENDS_FILTER, archived=True)
    archived_types = {item["type"] for item in archived["items"]}
    assert len(archived["items"]) == (
        SEEDED_ITEM_COUNTS[FRIENDS_FILTER] + SEEDED_ITEM_COUNTS[FOES_FILTER]
    )
    assert "foe_taunt" in archived_types
    assert FEED_ITEM_TYPE_FRIEND_COMPLETION in archived_types

    # Badges keep counting the live feed while the archive is on screen.
    assert archived["counts"]["friends"] == 0
    assert archived["counts"]["all"] == (
        SEEDED_ITEM_COUNTS[ALL_FILTER]
        - SEEDED_ITEM_COUNTS[FRIENDS_FILTER]
        - SEEDED_ITEM_COUNTS[FOES_FILTER]
    )

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
    # ``awaiting_submission`` is not in the ALL stream (ADR-0070), and bulk archive
    # is scoped to the active filter.
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


# --- 6. Stale rows leave the LIVE feed at read time, never a write (#1301) ---
# Staleness is a property of the source row, so it lives in the source's WHERE;
# nothing here writes `feed_dismissal` (ADR-0070).

async def _resolve_the_requests(db_session: AsyncSession, full_feed: dict) -> None:
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
    """The nudge dies with the viewer's obligation, not the praxis: the collab stays
    `in_progress`, so the predicate reads the viewer's member row.
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
    queue = await _feed(client, auth_headers, REQUESTS_FILTER)
    assert FEED_ITEM_TYPE_AWAITING_SUBMISSION not in {
        item["type"] for item in queue["items"]
    }
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
    """Member row still unfiled: only the praxis status retires this one."""
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
    """`unanswered_requests_only` is a live-feed axis; it covers duel challenges too."""
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
    """Items and counts must share the pending-only predicate on every tab."""
    await _resolve_the_requests(db_session, full_feed)

    for tab, count_key in COUNT_KEYS.items():
        feed = await _feed(client, auth_headers, tab)
        assert feed["counts"][count_key] == len(feed["items"]), tab

    # Tab badges describe the LIVE feed; ``by_type`` describes the list (#1420).
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
    """Archived keeps every status, or an answered archived invite is stranded."""
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


# --- 7. Unanswered obligations live in the queue, not the stream (ADR-0070) ---

@pytest.mark.asyncio
async def test_unanswered_requests_are_absent_from_the_live_stream(
    client: AsyncClient, full_feed: dict, auth_headers: dict
):
    """Still registry members (``FEED_SOURCES``); this is ADR-0070's context axis."""
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
    """Badges share the windowed subquery (ADR-0036), so they drop too."""
    feed = await _feed(client, auth_headers)
    assert feed["counts"]["all"] == SEEDED_ITEM_COUNTS[ALL_FILTER]
    assert feed["counts"]["your_stuff"] == SEEDED_ITEM_COUNTS[YOUR_STUFF_FILTER]
    # The bell reads this badge.
    assert feed["counts"]["requests"] == SEEDED_ITEM_COUNTS[REQUESTS_FILTER]


@pytest.mark.asyncio
async def test_bulk_archive_on_the_stream_cannot_sweep_up_an_obligation(
    client: AsyncClient, full_feed: dict, auth_headers: dict
):
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
    """Archived reads ``filter=all``; dropping the types from the ALL source-set
    would have hidden them here too.
    """
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
    """``invitation_letter`` has no status: a letter for the viewer's own faction
    asks nothing and stays out of the queue.
    """
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
    assert [item["payload"]["faction_slug"] for item in letters] == [OTHER_FACTION_SLUG]
    assert queue["counts"]["requests"] == SEEDED_ITEM_COUNTS[REQUESTS_FILTER]


# --- 8. Per-type facet counts (#1420) ---

@pytest.mark.asyncio
async def test_per_type_counts_match_the_items_on_every_rail(
    client: AsyncClient, full_feed: dict, auth_headers: dict
):
    """ADR-0036: the facet count is the list's own length."""
    for tab in COUNT_KEYS:
        feed = await _feed(client, auth_headers, tab)
        assert _published_type_counts(feed) == _observed_type_counts(feed), tab
        assert feed["counts"][COUNT_KEYS[tab]] == sum(
            feed["counts"]["by_type"].values()
        ), tab


@pytest.mark.asyncio
async def test_selecting_one_type_does_not_shrink_the_other_types_counts(
    client: AsyncClient, full_feed: dict, auth_headers: dict
):
    """The type axis must not filter its own counts, or ticking one type zeroes the
    others with no way back (#1419 decision 19).
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
    """Archived facet counts describe the archived list (ADR-0036); tab badges stay
    live (#1419 decision 21).
    """
    live = await _feed(client, auth_headers)
    await client.post(
        "/activity-feed/dismiss-all", json={"filter": FOES_FILTER}, headers=auth_headers
    )

    archived = await _feed(client, auth_headers, ALL_FILTER, archived=True)
    assert _published_type_counts(archived) == _observed_type_counts(archived)
    assert _published_type_counts(archived) == {FEED_ITEM_TYPE_FOE_TAUNT: 1,
                                                "foe_completion": 1}
    assert archived["counts"]["by_type"] != live["counts"]["by_type"]
    assert archived["counts"]["foes"] == 0
    assert archived["counts"]["all"] == live["counts"]["all"] - 2

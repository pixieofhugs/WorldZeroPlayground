"""The notification-preference registry and its resolver (#1047).

Locks derive from the requests set; an unset key is the event's default (hence
one JSONB column, no migration per event). Wire and feed:
``tests/integration/test_notification_prefs.py``.
"""

import pytest

from services.activity_feed import (
    FEED_ITEM_TYPE_AWAITING_SUBMISSION,
    FEED_ITEM_TYPE_COLLAB_INVITE,
    FEED_ITEM_TYPE_COMMENT_MENTION,
    FEED_ITEM_TYPE_COMMENT_ON_MINE,
    FEED_ITEM_TYPE_DUEL_CHALLENGE,
    FEED_ITEM_TYPE_ERA_ANNOUNCEMENT,
    FEED_ITEM_TYPE_GLOBAL_TASK,
    FEED_ITEM_TYPE_INVITATION_LETTER,
    FEED_ITEM_TYPE_VOTE_CHANGED_ON_MINE,
    FEED_ITEM_TYPE_VOTE_ON_MINE,
    REQUEST_ITEM_TYPES,
)
from services.notification_prefs import (
    LEVEL_UP,
    NOTIFICATION_EVENTS,
    apply_update,
    muted_feed_types,
    resolve_prefs,
)

#: The 2026-08-19 ruling, retyped once here. `(page, email, locked)`.
RULED_DEFAULTS = {
    FEED_ITEM_TYPE_DUEL_CHALLENGE: (True, True, True),
    FEED_ITEM_TYPE_COLLAB_INVITE: (True, True, True),
    FEED_ITEM_TYPE_INVITATION_LETTER: (True, True, True),
    FEED_ITEM_TYPE_COMMENT_ON_MINE: (True, True, False),
    FEED_ITEM_TYPE_COMMENT_MENTION: (True, True, False),
    FEED_ITEM_TYPE_VOTE_ON_MINE: (True, False, False),
    # `level_up` has no feed row (ruling 2026-08-18), so page is locked OFF.
    LEVEL_UP: (False, False, True),
    FEED_ITEM_TYPE_ERA_ANNOUNCEMENT: (True, False, False),
    FEED_ITEM_TYPE_GLOBAL_TASK: (True, False, False),
}


def test_empty_column_resolves_to_every_default():
    """Why a new event needs no migration or backfill."""
    resolved = resolve_prefs({})
    assert set(resolved) == set(RULED_DEFAULTS)
    assert {
        key: (pref.on_updates, pref.by_email, pref.locked)
        for key, pref in resolved.items()
    } == RULED_DEFAULTS


@pytest.mark.parametrize("raw", [None, {}, [], "", 0, {"vote_on_mine": "yes"}])
def test_junk_in_the_column_resolves_to_defaults(raw):
    resolved = resolve_prefs(raw)
    assert {
        key: (pref.on_updates, pref.by_email, pref.locked)
        for key, pref in resolved.items()
    } == RULED_DEFAULTS


def test_nine_rows_and_awaiting_submission_is_not_one_of_them():
    """``awaiting_submission`` is state, not an event, so it gets no row."""
    assert len(NOTIFICATION_EVENTS) == 9
    every_feed_type = {t for event in NOTIFICATION_EVENTS for t in event.feed_types}
    assert FEED_ITEM_TYPE_AWAITING_SUBMISSION not in every_feed_type


def test_the_locked_page_rows_are_derived_from_the_requests_set():
    """The lock rule is requests-section MEMBERSHIP, not "does it involve me"."""
    locked_on = {
        event.key
        for event in NOTIFICATION_EVENTS
        if event.page_locked and event.page_default
    }
    assert locked_on == {
        t for t in REQUEST_ITEM_TYPES if t != FEED_ITEM_TYPE_AWAITING_SUBMISSION
    }


def test_mentions_and_comments_on_mine_are_not_locked():
    """News about you, not a request of you (see ``normalizeFeedItem.ts``)."""
    by_key = {event.key: event for event in NOTIFICATION_EVENTS}
    assert not by_key[FEED_ITEM_TYPE_COMMENT_MENTION].page_locked
    assert not by_key[FEED_ITEM_TYPE_COMMENT_ON_MINE].page_locked


def test_turning_a_row_off_mutes_both_of_its_feed_types():
    muted = muted_feed_types({FEED_ITEM_TYPE_VOTE_ON_MINE: {"on_updates": False}})
    assert muted == {FEED_ITEM_TYPE_VOTE_ON_MINE, FEED_ITEM_TYPE_VOTE_CHANGED_ON_MINE}


def test_a_request_type_can_never_be_muted_however_the_column_was_written():
    """Owner's rule; a stale write from before a type joined is how it would leak."""
    hostile = {t: {"on_updates": False, "by_email": False} for t in REQUEST_ITEM_TYPES}
    assert muted_feed_types(hostile) & REQUEST_ITEM_TYPES == set()
    assert all(
        resolve_prefs(hostile)[t].on_updates
        for t in REQUEST_ITEM_TYPES
        if t in RULED_DEFAULTS
    )


def test_level_up_mutes_nothing_because_it_has_no_feed_type():
    assert (
        muted_feed_types({LEVEL_UP: {"on_updates": False, "by_email": True}})
        == frozenset()
    )
    assert resolve_prefs({LEVEL_UP: {"by_email": True}})[LEVEL_UP].by_email is True


def test_apply_update_drops_unknown_keys():
    """Trust boundary: a hostile client cannot grow this column."""
    stored = apply_update(
        {}, {"not_an_event": {"on_updates": False, "by_email": False}}
    )
    assert stored == {}


def test_apply_update_ignores_a_locked_rows_page_value():
    stored = apply_update(
        {}, {FEED_ITEM_TYPE_DUEL_CHALLENGE: {"on_updates": False, "by_email": False}}
    )
    assert stored[FEED_ITEM_TYPE_DUEL_CHALLENGE] == {
        "on_updates": True,
        "by_email": False,
    }


def test_apply_update_writes_one_row_without_disturbing_the_others():
    stored = apply_update(
        {}, {FEED_ITEM_TYPE_GLOBAL_TASK: {"on_updates": False, "by_email": True}}
    )
    resolved = resolve_prefs(stored)
    assert (
        resolved[FEED_ITEM_TYPE_GLOBAL_TASK].on_updates,
        resolved[FEED_ITEM_TYPE_GLOBAL_TASK].by_email,
    ) == (
        False,
        True,
    )
    assert resolved[FEED_ITEM_TYPE_ERA_ANNOUNCEMENT].on_updates is True
    assert resolved[FEED_ITEM_TYPE_ERA_ANNOUNCEMENT].by_email is False

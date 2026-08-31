"""The notification-preference registry and its resolver (#1047).

THE SEAM
--------
``services/notification_prefs.py`` is where a stored JSONB blob becomes nine
answers, and where two rules that are stated in prose on the issue become
derivations that cannot rot:

* **the locks come from the requests set**, not from a hand-written list of
  three rows — so a *tenth* request type joining ``FILTER_REQUESTS`` locks
  itself rather than being silently suppressible; and
* **an unset key is that event's default**, which is the whole reason the
  storage is one JSONB column with no migration behind a new event.

Pure functions over a dict, so this needs no database and no app.
``tests/integration/test_notification_prefs.py`` covers the wire and the feed.
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

#: The 2026-08-19 ruling's table, retyped ONCE, here, where a disagreement is a
#: test failure rather than a shipped default. `(page, email, locked)`.
RULED_DEFAULTS = {
    FEED_ITEM_TYPE_DUEL_CHALLENGE: (True, True, True),
    FEED_ITEM_TYPE_COLLAB_INVITE: (True, True, True),
    FEED_ITEM_TYPE_INVITATION_LETTER: (True, True, True),
    FEED_ITEM_TYPE_COMMENT_ON_MINE: (True, True, False),
    FEED_ITEM_TYPE_COMMENT_MENTION: (True, True, False),
    FEED_ITEM_TYPE_VOTE_ON_MINE: (True, False, False),
    # The one row the ruling's page column cannot mean literally: `level_up`
    # has no feed row (owner ruling 2026-08-18, "no feed row — the popup
    # already tells you"), so its page switch is locked OFF and explains
    # itself rather than moving and changing nothing.
    LEVEL_UP: (False, False, True),
    FEED_ITEM_TYPE_ERA_ANNOUNCEMENT: (True, False, False),
    FEED_ITEM_TYPE_GLOBAL_TASK: (True, False, False),
}


def test_empty_column_resolves_to_every_default():
    """The acceptance line: ``notification_prefs = '{}'`` is every default.

    This is what makes the storage decision hold — a tenth event needs no
    migration and no backfill precisely because an account that predates it
    still answers correctly.
    """
    resolved = resolve_prefs({})
    assert set(resolved) == set(RULED_DEFAULTS)
    assert {
        key: (pref.page, pref.email, pref.locked) for key, pref in resolved.items()
    } == RULED_DEFAULTS


@pytest.mark.parametrize("raw", [None, {}, [], "", 0, {"vote_on_mine": "yes"}])
def test_junk_in_the_column_resolves_to_defaults(raw):
    """Nothing a malformed column holds can produce a fourth answer."""
    resolved = resolve_prefs(raw)
    assert {
        key: (pref.page, pref.email, pref.locked) for key, pref in resolved.items()
    } == RULED_DEFAULTS


def test_nine_rows_and_awaiting_submission_is_not_one_of_them():
    """``awaiting_submission`` is the fourth request type and gets NO row.

    It is state rather than an event — the backend refuses to archive it — so
    there is nothing to prefer. Asserted rather than commented, because "nine"
    is otherwise just a number in an issue.
    """
    assert len(NOTIFICATION_EVENTS) == 9
    every_feed_type = {t for event in NOTIFICATION_EVENTS for t in event.feed_types}
    assert FEED_ITEM_TYPE_AWAITING_SUBMISSION not in every_feed_type


def test_the_locked_page_rows_are_derived_from_the_requests_set():
    """The lock rule is requests-section MEMBERSHIP, not "does it involve me".

    Reads ``REQUEST_ITEM_TYPES`` — itself derived from ``FEED_SOURCES`` — so a
    tenth request type cannot be added on one side and left unlocked here.
    """
    locked_on = {
        event.key
        for event in NOTIFICATION_EVENTS
        if event.page_locked and event.page_default
    }
    assert locked_on == {
        t for t in REQUEST_ITEM_TYPES if t != FEED_ITEM_TYPE_AWAITING_SUBMISSION
    }


def test_mentions_and_comments_on_mine_are_not_locked():
    """Both are about you and NEITHER is a request of you.

    ``normalizeFeedItem.ts`` already writes down why — "a mention is news about
    you, not a request of you" — and this is the assertion that keeps a future
    reader from "fixing" it by locking them.
    """
    by_key = {event.key: event for event in NOTIFICATION_EVENTS}
    assert not by_key[FEED_ITEM_TYPE_COMMENT_MENTION].page_locked
    assert not by_key[FEED_ITEM_TYPE_COMMENT_ON_MINE].page_locked


def test_turning_a_row_off_mutes_both_of_its_feed_types():
    """One row can own more than one type — a vote landing and a vote changing."""
    muted = muted_feed_types({FEED_ITEM_TYPE_VOTE_ON_MINE: {"page": False}})
    assert muted == {FEED_ITEM_TYPE_VOTE_ON_MINE, FEED_ITEM_TYPE_VOTE_CHANGED_ON_MINE}


def test_a_request_type_can_never_be_muted_however_the_column_was_written():
    """The requests section may never be suppressed — the owner's rule.

    A stale write from before a type joined ``FILTER_REQUESTS`` is exactly how
    this would leak, so ``resolve_prefs`` pins a locked row's page value rather
    than reading it.
    """
    hostile = {t: {"page": False, "email": False} for t in REQUEST_ITEM_TYPES}
    assert muted_feed_types(hostile) & REQUEST_ITEM_TYPES == set()
    assert all(resolve_prefs(hostile)[t].page for t in REQUEST_ITEM_TYPES if t in RULED_DEFAULTS)


def test_level_up_mutes_nothing_because_it_has_no_feed_type():
    """Its email switch is the row's whole point; its page switch is inert."""
    assert muted_feed_types({LEVEL_UP: {"page": False, "email": True}}) == frozenset()
    assert resolve_prefs({LEVEL_UP: {"email": True}})[LEVEL_UP].email is True


def test_apply_update_drops_unknown_keys():
    """The trust boundary: a hostile client cannot grow this column."""
    stored = apply_update({}, {"not_an_event": {"page": False, "email": False}})
    assert stored == {}


def test_apply_update_ignores_a_locked_rows_page_value():
    """Storing it would be a lie: ``resolve_prefs`` overrides it on the way out."""
    stored = apply_update(
        {}, {FEED_ITEM_TYPE_DUEL_CHALLENGE: {"page": False, "email": False}}
    )
    assert stored[FEED_ITEM_TYPE_DUEL_CHALLENGE] == {"page": True, "email": False}


def test_apply_update_writes_one_row_without_disturbing_the_others():
    stored = apply_update({}, {FEED_ITEM_TYPE_GLOBAL_TASK: {"page": False, "email": True}})
    resolved = resolve_prefs(stored)
    assert (resolved[FEED_ITEM_TYPE_GLOBAL_TASK].page, resolved[FEED_ITEM_TYPE_GLOBAL_TASK].email) == (
        False,
        True,
    )
    assert resolved[FEED_ITEM_TYPE_ERA_ANNOUNCEMENT].page is True
    assert resolved[FEED_ITEM_TYPE_ERA_ANNOUNCEMENT].email is False

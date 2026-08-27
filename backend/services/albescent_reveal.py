"""The one definition of "this account has been revealed to Albescent".

Every surface that behaves differently for a member of the secret society —
whether the word is printed (``GET /factions``), whether the unlock rung is
announced (``services.progression``), and now whether a faction filter answers
the roster question or the anti-oracle one (``faction_slugs``, #2422) — asks
this function rather than reading the columns.

It is a function because #2409 §6 held an open owner question about widening the
predicate to ``albescent_revealed || can_start_as_albescent``. That question is
answered — **reveal on QUALIFY, not on join** (#2518) — and the widening landed
here, once, instead of in however many places had inlined an attribute read. Two
independently-drifting definitions of "revealed" is the parallel-registry failure
this repo keeps stamping out; this is the shape that paid for itself.

Anonymous callers are unrevealed by definition — fail closed.
"""

from models.account import Account


def is_albescent_revealed(account: Account | None, *, is_admin: bool = False) -> bool:
    """True when this account may be told the society exists.

    A union of three, and a union is the whole point — none of them replaces
    another, and each is sticky in its own right:

    * ``Account.albescent_revealed`` flips the first time any character on the
      account joins Albescent (``services.faction_service``) and is never unset,
      so it survives age-out, character switches, and the #2399 eviction that
      moved ``faction_slug`` and touched neither flag.
    * ``Account.albescent_unlocked`` is the earned door (#2399, ADR-0080). Before
      #2518 it opened character creation without opening the word, so a qualified
      account was offered the calling on a tile labelled "Unaffiliated" — the
      join gate open, the reveal gate shut. Reveal is now **derived** from it
      rather than a second sticky write, which is what stops the two from
      drifting apart again.
    * ``is_admin`` short-circuits both (#2400). Moderation has to be able to read
      the surfaces it moderates, and the only other way in was for an admin to
      inflate their own progress until they qualified — cheating, to do the job.

    **Nothing here writes.** The admin bypass never wrote ``albescent_revealed``,
    and neither does the unlock read: an admin who loses the role loses the
    reveal with it, and both columns keep meaning what they say. Deriving rather
    than stamping is why ``albescent_unlocked`` remains the single record of
    "earned".

    **Seeing is not joining, and that split is what keeps this safe.**
    ``can_start_as_albescent`` is an *input* to this predicate now, never a peer:
    the widening runs one way only. ``defect_to_faction``'s Albescent guard is
    untouched and still consults admin status not at all, so an admin joins by
    qualifying like anyone else. Compare
    ``services.character_capabilities.can_apply_metatask``, which pointedly does
    *not* short-circuit on ``is_admin`` because ``apply_metatask`` has no admin
    escape hatch — a capability flag saying yes where enforcement says no is
    drift. Here there is no such claim to drift from: this predicate governs only
    what is *shown*, the join gate is a separate flag on the same payload
    (``CurrentUser.can_start_as_albescent``), and no caller on either side of the
    wire derives one from the other. Keep it that way.

    **The New Game+ ceiling must never appear here.** ``defect_to_faction``
    refuses a character at ``era.albescent_level_required`` — the game's one
    maximum-level gate — and that is a fact about the *joining character*. An
    account that qualifies is by definition a level-8 account, so a ceiling test
    in this account-scoped predicate would darken the society for exactly the
    people who earned it, and the level-0 sibling that is the only way in is
    created from the screen it would blank. This function has no character in
    hand and must never grow one.

    Caller-supplied rather than resolved here: admin status is an
    ``account_role`` row (``dependencies.account_has_admin_role``), so looking
    it up would make this async and force a session on every reader — including
    ``services.progression``, which is otherwise pure config filtering. Every
    call site already resolves or receives the flag. It defaults to ``False``,
    so a reader that does not pass it gets the unprivileged answer. The unlock
    column needs no such care: it is on the ``Account`` already in hand, which is
    what let #2518 stay a one-line widening.

    ``bool()`` rather than a bare ``or`` chain: both columns are ``default=False``
    at *flush*, so an ``Account`` that has not been flushed yet still holds
    ``None``, and ``False or None`` is ``None`` — falsy, so no caller misbehaves,
    but the annotation would be a lie and an ``is False`` assertion would fail on
    a value that is not False.
    """
    return bool(
        account is not None
        and (is_admin or account.albescent_revealed or account.albescent_unlocked)
    )


def is_albescent_glimpsed(account: Account | None, *, is_admin: bool = False) -> bool:
    """True when this account may be shown that a row is THERE (#2770).

    The stage in front of :func:`is_albescent_revealed`, and the two answer
    different questions about the same eighth row:

    * **glimpsed** — the row is drawn, unreadable, ``[REDACTED]``. ADR-0082's
      locked door with no keyhole.
    * **revealed** — the row is drawn and readable.

    Below both, the row is not drawn at all: no tile on ``/factions``, no lane in
    the race, and nothing on either surface saying a row was removed. That is
    ADR-0027's hiding posture, restored for the early game only — ADR-0082's
    reasoning still governs from the floor up.

    **Reveal implies glimpse, derived here rather than stamped.** A revealed
    account is by definition allowed to see what it is allowed to read, and an
    admin (#2400) sees both. Writing ``albescent_glimpsed`` at reveal time
    instead would be a second record of a fact this line already knows, and two
    records of one fact is the drift ``is_albescent_revealed`` exists to stop —
    see its docblock on deriving rather than stamping.

    ``Account.albescent_glimpsed`` is stamped by
    :func:`services.character.stamp_albescent_glimpse` the first time ANY life on
    the account reaches ``era.albescent_glimpse_level``, and never unset, so the
    sight survives switching to a level-0 character, signing out, and an era
    reset.

    Anonymous callers are un-glimpsed by definition — fail closed, same as the
    predicate above.

    ``bool()`` for the same reason: the column is ``default=False`` at *flush*,
    so an unflushed ``Account`` still holds ``None``.
    """
    return bool(
        is_albescent_revealed(account, is_admin=is_admin)
        or (account is not None and account.albescent_glimpsed)
    )

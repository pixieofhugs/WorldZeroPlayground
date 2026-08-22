"""The one definition of "this account has been revealed to Albescent".

Every surface that behaves differently for a member of the secret society —
whether the word is printed (``GET /factions``), whether the unlock rung is
announced (``services.progression``), and now whether a faction filter answers
the roster question or the anti-oracle one (``faction_slugs``, #2422) — asks
this function rather than reading the column.

It is one line today. It is a function because #2409 §6 holds an open owner
question about widening the predicate to ``albescent_revealed ||
can_start_as_albescent``: when that is answered the answer lands here, once,
instead of in however many places had inlined the attribute read. Two
independently-drifting definitions of "revealed" is the parallel-registry
failure this repo keeps stamping out.

Anonymous callers are unrevealed by definition — fail closed.
"""

from models.account import Account


def is_albescent_revealed(account: Account | None, *, is_admin: bool = False) -> bool:
    """True when this account may be told the society exists.

    ``Account.albescent_revealed`` is sticky: it flips the first time any
    character on the account joins Albescent (``services.faction_service``) and
    is never unset, so it survives age-out and character switches.

    ``is_admin`` short-circuits it (#2400). Moderation has to be able to read
    the surfaces it moderates, and the only other way in was for an admin to
    inflate their own progress until they qualified — cheating, to do the job.
    It is a **read-side** bypass and deliberately nothing else: no caller writes
    ``albescent_revealed`` for an admin, so an admin who later loses the role
    loses the reveal with it, and the column keeps meaning "earned".

    **Seeing is not joining, and that split is what keeps this safe.**
    ``can_start_as_albescent`` and ``defect_to_faction``'s Albescent guard never
    consult admin status: an admin joins by qualifying like anyone else. Compare
    ``services.character_capabilities.can_apply_metatask``, which pointedly does
    *not* short-circuit on ``is_admin`` because ``apply_metatask`` has no admin
    escape hatch — a capability flag saying yes where enforcement says no is
    drift. Here there is no such claim to drift from: this predicate governs
    only what is *shown*, the join gate is a separate flag on the same payload
    (``CurrentUser.can_start_as_albescent``), and no caller on either side of
    the wire derives one from the other. Keep it that way.

    Caller-supplied rather than resolved here: admin status is an
    ``account_role`` row (``dependencies.account_has_admin_role``), so looking
    it up would make this async and force a session on every reader — including
    ``services.progression``, which is otherwise pure config filtering. Every
    call site already resolves or receives the flag. It defaults to ``False``,
    so a reader that does not pass it gets the unprivileged answer.
    """
    return account is not None and (is_admin or account.albescent_revealed)

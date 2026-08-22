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


def is_albescent_revealed(account: Account | None) -> bool:
    """True when this account may be told the society exists.

    ``Account.albescent_revealed`` is sticky: it flips the first time any
    character on the account joins Albescent (``services.faction_service``) and
    is never unset, so it survives age-out and character switches.
    """
    return account is not None and account.albescent_revealed

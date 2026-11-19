"""The one definition of "this account has been revealed to Albescent".

Every surface that behaves differently for society members (``GET /factions``,
``services.progression``, ``faction_slugs`` #2422) asks this, never the columns.
Anonymous callers are unrevealed — fail closed.
"""

from game_config import CURRENT_ERA, EraConfig
from models.account import Account
from services.secret_faction import has_stamp


def is_albescent_revealed(
    account: Account | None,
    *,
    is_admin: bool = False,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """True when this account may be told the society exists.

    A union of three, each sticky on its own:

    * ``albescent_revealed`` — set when any character joins; never unset.
    * ``albescent_unlocked`` — the earned door (ADR-0080); reveal on QUALIFY,
      not on join (#2518). Derived here, not a second sticky write.
    * ``is_admin`` (#2400) — moderation must read what it moderates.

    Nothing here writes: an admin who loses the role loses the reveal.

    Seeing is not joining. ``can_start_as_albescent`` is an input, never a peer;
    ``defect_to_faction``'s guard ignores admin status. This predicate governs
    only what is shown; no caller derives the join flag from it.

    Never add the New Game+ level ceiling here: it is about the joining
    character, and would darken the society for exactly the accounts that earned
    it. This function has no character in hand and must never grow one.

    ``is_admin`` is caller-supplied (an ``account_role`` row) so this stays sync;
    defaults to the unprivileged answer.

    An era with no secret faction reveals nothing, admin included.
    """
    slug = era.secret_faction_slug
    return (
        account is not None
        and slug is not None
        and (
            is_admin
            or has_stamp(account, slug, "revealed")
            or has_stamp(account, slug, "unlocked")
        )
    )


def is_albescent_glimpsed(
    account: Account | None,
    *,
    is_admin: bool = False,
    era: EraConfig = CURRENT_ERA,
) -> bool:
    """True when this account may be shown that a row is THERE (#2770).

    * glimpsed — row drawn, ``[REDACTED]`` (ADR-0082).
    * revealed — row drawn and readable.
    * neither — row not drawn, no trace (ADR-0027, early game only).

    Reveal implies glimpse, derived rather than stamped (see above).
    ``albescent_glimpsed`` is stamped by
    :func:`services.character.stamp_albescent_glimpse` when any life reaches
    ``era.secret_faction_glimpse_level``; never unset. Anonymous: fail closed.
    """
    return is_albescent_revealed(account, is_admin=is_admin, era=era) or has_stamp(
        account, era.secret_faction_slug, "glimpsed"
    )

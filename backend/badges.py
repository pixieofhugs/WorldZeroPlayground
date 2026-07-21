"""Badge registry — code-defined badges evaluated on read (ADR-0033, #459).

A badge is a frozen dataclass with a ``condition`` predicate over a
:class:`BadgeContext`. There is no badge table, no ``earned_at``, no award
events, and no admin grant — a badge either holds *right now* for a character
or it doesn't. Adding a badge = adding one entry to :data:`ALL_BADGES`.

The badge image is NOT part of the payload: the frontend maps ``key`` to a
bundled asset (like faction sigils).
"""
from dataclasses import dataclass
from typing import Callable


@dataclass(frozen=True)
class BadgeContext:
    """Per-character facts a badge condition may consult.

    Built by ``services.badge.build_badge_context`` from explicit queries —
    never from lazy-loaded relationships (``Character.account`` is
    ``lazy="raise"``).
    """

    # Total characters owned by this character's account (this one included).
    account_character_count: int
    # True when this character is the account's earliest by (created_at, id).
    is_earliest_on_account: bool
    # True when this character is winning at least one *live* duel (#748) —
    # strictly ahead on votes right now, or holding a forfeit win. The first
    # per-character (rather than per-account) fact in the context.
    is_duel_winner: bool
    # True when this character is the frozen winner of a duel resolved at the
    # close of the *previous* era (#823). The first cross-era fact in the context:
    # every other one is about the here and now.
    won_duel_last_era: bool


@dataclass(frozen=True)
class Badge:
    key: str  # stable identifier, e.g. "sock_puppeteer"
    name: str  # display name, e.g. "Sock Puppeteer"
    condition: Callable[[BadgeContext], bool]


def _is_sock_puppeteer(context: BadgeContext) -> bool:
    """Earliest character on an account that owns more than one."""
    return context.account_character_count > 1 and context.is_earliest_on_account


def _is_sock_puppet(context: BadgeContext) -> bool:
    """A later character on an account that owns more than one."""
    return context.account_character_count > 1 and not context.is_earliest_on_account


def _is_duelist(context: BadgeContext) -> bool:
    """Winning a live duel — provisionally on votes, or outright by forfeit (#748).

    Provisional by design (ADR-0011): mid-era a duel has no discrete winner, the
    tally floats, and so does this badge. A forfeit win is sticky for as long as
    the duel stays live, and a frozen win survives era close (owner ruling on
    #748), so this reads "won *or* winning" and never lapses. The narrower
    "won a duel last era" is ``duel_victor`` (#823), a separate badge.
    """
    return context.is_duel_winner


def _is_duel_victor(context: BadgeContext) -> bool:
    """Won a duel *last era* — a finalized result, not a floating one (#823).

    Distinct from ``duelist`` on purpose: that badge is "won or winning" and holds
    on any live lead, any forfeit, or any frozen win however old. This one holds
    only for a win frozen at the close of the era immediately before the current
    one (ADR-0052 — era close is the only moment a duel acquires a winner), so it
    lapses one era later. A tie or no-contest froze a NULL winner and grants
    nothing to either side.

    Unobservable until an era actually closes: Era 1 is live and no era has ever
    closed, so no ``resolved`` duel exists in any environment yet.
    """
    return context.won_duel_last_era


ALL_BADGES: tuple[Badge, ...] = (
    Badge(key="sock_puppeteer", name="Sock Puppeteer", condition=_is_sock_puppeteer),
    Badge(key="sock_puppet", name="Sock Puppet", condition=_is_sock_puppet),
    Badge(key="duelist", name="Duelist", condition=_is_duelist),
    Badge(key="duel_victor", name="Duel Victor", condition=_is_duel_victor),
)

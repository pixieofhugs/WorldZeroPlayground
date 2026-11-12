"""Badge registry — code-defined badges evaluated on read (ADR-0033, #459).

No badge table, no ``earned_at``, no grants: a badge holds *right now* or it
doesn't. Add one entry to :data:`ALL_BADGES`. The frontend maps ``key`` to an image.
"""
from dataclasses import dataclass
from typing import Callable


@dataclass(frozen=True)
class BadgeContext:
    """Per-character facts, built by ``services.badge.build_badge_context`` from
    explicit queries (``Character.account`` is ``lazy="raise"``)."""

    # This one included.
    account_character_count: int
    # By (created_at, id).
    is_earliest_on_account: bool
    # Strictly ahead on votes in a *live* duel, or holding a forfeit win (#748).
    is_duel_winner: bool
    # Frozen winner of a duel resolved at the *previous* era's close (#823).
    won_duel_last_era: bool


@dataclass(frozen=True)
class Badge:
    key: str
    name: str
    condition: Callable[[BadgeContext], bool]


def _is_sock_puppeteer(context: BadgeContext) -> bool:
    """Earliest character on an account that owns more than one."""
    return context.account_character_count > 1 and context.is_earliest_on_account


def _is_sock_puppet(context: BadgeContext) -> bool:
    """A later character on an account that owns more than one."""
    return context.account_character_count > 1 and not context.is_earliest_on_account


def _is_duelist(context: BadgeContext) -> bool:
    """Winning a live duel — provisionally on votes, or by forfeit (#748, ADR-0011)."""
    return context.is_duel_winner


def _is_duel_victor(context: BadgeContext) -> bool:
    """Won a duel *last era* (#823, ADR-0052); lapses an era later. Ties grant none."""
    return context.won_duel_last_era


ALL_BADGES: tuple[Badge, ...] = (
    Badge(key="sock_puppeteer", name="Sock Puppeteer", condition=_is_sock_puppeteer),
    Badge(key="sock_puppet", name="Sock Puppet", condition=_is_sock_puppet),
    Badge(key="duelist", name="Duelist", condition=_is_duelist),
    Badge(key="duel_victor", name="Duel Victor", condition=_is_duel_victor),
)

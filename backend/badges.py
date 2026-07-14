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


ALL_BADGES: tuple[Badge, ...] = (
    Badge(key="sock_puppeteer", name="Sock Puppeteer", condition=_is_sock_puppeteer),
    Badge(key="sock_puppet", name="Sock Puppet", condition=_is_sock_puppet),
)

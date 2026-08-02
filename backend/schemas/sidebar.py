"""Schema for the desktop rail's one compound read (#1344)."""
from pydantic import BaseModel

from schemas.activity_feed import ActivityFeedItem
from schemas.praxis import PraxisCardOut


class SidebarOut(BaseModel):
    """Everything the rail's three data panels draw, in one response.

    One field per panel, and nothing else. Identity is deliberately absent: the
    character card reads ``user.character`` from ``/auth/me``, which ~20 call
    sites already refetch, and fattening that payload would make every one of
    them heavier (#1349). This carries only what the panels need.

    Requests are a NUMBER, not a list (#1456). The rail listed them until
    #1423; under ADR-0070 the Requests queue on ``/updates`` is the only
    surface a request can be answered on, so all that is left here is the
    badge on the collapsed handle, the mobile bell and the mobile FieldDesk —
    three consumers of one integer. Shipping up to a hundred hydrated feed
    items on a page-load path to produce it was the whole of the cost.

    The count is the same one ``counts.requests`` reports, so the badge and
    the queue's card list cannot disagree — see
    :func:`services.activity_feed.get_sidebar_feed`.
    """

    pending_requests_count: int
    #: The player's whole LIVE feed minus the obligations (#1556) — the same
    #: partition ADR-0070 draws for the Requests queue, taken from the other
    #: side. Votes on your praxes, friend and foe completions, taunts, nudges,
    #: mentions, new global tasks, era announcements.
    #:
    #: The name is a legacy wire name: until #1556 the panel was the ``global``
    #: tab alone, and it is kept because renaming a field the rail reads on
    #: every route is a deploy-skew hazard — a frontend ahead of its API would
    #: read ``undefined`` and white-page every page, not just the rail. Rename
    #: it deliberately, with a client-side normalizer landed first, or not at
    #: all. What the field CONTAINS is this comment, not its name.
    global_activity: list[ActivityFeedItem]
    active_praxes: list[PraxisCardOut]

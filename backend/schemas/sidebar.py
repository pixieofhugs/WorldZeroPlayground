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
    global_activity: list[ActivityFeedItem]
    active_praxes: list[PraxisCardOut]

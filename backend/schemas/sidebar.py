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

    The two feed panels are two slices of a single fan-out over the activity
    feed — see :func:`services.activity_feed.get_sidebar_feed`.
    """

    pending_requests: list[ActivityFeedItem]
    global_activity: list[ActivityFeedItem]
    active_praxes: list[PraxisCardOut]

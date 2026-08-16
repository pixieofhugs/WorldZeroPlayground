from datetime import datetime

from schemas.base import WireModel


class TermsAcceptanceOut(WireModel):
    """The receipt for one acceptance: what was agreed to, and when.

    No ``id`` and no ``account_id`` — the caller already knows who they are, and
    ``account_id`` never appears on the wire. Deliberately not a request model's
    twin: this route takes **no** body at all, because the version is the
    server's to state.
    """

    version: str
    accepted_at: datetime

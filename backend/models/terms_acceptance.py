"""The consent log: one row per time an account agreed to the terms (#1861).

Specified in ``docs/spec/SPEC-onboarding.md`` § Terms. Three properties, and
each one is a decision rather than an implementation detail:

**Append-only.** One row per acceptance *event*, never per account. A scan
always re-runs the onboarding cards from the top, so the terms card shows again
to someone who has already agreed, and the log simply absorbs a second row.
There is deliberately no unique constraint on ``account_id``, no upsert and no
dedupe — an accepted-again row is not a duplicate, it is a second event, and
collapsing the two would throw away the only thing this table records.

**No convenience flag anywhere else.** Because a re-acceptance costs nothing,
``CurrentUser`` gains no terms field and ``Account`` gains no boolean. Nothing
derived means nothing that can disagree with the log.

**Not backfilled.** Accounts that predate this table have no rows, and that is
the honest record: nobody was ever shown this document.

``version`` is written from :data:`CURRENT_TERMS_VERSION` by the route, never
from the request — a client must not be able to claim it accepted a version it
was never shown. The column exists so that a future version bump *could* gate
established players; whether it ever does is explicitly out of scope for the
onboarding arc (see the spec's "Out of scope"), so there is no versioning logic
here to go stale.

``created_at`` (from :class:`CreatedAtMixin`) is the acceptance time. A separate
``accepted_at`` would be the same instant under a second name, since a row is
only ever written at the moment of the act; the wire calls it ``accepted_at``
(``schemas/terms.py``) because that is what it means to a reader.
"""

from sqlalchemy import BigInteger, ForeignKey, Identity, String
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base
from models.mixins import CreatedAtMixin

#: The version of the terms the server currently serves, and the only value
#: this table is ever written with. It names the *document*, not this
#: feature: ``v1`` was the four-paragraph Disclaimer, and ``v2`` is the
#: owner's rewrite that landed with #2789
#: (``frontend/src/locales/en/common.json`` → ``disclaimer.*``). The bump is
#: what keeps a row unambiguous about which words it agreed to — without it,
#: two different documents share one version string and the log stops being
#: a record. Nothing else in the backend reads it, so the bump gates nobody;
#: whether a future one ever does is still out of scope (see the module
#: docstring). Rewrite the document, bump this constant.
CURRENT_TERMS_VERSION = "v2"


class TermsAcceptance(CreatedAtMixin, Base):
    __tablename__ = "terms_acceptance"

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    account_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("account.id"), nullable=False
    )
    version: Mapped[str] = mapped_column(String(32), nullable=False)

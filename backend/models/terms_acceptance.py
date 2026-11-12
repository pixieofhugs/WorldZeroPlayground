"""Consent log: one row per acceptance event (#1861; SPEC-onboarding § Terms).

Append-only by design (no unique on account), no derived flag elsewhere, not
backfilled. ``version`` comes from the server, never the request.
``created_at`` is the acceptance time.
"""

from sqlalchemy import BigInteger, ForeignKey, Identity, String
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base
from models.mixins import CreatedAtMixin

#: Names the document (``common.json`` → ``disclaimer.*``). Rewrite it, bump this.
CURRENT_TERMS_VERSION = "v2"


class TermsAcceptance(CreatedAtMixin, Base):
    __tablename__ = "terms_acceptance"

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    account_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("account.id"), nullable=False
    )
    version: Mapped[str] = mapped_column(String(32), nullable=False)

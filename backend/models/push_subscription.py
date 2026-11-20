"""A device's push subscription, per ACCOUNT (ADR-0041).

``endpoint`` is secret-ish: never in a response.
"""

from sqlalchemy import BigInteger, ForeignKey, Identity, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base
from models.mixins import CreatedAtMixin


class PushSubscription(CreatedAtMixin, Base):
    __tablename__ = "push_subscription"

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    account_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("account.id"), nullable=False, index=True
    )
    endpoint: Mapped[str] = mapped_column(String, nullable=False)
    p256dh: Mapped[str] = mapped_column(String, nullable=False)
    auth: Mapped[str] = mapped_column(String, nullable=False)

    __table_args__ = (
        UniqueConstraint("endpoint", name="uq_push_subscription_endpoint"),
    )

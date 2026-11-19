from typing import Optional

from sqlalchemy import BigInteger, ForeignKey, Identity, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base
from models.mixins import CreatedAtMixin


class ModAction(CreatedAtMixin, Base):
    """One moderation action (#3548). Append-only: nothing updates or deletes a row."""

    __tablename__ = "mod_action"
    __table_args__ = (
        Index("ix_mod_action_target", "target_type", "target_id"),
        Index("ix_mod_action_created_at", "created_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    actor_account_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("account.id"), nullable=False
    )
    action: Mapped[str] = mapped_column(String, nullable=False)
    target_type: Mapped[str] = mapped_column(String, nullable=False)
    target_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    detail: Mapped[Optional[str]] = mapped_column(String, nullable=True)

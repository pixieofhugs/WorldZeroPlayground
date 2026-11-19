import enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, Identity, Index, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base
from models.mixins import CreatedAtMixin

if TYPE_CHECKING:
    from models.praxis import Praxis


# Trust-boundary cap for the free-text note carried by FlagReason.other.
MAX_FLAG_REASON_DETAIL = 500


class FlagReason(enum.Enum):
    """Flag-reason vocabulary for praxis and comment flags (ADR-0037); no DB enum."""

    spam = "spam"
    harassment = "harassment"
    nsfw = "nsfw"
    slop = "slop"
    other = "other"


class Flag(CreatedAtMixin, Base):
    """Moderation flag on exactly one of a praxis or a comment (CHECK; ADR-0006)."""

    __tablename__ = "flag"
    __table_args__ = (
        CheckConstraint(
            # Bare name; see models/base.py.
            "num_nonnulls(praxis_id, comment_id) = 1", name="one_target"
        ),
        Index("ix_flag_praxis_id", "praxis_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    # CASCADE: see ``MediaItem.praxis_id``.
    praxis_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("praxis.id", ondelete="CASCADE"), nullable=True
    )
    comment_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("comment.id", ondelete="CASCADE"), nullable=True
    )
    flagged_by: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id"), nullable=False
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False, server_default="other")
    reason_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    praxis: Mapped[Optional["Praxis"]] = relationship(
        "Praxis", back_populates="flags", lazy="raise"
    )

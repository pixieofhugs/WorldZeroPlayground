from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Identity,
    Integer,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base

if TYPE_CHECKING:
    from models.praxis import Praxis


class Vote(Base):
    __tablename__ = "vote"
    __table_args__ = (
        # One vote per ACCOUNT per praxis so alts can't stack (ADR-0041, #1150).
        # ``voter_character_id`` is attribution only.
        UniqueConstraint("praxis_id", "voter_account_id", name="uq_vote_praxis_account"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    # CASCADE: see ``MediaItem.praxis_id``.
    praxis_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("praxis.id", ondelete="CASCADE"), nullable=False
    )
    voter_character_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id"), nullable=False
    )
    voter_account_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("account.id"), nullable=False
    )
    value: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    # ``updated_at > created_at`` means a re-rate (#1712). clock_timestamp(),
    # not now() (constant per transaction), so a same-transaction re-rate shows.
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.clock_timestamp(),
    )

    praxis: Mapped["Praxis"] = relationship(
        "Praxis", foreign_keys=[praxis_id], back_populates="votes", lazy="raise"
    )

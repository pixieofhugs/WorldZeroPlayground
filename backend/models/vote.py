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
        # One vote per ACCOUNT per praxis (#1150). Anti-abuse is enforced one
        # layer up from where the action happens (ADR-0041), so the uniqueness
        # anchor is the account, not the character: alt characters on one
        # account cannot stack several votes onto the same praxis. Duel sides
        # are separate praxes, so this also gives one vote per account per duel
        # side. ``voter_character_id`` stays on the row as attribution — it
        # records which life set the value that stands — and is deliberately
        # not part of the key.
        UniqueConstraint("praxis_id", "voter_account_id", name="uq_vote_praxis_account"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    # ON DELETE CASCADE — see the note on ``MediaItem.praxis_id``.
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
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    praxis: Mapped["Praxis"] = relationship(
        "Praxis", foreign_keys=[praxis_id], back_populates="votes", lazy="raise"
    )

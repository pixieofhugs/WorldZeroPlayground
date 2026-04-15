from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base

if TYPE_CHECKING:
    from models.collaboration import Collaboration
    from models.praxis import Praxis


class Vote(Base):
    __tablename__ = "vote"
    __table_args__ = (
        # Solo-praxis votes: one vote per voter per praxis
        UniqueConstraint("praxis_id", "voter_character_id", name="uq_vote_solo"),
        # Duel votes: one vote per voter per target player per collaboration
        UniqueConstraint(
            "collaboration_id", "voter_character_id", "duel_vote_for", name="uq_vote_duel"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    # Exactly one of praxis_id or collaboration_id must be set.
    praxis_id: Mapped[Optional[int]] = mapped_column(ForeignKey("praxis.id"), nullable=True)
    collaboration_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("collaboration.id"), nullable=True
    )
    voter_character_id: Mapped[int] = mapped_column(
        ForeignKey("character.id"), nullable=False
    )
    voter_account_id: Mapped[int] = mapped_column(
        ForeignKey("account.id"), nullable=False
    )
    stars: Mapped[int] = mapped_column(Integer, nullable=False)
    # duel_vote_for is required for duel votes (collaboration_id set); NULL for solo votes.
    duel_vote_for: Mapped[Optional[int]] = mapped_column(
        ForeignKey("character.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    praxis: Mapped[Optional["Praxis"]] = relationship(
        "Praxis", foreign_keys=[praxis_id], back_populates="votes", lazy="raise"
    )
    collaboration: Mapped[Optional["Collaboration"]] = relationship(
        "Collaboration", foreign_keys=[collaboration_id], back_populates="votes", lazy="raise"
    )

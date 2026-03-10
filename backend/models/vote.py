from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base


class Vote(Base):
    __tablename__ = "vote"
    __table_args__ = (UniqueConstraint("submission_id", "voter_character_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    submission_id: Mapped[int] = mapped_column(ForeignKey("submission.id"), nullable=False)
    voter_character_id: Mapped[int] = mapped_column(
        ForeignKey("character.id"), nullable=False
    )
    voter_account_id: Mapped[int] = mapped_column(
        ForeignKey("account.id"), nullable=False
    )
    stars: Mapped[int] = mapped_column(Integer, nullable=False)
    duel_vote_for: Mapped[Optional[int]] = mapped_column(
        ForeignKey("character.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

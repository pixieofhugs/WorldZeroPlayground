from datetime import datetime

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Identity,
    Integer,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base


class CharacterStats(Base):
    """Per-(character, era) stats; era reset inserts new rows.

    Vote budget is computed on read (``services.scoring.compute_votes_available``).
    """

    __tablename__ = "character_stats"
    __table_args__ = (UniqueConstraint("character_id", "era_id"),)

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    character_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id"), nullable=False
    )
    era_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("era.id"), nullable=False
    )
    score: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    all_time_score: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    level: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    votes_spent_this_era: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    # Level when the level-jump allowance was last spent (#811); available iff
    # != `level`. Only via services.level_jump.
    level_jump_used_at_level: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

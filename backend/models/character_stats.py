from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base


class CharacterStats(Base):
    """Volatile game stats for a character within a specific era.

    One row per (character, era). Era resets insert new rows; old rows are
    preserved for historical queries. All scoring, levelling, and vote budget
    state lives here — Character is a pure dimension table.

    Vote budget is computed on read from the formula
        votes_available = era.vote_budget_base + floor(era.vote_budget_multiplier * score)
                        - votes_spent_this_era
    See services/scoring.py::compute_votes_available. `votes_spent_this_era`
    is monotonic within an era: it increments on first-cast votes and resets
    to zero on era reset.
    """

    __tablename__ = "character_stats"
    __table_args__ = (UniqueConstraint("character_id", "era_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    character_id: Mapped[int] = mapped_column(ForeignKey("character.id"), nullable=False)
    era_id: Mapped[int] = mapped_column(ForeignKey("era.id"), nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    all_time_score: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    level: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    votes_spent_this_era: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

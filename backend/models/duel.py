import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    BigInteger,
    DateTime,
    Enum,
    ForeignKey,
    Identity,
    Index,
    Integer,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base
from models.mixins import CreatedAtMixin

if TYPE_CHECKING:
    from models.character import Character
    from models.praxis import Praxis
    from models.task import Task


class DuelStatus(enum.Enum):
    pending = "pending"
    active = "active"
    settled = "settled"
    declined = "declined"
    resolved = "resolved"


class Duel(CreatedAtMixin, Base):
    """Two solo praxes as competing sides of a duel (ADR-0011).

    pending → active → settled (voting open) → resolved, or pending → declined
    (challenger's praxis reverts to solo). Era reset resolves active/settled
    duels (ADR-0052); an `active` one is a no-contest.
    """

    __tablename__ = "duel"

    __table_args__ = (
        Index("ix_duel_challenger_praxis_id", "challenger_praxis_id"),
        Index("ix_duel_opponent_praxis_id", "opponent_praxis_id"),
        Index("ix_duel_opponent_character_id", "opponent_character_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    task_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("task.id"), nullable=False
    )
    challenger_praxis_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("praxis.id"), nullable=False
    )
    opponent_character_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id"), nullable=False
    )
    opponent_praxis_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("praxis.id"), nullable=True
    )
    status: Mapped[DuelStatus] = mapped_column(
        Enum(DuelStatus, create_type=False),
        nullable=False,
        server_default="pending",
    )
    accepted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    declined_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Sticky forfeit of a settled duel; resubmitting doesn't restore it (ADR-0011).
    forfeited_by_character_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("character.id"), nullable=True
    )

    # Frozen at era close (ADR-0052). NULL winner = tie or no-contest.
    winner_character_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("character.id"), nullable=True
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # The era that was closing. Needed because `resolved_at` lands just after
    # the new era's `started_at` (#823).
    resolved_era_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("era.id"), nullable=True
    )
    # Snapshot of points_from_votes at resolution.
    challenger_final_points: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    opponent_final_points: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    challenger_praxis: Mapped["Praxis"] = relationship(
        "Praxis", foreign_keys=[challenger_praxis_id], lazy="selectin"
    )
    opponent_praxis: Mapped[Optional["Praxis"]] = relationship(
        "Praxis", foreign_keys=[opponent_praxis_id], lazy="selectin"
    )
    opponent: Mapped["Character"] = relationship(
        "Character", foreign_keys=[opponent_character_id], lazy="selectin"
    )
    task: Mapped["Task"] = relationship(
        "Task", foreign_keys=[task_id], lazy="selectin"
    )

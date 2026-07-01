import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, func
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


class Duel(CreatedAtMixin, Base):
    """Links two solo praxes as competing sides of a duel (ADR-0011).

    Lifecycle: pending → active → settled (terminal), or pending → declined (terminal).
    - pending: challenger's praxis created; opponent has been challenged.
    - active: opponent accepted; opponent's praxis created.
    - settled: both praxes submitted; voting is open.
    - declined: opponent declined or challenger cancelled; challenger's praxis
      reverts to a plain solo praxis (Duel row is kept for history).
    """

    __tablename__ = "duel"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("task.id"), nullable=False)
    challenger_praxis_id: Mapped[int] = mapped_column(ForeignKey("praxis.id"), nullable=False)
    opponent_character_id: Mapped[int] = mapped_column(ForeignKey("character.id"), nullable=False)
    # NULL until the opponent accepts and their praxis is created.
    opponent_praxis_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("praxis.id"), nullable=True
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
    # Set when a *settled* duel is forfeited (unsubmit or ban). Sticky: the
    # opponent wins by default, the duel stays settled, and resubmitting does
    # not restore the contest (ADR-0011 §Forfeit, #307).
    forfeited_by_character_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("character.id"), nullable=True
    )

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

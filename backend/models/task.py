import enum
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import BigInteger, Boolean, Enum, ForeignKey, Identity, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base
from models.mixins import TimestampMixin

if TYPE_CHECKING:
    from models.praxis import Praxis


class TaskStatus(enum.Enum):
    pending = "pending"
    active = "active"
    retired = "retired"


class TaskType(enum.Enum):
    """Distinguishes a standalone task from a metatask.

    A metatask is a task that cannot be done standalone — it must be applied
    to another praxis (of a standard task) and contributes its point_value as
    a flat bonus before faction multipliers.
    """

    standard = "standard"
    metatask = "metatask"


class Task(TimestampMixin, Base):
    __tablename__ = "task"

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    point_value: Mapped[int] = mapped_column(Integer, nullable=False)
    level_required: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus, create_type=False), default=TaskStatus.pending, nullable=False
    )
    task_type: Mapped[TaskType] = mapped_column(
        Enum(TaskType, create_type=False),
        nullable=False,
        default=TaskType.standard,
        server_default="standard",
    )
    created_by: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id"), nullable=False
    )
    # "na" is the sentinel for generic cross-faction tasks. String FK: faction's
    # primary key is its slug (ADR-0038), not an integer.
    primary_faction_slug: Mapped[str] = mapped_column(
        String, ForeignKey("faction.slug"), nullable=False, server_default="na"
    )
    # Only set when task_type == metatask; identifies which faction's members
    # (at level 7+) may apply this metatask to their praxes. Null for standard.
    metatask_faction_slug: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("faction.slug"), nullable=True
    )
    # Parked v2 feature (SPEC-backend-architecture §9 "Intentional v2
    # deferrals"): Task Vision would let Ephemerists see retired tasks. The
    # column and its TaskDef writer stay so an era can mark tasks eligible;
    # nothing reads it yet and it is deliberately NOT on the wire (#1471) —
    # give it a reader before serialising it again.
    is_task_vision_eligible: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    praxes: Mapped[List["Praxis"]] = relationship(
        "Praxis", back_populates="task", lazy="raise"
    )

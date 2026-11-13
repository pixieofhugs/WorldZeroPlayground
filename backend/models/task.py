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
    # Admin "Delete" (#3305): the row stays, invisible to everyone but admins.
    deleted = "deleted"


class TaskType(enum.Enum):
    """A metatask is applied to another praxis as a flat bonus before multipliers."""

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
    # Proposer's note to the reviewing admin. Admin-only: never on public
    # ``TaskOut`` (#1823). Cap lives in ``schemas.task``.
    notes: Mapped[str] = mapped_column(
        Text, nullable=False, default="", server_default=""
    )
    created_by: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id"), nullable=False
    )
    # "na" = cross-faction. Slug PK (ADR-0038).
    primary_faction_slug: Mapped[str] = mapped_column(
        String, ForeignKey("faction.slug"), nullable=False, server_default="na"
    )
    # Metatasks only: which faction may apply it.
    metatask_faction_slug: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("faction.slug"), nullable=True
    )
    # Parked v2 Task Vision (SPEC-backend-architecture §10). No reader; keep
    # it off the wire until one exists (#1471).
    is_task_vision_eligible: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    # Identity for seed-owned rows (#3064); NULL otherwise. Lets
    # ``ensure_onboarding_task`` upsert by key, not title.
    seed_key: Mapped[Optional[str]] = mapped_column(
        String, nullable=True, unique=True
    )

    praxes: Mapped[List["Praxis"]] = relationship(
        "Praxis", back_populates="task", lazy="raise"
    )

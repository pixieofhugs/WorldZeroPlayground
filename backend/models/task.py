import enum
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, Identity, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base, string_enum
from models.mixins import TimestampMixin

if TYPE_CHECKING:
    from models.praxis import Praxis


class TaskStatus(enum.Enum):
    pending = "pending"
    active = "active"
    retired = "retired"
    # Admin "Delete" (#3305): the row stays, invisible to everyone but admins.
    deleted = "deleted"
    # Hidden from every list; only a ``reads_the_array`` faction may sign up while
    # its window is open (#3848). Settles to ``retired`` once it closes.
    backdoor = "backdoor"


class TaskType(enum.Enum):
    """A metatask is applied to another praxis as a flat bonus before multipliers."""

    standard = "standard"
    metatask = "metatask"


class Task(TimestampMixin, Base):
    __tablename__ = "task"
    __table_args__ = (
        CheckConstraint("point_value >= 0", name="point_value_nonnegative"),
        CheckConstraint(
            "(task_type = 'metatask') = (metatask_faction_slug IS NOT NULL)",
            name="metatask_faction_iff_metatask",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    point_value: Mapped[int] = mapped_column(Integer, nullable=False)
    level_required: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[TaskStatus] = mapped_column(
        string_enum(TaskStatus), default=TaskStatus.pending, nullable=False
    )
    task_type: Mapped[TaskType] = mapped_column(
        string_enum(TaskType),
        nullable=False,
        default=TaskType.standard,
        server_default="standard",
    )
    # Proposer's note to the reviewing admin. Admin-only: never on public
    # ``TaskOut`` (#1823). Cap lives in ``schemas.task``.
    notes: Mapped[str] = mapped_column(
        Text, nullable=False, default="", server_default=""
    )
    created_by_id: Mapped[int] = mapped_column(
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
    # Identity for seed-owned rows (#3064); NULL otherwise. Lets
    # ``ensure_onboarding_task`` upsert by key, not title.
    seed_key: Mapped[Optional[str]] = mapped_column(
        String, nullable=True, unique=True
    )

    # Backdoor window (#3848); both NULL unless status is ``backdoor``.
    backdoor_opens_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    backdoor_closes_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    praxes: Mapped[List["Praxis"]] = relationship(
        "Praxis", back_populates="task", lazy="raise"
    )

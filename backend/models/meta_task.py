import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base


class BonusType(enum.Enum):
    flat = "flat"
    percentage = "percentage"


class MetaTask(Base):
    __tablename__ = "meta_task"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    faction_slug: Mapped[str] = mapped_column(ForeignKey("faction.slug"), nullable=False)
    bonus_type: Mapped[BonusType] = mapped_column(Enum(BonusType), nullable=False)
    bonus_value: Mapped[float] = mapped_column(Float, nullable=False)
    level_required: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class SubmissionMetaTask(Base):
    __tablename__ = "submission_meta_task"

    submission_id: Mapped[int] = mapped_column(
        ForeignKey("submission.id"), primary_key=True
    )
    meta_task_id: Mapped[int] = mapped_column(
        ForeignKey("meta_task.id"), primary_key=True
    )
    applied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

import enum
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base

if TYPE_CHECKING:
    from models.character import Character
    from models.flag import Flag
    from models.task import Task
    from models.vote import Vote


class MediaType(enum.Enum):
    image = "image"
    video = "video"
    audio = "audio"


class ModerationStatus(enum.Enum):
    visible = "visible"
    flagged = "flagged"
    hidden = "hidden"
    failed = "failed"


class Praxis(Base):
    """Solo praxis (submission). Collaboration and duel submissions use models/collaboration.py."""

    __tablename__ = "praxis"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("task.id"), nullable=False)
    character_id: Mapped[int] = mapped_column(ForeignKey("character.id"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    body_text: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    moderation_status: Mapped[ModerationStatus] = mapped_column(
        Enum(ModerationStatus, create_type=False), nullable=False, server_default="visible"
    )
    is_withdrawn: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="false")
    admin_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # flagged_at is nullable: NULL means "not yet flagged" — semantic NULL, not missing data
    flagged_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    character: Mapped["Character"] = relationship(
        "Character",
        foreign_keys=[character_id],
        back_populates="praxes",
        lazy="selectin",
    )
    task: Mapped["Task"] = relationship(
        "Task", back_populates="praxes", lazy="selectin"
    )
    votes: Mapped[List["Vote"]] = relationship(
        "Vote",
        foreign_keys="Vote.praxis_id",
        back_populates="praxis",
        lazy="selectin",
    )
    media_items: Mapped[List["MediaItem"]] = relationship(
        "MediaItem",
        back_populates="praxis",
        order_by="MediaItem.display_order",
        lazy="selectin",
    )
    flags: Mapped[List["Flag"]] = relationship(
        "Flag", back_populates="praxis", lazy="selectin"
    )


class MediaItem(Base):
    __tablename__ = "media_item"

    id: Mapped[int] = mapped_column(primary_key=True)
    praxis_id: Mapped[int] = mapped_column(
        ForeignKey("praxis.id"), nullable=False
    )
    type: Mapped[MediaType] = mapped_column(Enum(MediaType, create_type=False), nullable=False)
    file_path: Mapped[str] = mapped_column(String, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    praxis: Mapped["Praxis"] = relationship(
        "Praxis", back_populates="media_items", lazy="raise"
    )

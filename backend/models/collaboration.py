import enum
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base

if TYPE_CHECKING:
    from models.character import Character
    from models.task import Task
    from models.vote import Vote


class CollaborationMode(enum.Enum):
    collaboration = "collaboration"
    duel = "duel"


class CollaborationStatus(enum.Enum):
    in_progress = "in_progress"
    published = "published"


class CollaborationInviteStatus(enum.Enum):
    pending = "pending"
    accepted = "accepted"
    declined = "declined"


class Collaboration(Base):
    __tablename__ = "collaboration"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("task.id"), nullable=False)
    mode: Mapped[CollaborationMode] = mapped_column(
        Enum(CollaborationMode, create_type=False), nullable=False
    )
    status: Mapped[CollaborationStatus] = mapped_column(
        Enum(CollaborationStatus, create_type=False),
        nullable=False,
        server_default="in_progress",
    )
    body_text: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    created_by_id: Mapped[int] = mapped_column(ForeignKey("character.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    task: Mapped["Task"] = relationship("Task", lazy="selectin")
    created_by: Mapped["Character"] = relationship(
        "Character", foreign_keys=[created_by_id], lazy="selectin"
    )
    members: Mapped[List["CollaborationMember"]] = relationship(
        "CollaborationMember",
        back_populates="collaboration",
        lazy="selectin",
        cascade="all, delete-orphan",
    )
    invites: Mapped[List["CollaborationInvite"]] = relationship(
        "CollaborationInvite",
        back_populates="collaboration",
        lazy="selectin",
        cascade="all, delete-orphan",
    )
    votes: Mapped[List["Vote"]] = relationship(
        "Vote",
        foreign_keys="Vote.collaboration_id",
        back_populates="collaboration",
        lazy="selectin",
    )


class CollaborationMember(Base):
    __tablename__ = "collaboration_member"
    __table_args__ = (UniqueConstraint("collaboration_id", "character_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    collaboration_id: Mapped[int] = mapped_column(
        ForeignKey("collaboration.id"), nullable=False
    )
    character_id: Mapped[int] = mapped_column(ForeignKey("character.id"), nullable=False)
    has_submitted: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    collaboration: Mapped["Collaboration"] = relationship(
        "Collaboration", back_populates="members", lazy="raise"
    )
    character: Mapped["Character"] = relationship("Character", lazy="selectin")


class CollaborationInvite(Base):
    __tablename__ = "collaboration_invite"

    id: Mapped[int] = mapped_column(primary_key=True)
    collaboration_id: Mapped[int] = mapped_column(
        ForeignKey("collaboration.id"), nullable=False
    )
    inviter_id: Mapped[int] = mapped_column(ForeignKey("character.id"), nullable=False)
    invitee_id: Mapped[int] = mapped_column(ForeignKey("character.id"), nullable=False)
    type: Mapped[CollaborationMode] = mapped_column(
        Enum(CollaborationMode, create_type=False), nullable=False
    )
    status: Mapped[CollaborationInviteStatus] = mapped_column(
        Enum(CollaborationInviteStatus, create_type=False),
        nullable=False,
        server_default="pending",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    collaboration: Mapped["Collaboration"] = relationship(
        "Collaboration", back_populates="invites", lazy="raise"
    )
    inviter: Mapped["Character"] = relationship(
        "Character", foreign_keys=[inviter_id], lazy="selectin"
    )
    invitee: Mapped["Character"] = relationship(
        "Character", foreign_keys=[invitee_id], lazy="selectin"
    )

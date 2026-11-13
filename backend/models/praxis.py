import enum
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Identity,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base
from models.mixins import CreatedAtMixin, TimestampMixin

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
    # Admin tombstone; comments only.
    deleted = "deleted"


# Earn no points and cannot win a duel (#1373, #1442). Shared by
# ``services.character_stats`` and ``services.duel_outcome`` so they can't drift.
UNSCORED_MODERATION_STATUSES: frozenset["ModerationStatus"] = frozenset(
    {ModerationStatus.hidden, ModerationStatus.failed}
)


class PraxisType(enum.Enum):
    solo = "solo"
    collab = "collab"
    duel = "duel"


class PraxisStatus(enum.Enum):
    in_progress = "in_progress"
    # Collab only (#590): some but not all members submitted.
    pending = "pending"
    submitted = "submitted"


class PraxisInviteStatus(enum.Enum):
    pending = "pending"
    accepted = "accepted"
    declined = "declined"


class Praxis(TimestampMixin, Base):
    __tablename__ = "praxis"

    __table_args__ = (
        Index("ix_praxis_created_by_id", "created_by_id"),
        Index("ix_praxis_task_id", "task_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    task_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("task.id"), nullable=False
    )
    type: Mapped[PraxisType] = mapped_column(
        Enum(PraxisType, create_type=False), nullable=False
    )
    status: Mapped[PraxisStatus] = mapped_column(
        Enum(PraxisStatus, create_type=False),
        nullable=False,
        default=PraxisStatus.in_progress,
        server_default="in_progress",
    )
    title: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    body_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    moderation_status: Mapped[ModerationStatus] = mapped_column(
        Enum(ModerationStatus, create_type=False),
        nullable=False,
        default=ModerationStatus.visible,
        server_default="visible",
    )
    admin_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    flagged_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Set once on seal.
    submitted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Collab pending-publish window (ADR-0012); cleared on edit.
    submit_proposed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_by_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id"), nullable=False
    )
    # Era sealed in, stamped by `_apply_seal`. Timestamps can't answer this at
    # the era boundary (see `duel.resolved_era_id`). No reader yet (#1345).
    era_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("era.id"), nullable=True
    )

    task: Mapped["Task"] = relationship(
        "Task", back_populates="praxes", lazy="selectin"
    )
    created_by: Mapped["Character"] = relationship(
        "Character",
        foreign_keys=[created_by_id],
        back_populates="praxes",
        lazy="selectin",
    )
    members: Mapped[List["PraxisMember"]] = relationship(
        "PraxisMember",
        back_populates="praxis",
        lazy="selectin",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    # Load-on-demand: use ``selectinload``; access on an unloaded Praxis raises.
    #
    # DELETE INVARIANT: ``delete-orphan`` + ``passive_deletes`` + DB CASCADE,
    # all load-bearing. Without delete-orphan a loaded collection is nulled
    # (NOT NULL violation); passive_deletes leaves unloaded ones to the DB.
    # ``kick_member``/``leave_praxis`` also rely on orphan removal.
    invites: Mapped[List["PraxisInvite"]] = relationship(
        "PraxisInvite",
        back_populates="praxis",
        lazy="raise",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    votes: Mapped[List["Vote"]] = relationship(
        "Vote",
        foreign_keys="Vote.praxis_id",
        back_populates="praxis",
        lazy="raise",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    media_items: Mapped[List["MediaItem"]] = relationship(
        "MediaItem",
        foreign_keys="MediaItem.praxis_id",
        back_populates="praxis",
        order_by="MediaItem.display_order",
        lazy="raise",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    flags: Mapped[List["Flag"]] = relationship(
        "Flag",
        foreign_keys="Flag.praxis_id",
        back_populates="praxis",
        lazy="raise",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class PraxisMember(Base):
    __tablename__ = "praxis_member"
    __table_args__ = (
        UniqueConstraint("praxis_id", "character_id", name="uq_praxis_member"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    # CASCADE: see ``MediaItem.praxis_id``.
    praxis_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("praxis.id", ondelete="CASCADE"), nullable=False
    )
    character_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id"), nullable=False
    )
    # Means APPROVAL of the live proposal (ADR-0079). All approved → publish;
    # any edit during a proposal clears all.
    has_submitted: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    # "My part is finished" (ADR-0079): social badge, gates nothing. Separate so
    # it survives what clears an approval.
    is_done: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    # When has_submitted last flipped True (#571); feed sorts by it.
    submitted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    # Per-member habit bonus (#1617), stamped by ``_apply_seal``. Stamped, not
    # derived, so every surface scores it the same. See ``services/habit_bonus.py``.
    habit_bonus_points: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )

    praxis: Mapped["Praxis"] = relationship(
        "Praxis", back_populates="members", lazy="raise"
    )
    character: Mapped["Character"] = relationship(
        "Character", lazy="selectin"
    )


class MediaItem(CreatedAtMixin, Base):
    __tablename__ = "media_item"

    __table_args__ = (Index("ix_media_item_praxis_id", "praxis_id"),)

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    # Reference note for every praxis-child FK's ON DELETE CASCADE: in the DB
    # so delete works for unloaded children without extra selectinloads.
    # Duel FKs deliberately lack it: a duel should refuse the delete.
    praxis_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("praxis.id", ondelete="CASCADE"), nullable=False
    )
    type: Mapped[MediaType] = mapped_column(
        Enum(MediaType, create_type=False), nullable=False
    )
    file_path: Mapped[str] = mapped_column(String, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    praxis: Mapped["Praxis"] = relationship(
        "Praxis", foreign_keys=[praxis_id], back_populates="media_items", lazy="raise"
    )


class PraxisInvite(CreatedAtMixin, Base):
    __tablename__ = "praxis_invite"

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    # CASCADE: see ``MediaItem.praxis_id``.
    praxis_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("praxis.id", ondelete="CASCADE"), nullable=False
    )
    inviter_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id"), nullable=False
    )
    invitee_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id"), nullable=False
    )
    status: Mapped[PraxisInviteStatus] = mapped_column(
        Enum(PraxisInviteStatus, create_type=False),
        nullable=False,
        server_default="pending",
    )

    praxis: Mapped["Praxis"] = relationship(
        "Praxis", back_populates="invites", lazy="raise"
    )
    # No ``inviter`` relationship on purpose (#1387); join on ``inviter_id``.
    invitee: Mapped["Character"] = relationship(
        "Character", foreign_keys=[invitee_id], lazy="selectin"
    )

import enum
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint, func
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
    # deleted: admin terminal tombstone. Comments use it; praxis never does.
    deleted = "deleted"


class PraxisType(enum.Enum):
    solo = "solo"
    collab = "collab"
    duel = "duel"


class PraxisStatus(enum.Enum):
    in_progress = "in_progress"
    # A collab mid-consensus (#590): at least one member submitted but not all.
    # Open, member-only and unscored like in_progress, but distinct so the UI/feed
    # can surface the pending-publish state. Solo/duel never enter it.
    pending = "pending"
    submitted = "submitted"


class PraxisInviteStatus(enum.Enum):
    pending = "pending"
    accepted = "accepted"
    declined = "declined"


class Praxis(TimestampMixin, Base):
    __tablename__ = "praxis"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("task.id"), nullable=False)
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
    # flagged_at is nullable: NULL means "not yet flagged" — semantic NULL, not missing data
    flagged_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # submitted_at is set once on the in_progress → submitted transition; NULL means not yet sealed
    submitted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # submit_proposed_at opens the collab pending-publish window (ADR-0012). Set when a
    # member submits but not all have; NULL means no window open. Cleared on edit / Live.
    submit_proposed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_by_id: Mapped[int] = mapped_column(ForeignKey("character.id"), nullable=False)

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
    )
    # invites, votes, media_items, and flags are load-on-demand. Only the
    # praxis detail view and admin-moderation flows read them, so the list
    # view (and most service-layer reads) do not pay for the joins. Call
    # sites that need them must use ``.options(selectinload(Praxis.foo))``;
    # accessing these attributes on an un-loaded Praxis raises.
    #
    # CASCADE INVARIANT: any relationship declared with
    # ``cascade='all, delete-orphan'`` MUST be eagerly loaded wherever
    # ``session.delete(praxis)`` is called (see ``services/praxis.get_praxis``).
    # Otherwise SQLAlchemy cannot cascade the delete and the orphaned rows
    # remain. If you add a new cascade, update ``get_praxis`` to selectin-load
    # it too.
    invites: Mapped[List["PraxisInvite"]] = relationship(
        "PraxisInvite",
        back_populates="praxis",
        lazy="raise",
        cascade="all, delete-orphan",
    )
    votes: Mapped[List["Vote"]] = relationship(
        "Vote",
        foreign_keys="Vote.praxis_id",
        back_populates="praxis",
        lazy="raise",
    )
    media_items: Mapped[List["MediaItem"]] = relationship(
        "MediaItem",
        foreign_keys="MediaItem.praxis_id",
        back_populates="praxis",
        order_by="MediaItem.display_order",
        lazy="raise",
    )
    flags: Mapped[List["Flag"]] = relationship(
        "Flag",
        foreign_keys="Flag.praxis_id",
        back_populates="praxis",
        lazy="raise",
    )


class PraxisMember(Base):
    __tablename__ = "praxis_member"
    __table_args__ = (
        UniqueConstraint("praxis_id", "character_id", name="uq_praxis_member"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    praxis_id: Mapped[int] = mapped_column(ForeignKey("praxis.id"), nullable=False)
    character_id: Mapped[int] = mapped_column(ForeignKey("character.id"), nullable=False)
    has_submitted: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    # When has_submitted last flipped True (#571). The collaborator-submitted feed
    # sorts strictly by this, not joined_at. NULL = never submitted / pulled back.
    submitted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    praxis: Mapped["Praxis"] = relationship(
        "Praxis", back_populates="members", lazy="raise"
    )
    character: Mapped["Character"] = relationship(
        "Character", lazy="selectin"
    )


class MediaItem(CreatedAtMixin, Base):
    __tablename__ = "media_item"

    id: Mapped[int] = mapped_column(primary_key=True)
    praxis_id: Mapped[int] = mapped_column(ForeignKey("praxis.id"), nullable=False)
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

    id: Mapped[int] = mapped_column(primary_key=True)
    praxis_id: Mapped[int] = mapped_column(ForeignKey("praxis.id"), nullable=False)
    inviter_id: Mapped[int] = mapped_column(ForeignKey("character.id"), nullable=False)
    invitee_id: Mapped[int] = mapped_column(ForeignKey("character.id"), nullable=False)
    status: Mapped[PraxisInviteStatus] = mapped_column(
        Enum(PraxisInviteStatus, create_type=False),
        nullable=False,
        server_default="pending",
    )

    praxis: Mapped["Praxis"] = relationship(
        "Praxis", back_populates="invites", lazy="raise"
    )
    inviter: Mapped["Character"] = relationship(
        "Character", foreign_keys=[inviter_id], lazy="selectin"
    )
    invitee: Mapped["Character"] = relationship(
        "Character", foreign_keys=[invitee_id], lazy="selectin"
    )

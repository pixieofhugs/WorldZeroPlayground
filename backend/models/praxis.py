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
    # deleted: admin terminal tombstone. Comments use it; praxis never does.
    deleted = "deleted"


# Moderation states that earn nobody points (#1373) — and, because of that, that
# cannot win a duel (#1442). ``hidden`` is off the site entirely; ``failed`` is an
# admin ruling that the work was not done, so it keeps its banner and its place in
# the feed but banks nothing. It lives beside the enum because two layers read it
# and must not drift: the scoring gather (``services.character_stats``) leaves
# these praxes out, and the duel outcome rule
# (``services.duel_outcome.duel_winner``) refuses to let one win. It mirrors the
# accepted set in ``services.character``'s Albescent-unlock query, which has always
# counted only ``visible`` + ``flagged`` — a flagged praxis is merely *awaiting* a
# ruling.
UNSCORED_MODERATION_STATUSES: frozenset["ModerationStatus"] = frozenset(
    {ModerationStatus.hidden, ModerationStatus.failed}
)


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

    __table_args__ = (
        # The stats recalc gathers every praxis by author after each vote, and
        # the board reads praxes per task on list, tally and signup count
        # (#1393).
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
    created_by_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id"), nullable=False
    )
    # The era this praxis was SEALED in — stamped alongside `submitted_at` on the
    # transition to `submitted` (`services/collab_consensus._apply_seal`, the one
    # writer of both). NULL while the praxis is still open, and NULL forever on
    # any praxis sealed before this column existed.
    #
    # It exists because "which era does this score belong to?" cannot be answered
    # from `submitted_at`: an era reset inserts the new `Era` row inside the same
    # transaction that closes the old one (`services/era.apply_era_reset`), so a
    # timestamp comparison against `era.started_at` sits a hair on the wrong side
    # of the boundary — the same trap `duel.resolved_era_id` was added for
    # (#823). #1345's era-bounded score recalculation becomes a WHERE clause on
    # this column instead of a timestamp range; that fix rides its own PR, so
    # nothing reads this column yet.
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

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    praxis_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("praxis.id"), nullable=False
    )
    character_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id"), nullable=False
    )
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
    # The habit bonus this member earned on this praxis (#1617) — flat points,
    # stamped at seal time beside ``Praxis.submitted_at`` / ``Praxis.era_id`` by
    # ``services.collab_consensus._apply_seal``, the one writer of all three.
    #
    # It lives on the MEMBER, not on the praxis, because a collab seals once for
    # the group but the bonus is per member: each is measured against their OWN
    # praxis history, so three members of one collab can legitimately hold three
    # different values. Solo and duel praxes have exactly one member — their
    # author — so those lose nothing by the move.
    #
    # STAMPED rather than derived on read because
    # ``services.praxis_scoring.compute_contributions`` has two callers holding
    # DIFFERENT praxis sets (a character's whole history vs. one page of a
    # feed), and a read-time derivation would score the same praxis differently
    # depending on which surface asked. See ``services/habit_bonus.py``.
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

    # Selectin-loaded on every praxis detail, plus the display-order max on
    # upload (#1393).
    __table_args__ = (Index("ix_media_item_praxis_id", "praxis_id"),)

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    praxis_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("praxis.id"), nullable=False
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
    praxis_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("praxis.id"), nullable=False
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
    # No ``inviter`` relationship: its only reader was the dead
    # ``PraxisInviteOut.inviter_display_name`` (#1387), and it was ``selectin``,
    # so every invite load paid a SELECT for it. ``inviter_id`` stays on the
    # wire, and the feed joins Character on that column directly
    # (``services.activity_feed``). ``foreign_keys`` stays on ``invitee``
    # because this table has two FKs into character.id.
    invitee: Mapped["Character"] = relationship(
        "Character", foreign_keys=[invitee_id], lazy="selectin"
    )

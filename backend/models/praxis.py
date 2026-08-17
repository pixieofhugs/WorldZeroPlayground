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
        passive_deletes=True,
    )
    # invites, votes, media_items, and flags are load-on-demand. Only the
    # praxis detail view and admin-moderation flows read them, so the list
    # view (and most service-layer reads) do not pay for the joins. Call
    # sites that need them must use ``.options(selectinload(Praxis.foo))``;
    # accessing these attributes on an un-loaded Praxis raises.
    #
    # DELETE INVARIANT: every collection here is ``cascade='all, delete-orphan'``
    # + ``passive_deletes=True``, and every FK behind them is ``ON DELETE
    # CASCADE`` (see ``MediaItem.praxis_id``). Both halves are load-bearing, and
    # they answer different halves of the question:
    #
    # * ``delete-orphan`` says what a child *is* — a part of the praxis, not an
    #   independent row that outlives it. Without it SQLAlchemy's default for a
    #   loaded collection is to de-associate: ``UPDATE ... SET praxis_id = NULL``,
    #   which is what "drop task" used to write into ``media_item``'s NOT NULL
    #   column. ``passive_deletes=True`` does NOT prevent that on its own — it
    #   stops SQLAlchemy *loading* a collection in order to null it, but a
    #   collection already in the session (``get_praxis`` selectin-loads
    #   ``media_items`` for the detail view) is still processed.
    # * ``passive_deletes=True`` then says the database will handle the children
    #   SQLAlchemy has *not* loaded, so ``lazy='raise'`` collections are left
    #   alone instead of being fetched to be deleted one by one.
    #
    # ``members`` and ``invites`` additionally rely on orphan-removal in place —
    # ``kick_member`` and ``leave_praxis`` do ``praxis.members.remove(...)`` and
    # expect the DELETE to follow. That is a separate mechanism from the
    # parent-delete one and is unaffected by ``passive_deletes``.
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
    # ON DELETE CASCADE — see the note on ``MediaItem.praxis_id``.
    praxis_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("praxis.id", ondelete="CASCADE"), nullable=False
    )
    character_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id"), nullable=False
    )
    # APPROVAL, since ADR-0079: this member is happy with the text of the live
    # proposal. It keeps the old name because it is also the wire field and the
    # feed's column, and because approval is the meaning that stayed when
    # ``has_submitted``'s three jobs were split — the social half moved to
    # ``is_done`` below, and the proposal itself lives on
    # ``Praxis.submit_proposed_at``. All members approved → the collab publishes;
    # any edit while a proposal is live clears every one of these.
    has_submitted: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    # DONE (ADR-0079): "my part is finished." Purely social — a roster badge,
    # freely reversible, gating nothing and starting nothing. It is a separate
    # column rather than a third meaning on ``has_submitted`` precisely because it
    # must survive the things that clear an approval: an edit, a Withdraw and a
    # kick all say the *group* is not ready to publish, and none of them says a
    # member's own part became unfinished.
    is_done: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    # When has_submitted last flipped True (#571). The collaborator-submitted feed
    # sorts strictly by this, not joined_at. NULL = never approved / cancelled.
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
    # ON DELETE CASCADE, and the reference note for every other FK into
    # ``praxis.id`` that carries it (comment, flag, nudge, praxis_meta_task,
    # praxis_member, praxis_invite, vote).
    #
    # Deleting a praxis used to be impossible once anything hung off it. Every
    # one of these FKs was NO ACTION, so ``session.delete(praxis)`` in
    # ``services.praxis.delete_praxis`` either hit a foreign-key violation (for
    # a child the session had not loaded) or — for THIS column, which
    # ``get_praxis`` eagerly loads for the detail view and which has no
    # ``delete-orphan`` cascade — made SQLAlchemy try to de-associate the child
    # by writing ``praxis_id = NULL``, straight into this NOT NULL. Players got
    # a raw asyncpg not-null violation from "drop task" and the drop silently
    # failed.
    #
    # The rule is in the DB rather than in eight ``cascade='all,
    # delete-orphan'`` declarations because those only fire for collections the
    # session has already loaded — which would mean six more ``selectinload``s
    # in ``get_praxis``, paid by every praxis *detail view*, to make delete
    # work. The FK covers every caller and costs no reads.
    #
    # ``duel.challenger_praxis_id`` / ``opponent_praxis_id`` are deliberately
    # NOT in the set: a duel is a contract between two players, not a part of
    # either side, and it should refuse the delete rather than vanish with it.
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
    # ON DELETE CASCADE — see the note on ``MediaItem.praxis_id``.
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
    # No ``inviter`` relationship: its only reader was the dead
    # ``PraxisInviteOut.inviter_display_name`` (#1387), and it was ``selectin``,
    # so every invite load paid a SELECT for it. ``inviter_id`` stays on the
    # wire, and the feed joins Character on that column directly
    # (``services.activity_feed``). ``foreign_keys`` stays on ``invitee``
    # because this table has two FKs into character.id.
    invitee: Mapped["Character"] = relationship(
        "Character", foreign_keys=[invitee_id], lazy="selectin"
    )

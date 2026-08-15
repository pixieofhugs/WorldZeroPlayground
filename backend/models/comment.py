from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Enum,
    ForeignKey,
    Identity,
    Index,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base
from models.mixins import TimestampMixin
from models.praxis import ModerationStatus

if TYPE_CHECKING:
    from models.character import Character

# API trust-boundary cap on comment length (ADR-0006). Enforced in the service,
# not the DB — a CHECK on a Text column buys nothing the service doesn't.
#
# 500 is the number every design sheet shows, and #1205 made it the single cap
# governing composer / editor / API alike (it was 2000 here and unset in the
# composer). Lowering it needs NO migration: `body_text` is Text, so the cap is
# a validation rule on writes, never a column width.
#
# It constrains WRITES only — `CommentOut.body_text` is an uncapped `str`, so a
# comment stored before this cap existed stays fully readable at any length. An
# over-length body also stays editable: the client seeds the editor with it and
# blocks saving until it is trimmed under the cap, so the author trims their own
# words rather than having them truncated for them.
MAX_COMMENT_BODY = 500


class Comment(TimestampMixin, Base):
    """A flat, actor-scoped reaction attached to exactly one of a praxis or a task.

    "Belongs to exactly one of {praxis, task}" is a DB invariant (CHECK), not a
    convention — mirrors how Vote/Flag hang off the praxis with partial constraints
    (ADR-0006).
    """

    __tablename__ = "comment"
    __table_args__ = (
        CheckConstraint(
            # Bare name: models/base.py's `ck_` convention prefixes the table,
            # so this still lands as `ck_comment_one_target`.
            "num_nonnulls(praxis_id, task_id) = 1", name="one_target"
        ),
        # One thread per target, read whenever a praxis or task is opened
        # (`services/comment.py`) — two partial-ish lookups, two indexes (#1393).
        Index("ix_comment_praxis_id", "praxis_id"),
        Index("ix_comment_task_id", "task_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    # ON DELETE CASCADE: a comment on a praxis is part of that praxis. See the
    # note on ``MediaItem.praxis_id`` for why every such FK carries it.
    praxis_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("praxis.id", ondelete="CASCADE"), nullable=True
    )
    task_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("task.id"), nullable=True
    )
    created_by_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id"), nullable=False
    )
    body_text: Mapped[str] = mapped_column(Text, nullable=False)
    # is_edited is a marker, not a timestamp — the "edited" slot needs only the fact.
    # Deliberately not derived from updated_at, which also moves on moderation.
    is_edited: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    is_withdrawn: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    moderation_status: Mapped[ModerationStatus] = mapped_column(
        Enum(ModerationStatus, create_type=False),
        nullable=False,
        default=ModerationStatus.visible,
        server_default="visible",
    )

    created_by: Mapped["Character"] = relationship(
        "Character", foreign_keys=[created_by_id], lazy="selectin"
    )
    mentions: Mapped[List["CommentMention"]] = relationship(
        "CommentMention",
        back_populates="comment",
        lazy="selectin",
        cascade="all, delete-orphan",
    )


class CommentMention(Base):
    """Recipient-queryable @mention edge. Written on create, reconciled on edit.

    The activity feed is a read-time aggregator with no events table, so mentions
    must be queryable by recipient — hence a join table rather than parsing bodies
    at feed time (ADR-0006).
    """

    __tablename__ = "comment_mention"
    __table_args__ = (
        UniqueConstraint(
            "comment_id", "mentioned_character_id", name="uq_comment_mention"
        ),
        # The activity feed's mention source reads by *recipient* (#1393), which
        # is the trailing column of the unique constraint above and so cannot
        # use its index.
        Index("ix_comment_mention_mentioned_character_id", "mentioned_character_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    comment_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("comment.id"), nullable=False
    )
    mentioned_character_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id"), nullable=False
    )

    comment: Mapped["Comment"] = relationship(
        "Comment", back_populates="mentions", lazy="raise"
    )
    mentioned_character: Mapped["Character"] = relationship(
        "Character", foreign_keys=[mentioned_character_id], lazy="selectin"
    )

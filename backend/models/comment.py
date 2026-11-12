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

# Write-only cap, enforced in the service (ADR-0006, #1205); reads are uncapped
# so older long comments stay readable. Changing it needs no migration.
MAX_COMMENT_BODY = 500


class Comment(TimestampMixin, Base):
    """A flat reaction on exactly one of a praxis or a task (CHECK; ADR-0006)."""

    __tablename__ = "comment"
    __table_args__ = (
        CheckConstraint(
            # Bare name; see models/base.py.
            "num_nonnulls(praxis_id, task_id) = 1", name="one_target"
        ),
        Index("ix_comment_praxis_id", "praxis_id"),
        Index("ix_comment_task_id", "task_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    # CASCADE: see ``MediaItem.praxis_id``.
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
    # Not derived from updated_at, which also moves on moderation.
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
    """@mention edge, queryable by recipient for the activity feed (ADR-0006)."""

    __tablename__ = "comment_mention"
    __table_args__ = (
        UniqueConstraint(
            "comment_id", "mentioned_character_id", name="uq_comment_mention"
        ),
        # Feed reads by recipient: the unique index's trailing column.
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

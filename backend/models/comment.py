from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, CheckConstraint, Enum, ForeignKey, Text, UniqueConstraint
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
            "num_nonnulls(praxis_id, task_id) = 1", name="ck_comment_one_target"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    praxis_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("praxis.id"), nullable=True
    )
    task_id: Mapped[Optional[int]] = mapped_column(ForeignKey("task.id"), nullable=True)
    created_by_id: Mapped[int] = mapped_column(
        ForeignKey("character.id"), nullable=False
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
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    comment_id: Mapped[int] = mapped_column(ForeignKey("comment.id"), nullable=False)
    mentioned_character_id: Mapped[int] = mapped_column(
        ForeignKey("character.id"), nullable=False
    )

    comment: Mapped["Comment"] = relationship(
        "Comment", back_populates="mentions", lazy="raise"
    )
    mentioned_character: Mapped["Character"] = relationship(
        "Character", foreign_keys=[mentioned_character_id], lazy="selectin"
    )

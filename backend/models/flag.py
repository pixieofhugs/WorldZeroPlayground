import enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import CheckConstraint, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base
from models.mixins import CreatedAtMixin

if TYPE_CHECKING:
    from models.praxis import Praxis


# Trust-boundary cap for the free-text note carried by FlagReason.other.
MAX_FLAG_REASON_DETAIL = 500


class FlagReason(enum.Enum):
    """Fixed, shared flag-reason vocabulary (ADR-0031).

    One flat list for praxis and comment flags alike, validated at the API
    trust boundary. The set is additive: new reasons are a one-line addition
    here with no migration — ``Flag.reason`` stays a plain text column.
    """

    spam = "spam"
    harassment = "harassment"
    nsfw = "nsfw"
    slop = "slop"
    other = "other"


def stored_flag_reason(reason: "FlagReason", reason_detail: Optional[str]) -> str:
    """What to persist in ``Flag.reason`` for a validated flag (ADR-0031).

    The four named reasons store their enum key. ``other`` folds the flagger's
    free-text note into the column — read-side normalization already maps any
    non-enum value back to ``other`` (the same path legacy free-text rows take),
    so no separate detail column or migration is needed and no signal is lost.
    """
    if reason is FlagReason.other and reason_detail and reason_detail.strip():
        return reason_detail.strip()
    return reason.value


def normalize_flag_reason(raw: str) -> tuple["FlagReason", Optional[str]]:
    """Map a stored ``Flag.reason`` string onto the vocabulary (ADR-0031).

    Enum keys map to themselves. Anything else — legacy free text, an ``other``
    note, or the pre-enum ``server_default=""`` — renders as ``other`` with the
    raw text preserved as the detail.
    """
    try:
        return FlagReason(raw), None
    except ValueError:
        return FlagReason.other, raw or None


class Flag(CreatedAtMixin, Base):
    """Moderation flag against exactly one of a praxis or a comment (ADR-0006).

    Same two-target pattern as Comment: ``praxis_id`` and ``comment_id`` are both
    nullable with a CHECK that exactly one is set.
    """

    __tablename__ = "flag"
    __table_args__ = (
        CheckConstraint(
            "num_nonnulls(praxis_id, comment_id) = 1", name="ck_flag_one_target"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    praxis_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("praxis.id"), nullable=True
    )
    comment_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("comment.id"), nullable=True
    )
    flagged_by: Mapped[int] = mapped_column(ForeignKey("character.id"), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False, server_default="")

    praxis: Mapped[Optional["Praxis"]] = relationship(
        "Praxis", back_populates="flags", lazy="raise"
    )

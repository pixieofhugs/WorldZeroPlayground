"""One player poking another to file their part of a shared praxis (#1083).

Delivered via the activity feed. ``praxis_id`` is the praxis the RECIPIENT owes,
never the sender's (in a duel the sender's side is hidden, #999). One nudge per
sender/recipient/praxis per 24h is an anti-harassment control.
"""

from sqlalchemy import BigInteger, ForeignKey, Identity, Index
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base
from models.mixins import CreatedAtMixin


class Nudge(CreatedAtMixin, Base):
    __tablename__ = "nudge"

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    from_character_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id"), nullable=False
    )
    to_character_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id"), nullable=False
    )
    # Recipient's praxis. CASCADE: see ``MediaItem.praxis_id``.
    praxis_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("praxis.id", ondelete="CASCADE"), nullable=False
    )

    __table_args__ = (
        # Serves the rate-limit probe and the roster's `nudged_at` lookup.
        Index(
            "ix_nudge_sender_recipient_praxis",
            "from_character_id",
            "to_character_id",
            "praxis_id",
            "created_at",
        ),
        Index("ix_nudge_recipient_created", "to_character_id", "created_at"),
    )

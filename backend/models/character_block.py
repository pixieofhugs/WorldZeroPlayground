"""The block record (ADR-0077), independent of the friend/foe edge.

Only the blocker writes it; enforcement reads both directions. Survives era
reset. No ORM relationship, so DB CASCADE is the only delete path; adding one
needs ``delete-orphan`` + ``passive_deletes``.
"""
from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, Identity, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base
from models.mixins import CreatedAtMixin


class CharacterBlock(CreatedAtMixin, Base):
    __tablename__ = "character_block"
    __table_args__ = (
        UniqueConstraint("blocker_character_id", "blocked_character_id"),
        CheckConstraint(
            "blocker_character_id <> blocked_character_id", name="no_self_block"
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    blocker_character_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id", ondelete="CASCADE"), nullable=False
    )
    blocked_character_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id", ondelete="CASCADE"), nullable=False
    )

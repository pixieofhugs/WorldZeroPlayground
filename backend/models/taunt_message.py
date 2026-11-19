import enum

from sqlalchemy import BigInteger, ForeignKey, Identity, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base, string_enum
from models.mixins import CreatedAtMixin


class TauntTriggerType(enum.Enum):
    score_overtake = "score_overtake"
    level_up = "level_up"
    praxis_complete = "praxis_complete"


class TauntMessage(CreatedAtMixin, Base):
    __tablename__ = "taunt_message"
    __table_args__ = (Index("ix_taunt_message_to_character_id", "to_character_id"),)

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    from_character_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id"), nullable=False
    )
    to_character_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id"), nullable=False
    )
    # ADR-0031: no prose stored. Freezes the sender's send-time faction voice.
    faction_slug: Mapped[str] = mapped_column(String, nullable=False)
    trigger_type: Mapped[TauntTriggerType] = mapped_column(
        string_enum(TauntTriggerType), nullable=False
    )

import enum

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base
from models.mixins import CreatedAtMixin


class TauntTriggerType(enum.Enum):
    score_overtake = "score_overtake"
    level_up = "level_up"
    praxis_complete = "praxis_complete"


class TauntMessage(CreatedAtMixin, Base):
    __tablename__ = "taunt_message"

    id: Mapped[int] = mapped_column(primary_key=True)
    from_character_id: Mapped[int] = mapped_column(
        ForeignKey("character.id"), nullable=False
    )
    to_character_id: Mapped[int] = mapped_column(
        ForeignKey("character.id"), nullable=False
    )
    # ADR-0031: no rendered prose is stored. faction_slug freezes the sender's
    # send-time faction voice (senders can defect later); the frontend catalog
    # resolves (faction_slug, trigger_type) -> taunt copy, picking the variant
    # deterministically from the row id and interpolating the FK-derived names.
    faction_slug: Mapped[str] = mapped_column(String, nullable=False)
    trigger_type: Mapped[TauntTriggerType] = mapped_column(
        Enum(TauntTriggerType, create_type=False), nullable=False
    )

import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base


class TauntTriggerType(enum.Enum):
    score_overtake = "score_overtake"
    level_up = "level_up"
    submission_complete = "submission_complete"


class TauntMessage(Base):
    __tablename__ = "taunt_message"

    id: Mapped[int] = mapped_column(primary_key=True)
    from_character_id: Mapped[int] = mapped_column(
        ForeignKey("character.id"), nullable=False
    )
    to_character_id: Mapped[int] = mapped_column(
        ForeignKey("character.id"), nullable=False
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    trigger_type: Mapped[TauntTriggerType] = mapped_column(
        Enum(TauntTriggerType), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

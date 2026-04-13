import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base


class RelationshipType(enum.Enum):
    friend = "friend"
    foe = "foe"


class RelationshipStatus(enum.Enum):
    active = "active"
    blocked = "blocked"


class Relationship(Base):
    __tablename__ = "relationship"
    __table_args__ = (UniqueConstraint("from_character_id", "to_character_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    from_character_id: Mapped[int] = mapped_column(
        ForeignKey("character.id"), nullable=False
    )
    to_character_id: Mapped[int] = mapped_column(
        ForeignKey("character.id"), nullable=False
    )
    type: Mapped[RelationshipType] = mapped_column(
        Enum(RelationshipType), nullable=False
    )
    status: Mapped[RelationshipStatus] = mapped_column(
        Enum(RelationshipStatus), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

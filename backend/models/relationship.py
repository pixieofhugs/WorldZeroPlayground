import enum

from sqlalchemy import BigInteger, Enum, ForeignKey, Identity, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base
from models.mixins import TimestampMixin


class RelationshipType(enum.Enum):
    friend = "friend"
    foe = "foe"


class RelationshipStatus(enum.Enum):
    active = "active"
    blocked = "blocked"


class Relationship(TimestampMixin, Base):
    __tablename__ = "relationship"
    __table_args__ = (UniqueConstraint("from_character_id", "to_character_id"),)

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    from_character_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id"), nullable=False
    )
    to_character_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id"), nullable=False
    )
    type: Mapped[RelationshipType] = mapped_column(
        Enum(RelationshipType, create_type=False), nullable=False
    )
    status: Mapped[RelationshipStatus] = mapped_column(
        Enum(RelationshipStatus, create_type=False), nullable=False
    )

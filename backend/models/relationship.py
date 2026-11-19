import enum

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    ForeignKey,
    Identity,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base, string_enum
from models.mixins import TimestampMixin


class RelationshipType(enum.Enum):
    friend = "friend"
    foe = "foe"


class Relationship(TimestampMixin, Base):
    __tablename__ = "relationship"
    __table_args__ = (
        UniqueConstraint("from_character_id", "to_character_id"),
        Index("ix_relationship_to_character_id", "to_character_id"),
        CheckConstraint(
            "from_character_id <> to_character_id", name="no_self_relationship"
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    from_character_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id"), nullable=False
    )
    to_character_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id"), nullable=False
    )
    type: Mapped[RelationshipType] = mapped_column(
        string_enum(RelationshipType), nullable=False
    )

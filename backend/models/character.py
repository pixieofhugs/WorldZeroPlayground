import enum
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    BigInteger,
    DateTime,
    Enum,
    ForeignKey,
    Identity,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base
from models.mixins import TimestampMixin

if TYPE_CHECKING:
    from models.account import Account
    from models.praxis import Praxis


class CharacterStatus(enum.Enum):
    """A life is either playable or banned."""

    active = "active"
    banned = "banned"


class Character(TimestampMixin, Base):
    __tablename__ = "character"

    # The roster reads by account on nearly every authenticated request.
    __table_args__ = (Index("ix_character_account_id", "account_id"),)

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    account_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("account.id"), nullable=False
    )
    username: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    bio: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    # Profile-header slogan (#1628); not a short bio, never backfilled from it.
    tagline: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    avatar_url: Mapped[str] = mapped_column(String, nullable=False, server_default="")
    location: Mapped[str] = mapped_column(String(3), nullable=False, server_default="")
    # Live rule is era.starting_faction_slug; this DDL default is only a
    # backstop for direct inserts (ADR-0019). String FK: slug PK (ADR-0038).
    faction_slug: Mapped[str] = mapped_column(
        String, ForeignKey("faction.slug"), nullable=False, server_default="na"
    )
    status: Mapped[CharacterStatus] = mapped_column(
        Enum(CharacterStatus, create_type=False), nullable=False, default=CharacterStatus.active
    )
    # Player ended this life (#1577); status is also ``banned``. Not a status
    # value so every "not playable" read keeps working. Written only by
    # ``soft_delete_character``; ``apply_ban`` refuses to un-ban it.
    departed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Highest level ever, any era (#3102); era reset can't erase it. Monotonic;
    # one writer: ``services.character.record_level_reached``.
    peak_level: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    # Scores and levels live in CharacterStats.

    account: Mapped["Account"] = relationship(
        "Account",
        back_populates="characters",
        lazy="raise",
        foreign_keys="Character.account_id",
    )
    praxes: Mapped[List["Praxis"]] = relationship(
        "Praxis",
        back_populates="created_by",
        foreign_keys="Praxis.created_by_id",
        lazy="raise",
    )

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Identity,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base


class InvitationLetter(Base):
    """Faction invitation letters delivered to a character, per era (ADR-0022).

    Delivered by ``services.character_stats``; idempotent on the unique key.
    """

    __tablename__ = "invitation_letter"
    __table_args__ = (
        UniqueConstraint("character_id", "faction_slug", "era_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    character_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id"), nullable=False
    )
    # Slug PK (ADR-0038).
    faction_slug: Mapped[str] = mapped_column(
        String, ForeignKey("faction.slug"), nullable=False
    )
    era_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("era.id"), nullable=False
    )
    delivered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

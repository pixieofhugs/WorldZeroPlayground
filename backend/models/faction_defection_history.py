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


class FactionDefectionHistory(Base):
    """Each faction a character left, per era; blocks rejoining.

    Never deleted: readers filter by era, so era reset starts fresh (#1372).
    """

    __tablename__ = "faction_defection_history"
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
    defected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

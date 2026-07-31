from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base


class FactionDefectionHistory(Base):
    """Records each faction a character has left, scoped to an era.

    Used to enforce the rule that players cannot rejoin factions they have
    defected from (with exceptions for factions where can_always_rejoin is True).

    Rows are **retained** across an era reset — nothing is ever deleted here.
    The reset's fresh start on the join gate comes from era scoping, not from a
    purge: every reader filters on the era in hand
    (:func:`services.faction_service.can_join_faction`,
    :func:`services.faction_service.get_defection_history`, and the
    activity feed), so a prior era's rows can never gate a new-era join (#1372).
    """

    __tablename__ = "faction_defection_history"
    __table_args__ = (
        UniqueConstraint("character_id", "faction_slug", "era_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    character_id: Mapped[int] = mapped_column(
        ForeignKey("character.id"), nullable=False
    )
    faction_slug: Mapped[str] = mapped_column(
        ForeignKey("faction.slug"), nullable=False
    )
    era_id: Mapped[int] = mapped_column(
        ForeignKey("era.id"), nullable=False
    )
    defected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

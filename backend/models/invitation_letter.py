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
    """Tracks which faction invitation letters have been delivered to a character.

    Delivery rule (ADR-0022): a character earns faction X's invitation once it has
    completed ``era.invitation_task_threshold`` tasks for X *and* earned
    ``era.invitation_point_threshold`` points from X's tasks — both per-character,
    faction-scoped, era-scoped (the old level>=3 / score>=20 / "pledge allegiance"
    conditions are retired). Delivered in ``services.character_stats`` after a praxis
    is scored; idempotent on the (character, faction, era) unique key. Letters are
    era-scoped and surface in the player's update feed.
    """

    __tablename__ = "invitation_letter"
    __table_args__ = (
        UniqueConstraint("character_id", "faction_slug", "era_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    character_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id"), nullable=False
    )
    # String FK: faction's primary key is its slug (ADR-0038), not an integer.
    faction_slug: Mapped[str] = mapped_column(
        String, ForeignKey("faction.slug"), nullable=False
    )
    era_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("era.id"), nullable=False
    )
    delivered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

"""Per-account secret-faction stamps (ADR-0097). Keyed by slug, not era, so a
later era with the same secret faction inherits them. Written only by
``services.secret_faction``."""

from sqlalchemy import BigInteger, Boolean, ForeignKey, Identity, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base


class AccountSecretFaction(Base):
    __tablename__ = "account_secret_faction"
    __table_args__ = (UniqueConstraint("account_id", "faction_slug"),)

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    account_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("account.id", ondelete="CASCADE"), nullable=False
    )
    # No FK to faction: a retired faction's stamps must outlive its row.
    faction_slug: Mapped[str] = mapped_column(String, nullable=False)
    revealed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    unlocked: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    glimpsed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )

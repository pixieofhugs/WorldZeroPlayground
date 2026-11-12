from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Identity, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base


class Era(Base):
    __tablename__ = "era"

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    #: Fallback only, when ``config_key`` matches no config (#1623). Not dead.
    name: Mapped[str] = mapped_column(String, nullable=False)
    #: Links to the EraConfig. On the latest row it chooses the live ruleset
    #: (ADR-0091); an unregistered key falls back to the compile-time era.
    config_key: Mapped[str] = mapped_column(String, nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    started_by: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("account.id"), nullable=False
    )
    notes: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

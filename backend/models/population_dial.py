"""A population dial's side; a missing row means the era default (ADR-0042)."""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base


class PopulationDial(Base):
    __tablename__ = "population_dial"

    dial_key: Mapped[str] = mapped_column(String(64), primary_key=True)
    side: Mapped[str] = mapped_column(String(8), nullable=False)
    updated_by_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("account.id"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

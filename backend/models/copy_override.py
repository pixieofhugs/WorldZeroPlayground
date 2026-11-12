"""Admin overrides layered over the frontend i18n catalogs at boot.

A row is a diff against the bundle; deleting it reverts. English-only, no
versioning: a write is live on next page load.
"""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base


class CopyOverride(Base):
    __tablename__ = "copy_override"

    #: i18next namespace.
    ns: Mapped[str] = mapped_column(String(64), primary_key=True)
    #: Dotted key, unvalidated: the backend can't know which keys exist.
    key: Mapped[str] = mapped_column(String(255), primary_key=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    #: Audit trail.
    updated_by: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("account.id"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

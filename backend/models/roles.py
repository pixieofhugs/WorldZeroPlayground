from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Identity, String, func
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base
from models.mixins import TimestampMixin


class Role(TimestampMixin, Base):
    __tablename__ = "role"

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False, server_default="")


class AccountRole(Base):
    __tablename__ = "account_role"

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    account_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("account.id"), nullable=False
    )
    role_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("role.id"), nullable=False
    )
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    granted_by: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("account.id"), nullable=False
    )

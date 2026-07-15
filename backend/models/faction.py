import enum

from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base
from models.mixins import TimestampMixin


class FactionStatus(enum.Enum):
    visible = "visible"
    hidden = "hidden"
    deprecated = "deprecated"


class Faction(TimestampMixin, Base):
    __tablename__ = "faction"

    slug: Mapped[str] = mapped_column(String, primary_key=True)
    status: Mapped[FactionStatus] = mapped_column(
        Enum(FactionStatus, create_type=False), nullable=False, default=FactionStatus.visible
    )
    # ADR-0038: no name/description columns. Faction name/description prose lives
    # in frontend/src/locales/en/factions.json (config-canonical identity); the
    # row carries slug + status only. No multiplier columns either — faction
    # rules live in game_config.py. This table exists for FK references only.

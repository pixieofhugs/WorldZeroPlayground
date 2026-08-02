import enum

from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base
from models.mixins import TimestampMixin


class FactionStatus(enum.Enum):
    """A faction row is either listed or not.

    There is no ``deprecated``: ``seed.py`` writes ``visible`` or ``hidden`` and
    nothing else ever writes this column, so ``deprecated`` was a third value
    every reader had to spell out (``hidden/deprecated``) and no writer could
    produce. Retiring a faction means dropping it from the era config, which
    leaves its row ``hidden``. Removed in the #1398 squash.
    """

    visible = "visible"
    hidden = "hidden"


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

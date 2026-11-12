"""Activity-feed items a character archived (#1193); the feed is derived and owns no
rows.

``item_key`` is ``services.activity_feed.build_item_key`` (type prefix needed:
source PKs collide across types). Archiving is view state only (ADR-0070).
Only ``ARCHIVABLE_ITEM_TYPES`` may be stored. Orphans are harmless; no cleanup.
"""

from sqlalchemy import BigInteger, ForeignKey, Identity, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base
from models.mixins import CreatedAtMixin


class FeedDismissal(CreatedAtMixin, Base):
    __tablename__ = "feed_dismissal"

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    character_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("character.id"), nullable=False
    )
    item_key: Mapped[str] = mapped_column(String(128), nullable=False)

    __table_args__ = (
        # Also the read index (character_id leads).
        UniqueConstraint(
            "character_id", "item_key", name="uq_feed_dismissal_character_item_key"
        ),
    )

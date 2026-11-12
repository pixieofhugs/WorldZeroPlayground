"""Persisted CRDT draft for a praxis room (ADR-0073); ``praxis.body_text`` is the
record.

One row per Y update, folded in ``id`` order; ``PostgresYStore`` squashes.
CASCADE also matters because CRDT history holds deleted text.
"""

from sqlalchemy import BigInteger, ForeignKey, Identity, Index, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base
from models.mixins import CreatedAtMixin


class PraxisRoomUpdate(CreatedAtMixin, Base):
    __tablename__ = "praxis_room_update"

    __table_args__ = (
        Index("ix_praxis_room_update_praxis_id_id", "praxis_id", "id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    praxis_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("praxis.id", ondelete="CASCADE"), nullable=False
    )
    update: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)

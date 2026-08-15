"""Where a praxis room's CRDT document lives between connections (ADR-0073).

A **room** is the live editing space for one praxis: a server-held CRDT document
plus the members currently connected. The room itself is in-process and
disappears when the last client leaves; this table is what lets the *document*
outlive it, so reopening the room restores the draft instead of re-seeding it
from ``praxis.body_text`` and duplicating everything typed since the last flush.

One row is one Y update — the CRDT's unit of change, an opaque binary blob. The
document is the fold of every row for a praxis, applied in ``id`` order.
Appending forever is what a naive Y store does, so
``services/praxis_room.PostgresYStore`` squashes: past a threshold it folds the
rows into a single equivalent update and replaces them.

This is a **draft**, not the record. ``praxis.body_text`` remains the record and
is still written by the existing debounced ``PUT`` (retired in #1743). The FK is
``ON DELETE CASCADE`` for the same reason every other praxis child is (migration
``0006``): a room is a part of its praxis, not a row that outlives it — and
CRDT history retains tombstones, i.e. text the author deleted, which should not
survive the draft it was deleted from.
"""

from sqlalchemy import BigInteger, ForeignKey, Identity, Index, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base
from models.mixins import CreatedAtMixin


class PraxisRoomUpdate(CreatedAtMixin, Base):
    __tablename__ = "praxis_room_update"

    __table_args__ = (
        # Every read of a document is "all updates for this praxis, oldest
        # first", and every squash rewrites exactly that set.
        Index("ix_praxis_room_update_praxis_id_id", "praxis_id", "id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    praxis_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("praxis.id", ondelete="CASCADE"), nullable=False
    )
    update: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)

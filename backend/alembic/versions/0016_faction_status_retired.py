"""``factionstatus`` gains ``retired`` (#2706, ADR-0087).

A carry-forward for already-deployed databases. ``models/faction.py`` declares
the column as ``Enum(FactionStatus, create_type=False)``, so the PG type is
owned by migrations and never by SQLAlchemy — a new member has to arrive here or
it does not arrive at all.

``ADD VALUE IF NOT EXISTS`` because ``0002_squashed.ENUMS`` still builds a fresh
database with only ``visible`` and ``hidden``. That list is deliberately frozen
at the squash; this revision is what a deployed database gets instead (the same
shape ``0015_account_tombstone`` uses for ``accountstatus.deleted``).

The value is appended, so Postgres sorts it last. Nothing orders factions by
status, and the two readers that care compare for equality
(``routers.factions.list_factions`` on ``visible``,
``services.faction_service.hidden_faction_slugs`` on ``hidden``).

No data migration: under Era 1 the live era lists every faction, so the mirror
in ``seed.upsert_era_factions`` retires nothing. This ships **before** the
``CURRENT_ERA`` flip on purpose, and the seed run after that flip is what writes
the first ``retired`` row.

``downgrade()`` is a no-op. Postgres cannot remove an enum member, and inventing
a ``DROP``/``CREATE``/rewrite dance is more risk than the reversal is worth —
the residue is one unused label, exactly as ``0015`` reasoned.

Revision ID: 0016_faction_status_retired
Revises: 0015_account_tombstone
Create Date: 2026-08-26
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0016_faction_status_retired"
down_revision: Union[str, None] = "0015_account_tombstone"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE factionstatus ADD VALUE IF NOT EXISTS 'retired'")


def downgrade() -> None:
    pass

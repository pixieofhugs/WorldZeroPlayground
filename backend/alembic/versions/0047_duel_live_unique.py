"""One live duel per praxis side (#3654).

Fails loudly if duplicate live rows exist (pre-launch, no grandfathering).

Revision ID: 0047_duel_live_unique
Revises: 0046_praxis_room_generation
Create Date: 2026-11-20
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0047_duel_live_unique"
down_revision: Union[str, None] = "0046_praxis_room_generation"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_LIVE = "status IN ('pending', 'active', 'settled')"


def upgrade() -> None:
    for side in ("challenger", "opponent"):
        op.execute(
            f"CREATE UNIQUE INDEX IF NOT EXISTS uq_duel_live_{side}_praxis "
            f"ON duel ({side}_praxis_id) WHERE {_LIVE}"
        )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_duel_live_opponent_praxis")
    op.execute("DROP INDEX IF EXISTS uq_duel_live_challenger_praxis")

"""One live duel per praxis side (#3654).

Existing duplicates are declined first (a failing upgrade crash-loops the deploy).

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


# Keeps one live duel per side: active/settled before pending, then oldest. The
# rest are declined, as services/duel.py does. A group with several active/settled
# duels loses all but the oldest too.
DEDUPE_SQL = f"""
UPDATE duel SET status = 'declined', declined_at = now()
WHERE id IN (
    SELECT id FROM (
        SELECT id, row_number() OVER (
            PARTITION BY {{side}}_praxis_id
            ORDER BY (status = 'pending'), created_at, id
        ) AS rn
        FROM duel WHERE {_LIVE} AND {{side}}_praxis_id IS NOT NULL
    ) ranked WHERE rn > 1
)
"""


def upgrade() -> None:
    for side in ("challenger", "opponent"):
        op.execute(DEDUPE_SQL.format(side=side))
        op.execute(
            f"CREATE UNIQUE INDEX IF NOT EXISTS uq_duel_live_{side}_praxis "
            f"ON duel ({side}_praxis_id) WHERE {_LIVE}"
        )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_duel_live_opponent_praxis")
    op.execute("DROP INDEX IF EXISTS uq_duel_live_challenger_praxis")

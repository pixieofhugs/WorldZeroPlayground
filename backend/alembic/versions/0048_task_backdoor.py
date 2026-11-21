"""``task.status`` accepts ``backdoor``; ``task`` gains its open/close window (#3848).

Enums are VARCHAR + CHECK (#3448), so the CHECK is widened. ``downgrade()``
retires any backdoor row, then narrows it again.

Revision ID: 0048_task_backdoor
Revises: 0047_duel_live_unique
Create Date: 2026-11-21
"""

from typing import Sequence, Union

from alembic import op

revision: str = "0048_task_backdoor"
down_revision: Union[str, None] = "0047_duel_live_unique"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_OLD = ("pending", "active", "retired", "deleted")


def _recheck(values: tuple[str, ...]) -> None:
    op.execute("ALTER TABLE task DROP CONSTRAINT ck_task_taskstatus")
    allowed = ", ".join(f"'{v}'" for v in values)
    op.execute(
        "ALTER TABLE task ADD CONSTRAINT ck_task_taskstatus "
        f"CHECK (status IN ({allowed}))"
    )


def upgrade() -> None:
    _recheck(_OLD + ("backdoor",))
    for column in ("backdoor_opens_at", "backdoor_closes_at"):
        op.execute(f"ALTER TABLE task ADD COLUMN IF NOT EXISTS {column} TIMESTAMPTZ")


def downgrade() -> None:
    op.execute("UPDATE task SET status = 'retired' WHERE status = 'backdoor'")
    _recheck(_OLD)
    op.execute("ALTER TABLE task DROP COLUMN IF EXISTS backdoor_closes_at")
    op.execute("ALTER TABLE task DROP COLUMN IF EXISTS backdoor_opens_at")

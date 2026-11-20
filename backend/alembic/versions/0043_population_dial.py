"""Population dial sides (#3656).

``IF NOT EXISTS`` because a fresh DB's root already built the table.

Revision ID: 0043_population_dial
Revises: 0042_mod_action_log
Create Date: 2026-11-20
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0043_population_dial"
down_revision: Union[str, None] = "0042_mod_action_log"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS population_dial (
            dial_key VARCHAR(64) NOT NULL,
            side VARCHAR(8) NOT NULL,
            updated_by_id BIGINT NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT pk_population_dial PRIMARY KEY (dial_key),
            CONSTRAINT fk_population_dial_updated_by_id_account
                FOREIGN KEY (updated_by_id) REFERENCES account (id)
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS population_dial")

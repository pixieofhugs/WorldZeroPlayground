"""A character's location is a three-letter airport code or empty (#2798, ADR-0094).

Clean (trim, uppercase, blank non-matches; no grandfathering) before narrowing,
which would otherwise fail on long values. Downgrade doesn't restore values.

Revision ID: 0023_character_location_code
Revises: 0022_character_peak_level
Create Date: 2026-10-16
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0023_character_location_code"
down_revision: Union[str, None] = "0022_character_peak_level"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Module-level so the integration test runs the very statement.
CLEAN_SQL: str = """
    UPDATE character
    SET location = CASE
        WHEN upper(btrim(location)) ~ '^[A-Z]{3}$' THEN upper(btrim(location))
        ELSE ''
    END
    WHERE location <> CASE
        WHEN upper(btrim(location)) ~ '^[A-Z]{3}$' THEN upper(btrim(location))
        ELSE ''
    END
"""


def upgrade() -> None:
    op.execute(CLEAN_SQL)
    op.execute("ALTER TABLE character ALTER COLUMN location TYPE VARCHAR(3)")


def downgrade() -> None:
    op.execute("ALTER TABLE character ALTER COLUMN location TYPE VARCHAR")

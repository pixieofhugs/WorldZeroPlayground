"""A character's location is a three-letter airport code or empty (#2798, ADR-0094).

Data first, then the narrowing: trim and uppercase every value, keep what matches
``^[A-Z]{3}$``, blank the rest (an address already stored is exactly what this
clears; World Zero is pre-launch, so no grandfathering). Narrowing before the
clean-up would fail on any long value.

Idempotent over a fresh database, where ``0002_squashed`` already built
``String(3)`` from the models.

``downgrade()`` widens the column back; cleared values are not restored.

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

# Module-level so the integration test runs the very statement a deployed
# database gets.
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

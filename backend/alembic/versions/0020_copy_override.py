"""Admin-editable copy overrides: ``copy_override`` (#3065).

Schema only. The table starts empty and stays empty until an admin edits a
string — an override is a diff against the frontend's shipped catalogs, so there
is nothing to backfill. See ``models/copy_override.py``.

``ns`` + ``key`` is the composite primary key, which is also the only index this
table needs: the one read is "give me every override" and the one write is an
upsert on that key.

``0002_squashed`` builds a *fresh* database straight from the ORM models, so CI
and local resets already land on this shape. A deployed database is stamped at
an earlier revision and never re-runs it — hence this one. Idempotent either way.

Revision ID: 0020_copy_override
Revises: 0019_onboarding_rename
Create Date: 2026-09-29
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0020_copy_override"
down_revision: Union[str, None] = "0019_onboarding_rename"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS copy_override (
            ns VARCHAR(64) NOT NULL,
            key VARCHAR(255) NOT NULL,
            value TEXT NOT NULL,
            updated_by BIGINT NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT pk_copy_override PRIMARY KEY (ns, key),
            CONSTRAINT fk_copy_override_updated_by_account
                FOREIGN KEY (updated_by) REFERENCES account (id)
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS copy_override")

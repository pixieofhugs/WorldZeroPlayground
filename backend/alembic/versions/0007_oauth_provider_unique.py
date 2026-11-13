"""Make ``(provider, provider_user_id)`` unique on ``oauth_provider``.

A duplicate pair makes every later sign-in for that account raise
``MultipleResultsFound``, unrecoverably. Idempotent. A pre-existing duplicate
makes ``ADD CONSTRAINT`` fail loudly rather than dedupe: resolving it is a
human decision.

Revision ID: 0007_oauth_provider_unique
Revises: 0006_praxis_child_fk_cascade
Create Date: 2026-08-14
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0007_oauth_provider_unique"
down_revision: Union[str, None] = "0006_praxis_child_fk_cascade"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

#: Matches ``models/base.py``'s ``uq_`` convention.
_CONSTRAINT = "uq_oauth_provider_provider_provider_user_id"


def upgrade() -> None:
    op.execute(f"ALTER TABLE oauth_provider DROP CONSTRAINT IF EXISTS {_CONSTRAINT}")
    op.create_unique_constraint(
        _CONSTRAINT, "oauth_provider", ["provider", "provider_user_id"]
    )


def downgrade() -> None:
    op.execute(f"ALTER TABLE oauth_provider DROP CONSTRAINT IF EXISTS {_CONSTRAINT}")

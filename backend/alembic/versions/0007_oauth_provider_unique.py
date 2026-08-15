"""Make ``(provider, provider_user_id)`` unique on ``oauth_provider``.

Every sign-in resolves an OAuth identity by looking that pair up with
``scalar_one_or_none()`` (``services/auth.py``). Nothing stopped two rows from
carrying the same pair — two concurrent first logins for one identity being the
obvious route — and the second one does not break the login that created it: it
breaks **every subsequent login for that account, permanently**, with
``MultipleResultsFound``, and the player has no way to fix it themselves.
Unlikely race, unrecoverable outcome, so the database refuses it. The index the
constraint brings also turns that per-sign-in lookup into a seek.

``0002_squashed`` builds a fresh database straight from the ORM models
(``models/account.py``), so CI, local resets and the test harness already land
on this shape without this file — which is exactly why it has to exist
explicitly. A deployed database is stamped at a later revision and never re-runs
the root, so only this revision puts the constraint there. Written idempotent
(``DROP CONSTRAINT IF EXISTS`` first, the shape ``0006`` uses) so it is a no-op
on the databases that already have it.

If a deployed database somehow *does* hold a duplicate pair, the ``ADD
CONSTRAINT`` fails and names the offending key rather than deduplicating
silently: that data is a broken account whose correct resolution is a decision,
not a migration's guess.

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

#: Spelled out rather than derived: ``models/base.py``'s ``uq_`` convention
#: produces this from the table and both columns, and a migration has to name
#: the object it edits.
_CONSTRAINT = "uq_oauth_provider_provider_provider_user_id"


def upgrade() -> None:
    op.execute(f"ALTER TABLE oauth_provider DROP CONSTRAINT IF EXISTS {_CONSTRAINT}")
    op.create_unique_constraint(
        _CONSTRAINT, "oauth_provider", ["provider", "provider_user_id"]
    )


def downgrade() -> None:
    op.execute(f"ALTER TABLE oauth_provider DROP CONSTRAINT IF EXISTS {_CONSTRAINT}")

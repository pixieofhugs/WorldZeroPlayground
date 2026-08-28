"""Account.email goes nullable — the email-less identities arrive (ADR-0088).

Schema only: ``account.email`` drops its ``NOT NULL``. The two new
``AuthProvider`` values (``ATPROTO``, ``KEY``) identify a player by a DID and
an Ed25519 key respectively; neither carries a mailbox anywhere in its
protocol, so the account minted from one has no email to store.

**Uniqueness is deliberately kept, and means the same thing it always has.**
Postgres treats NULLs as distinct under a unique constraint, so any number of
email-less accounts may sit in the table while every *present* address still
pairs with exactly one account — ADR-0075's verified-email linking law is
untouched for the providers that speak email at all.

The account-deletion placeholder scheme (``deleted-<id>@deleted.invalid``,
``services/account_deletion.py``) is unaffected and stays: a tombstone keeps a
synthetic address rather than going NULL because ``deleted_on`` lookups and the
release-and-retry story already speak in addresses, and one more NULL shape is
one more thing for every reader of ``account.email`` to remember exists.

``0002_squashed`` builds a fresh database straight from the ORM models, so CI
and local resets already have the nullable column by the time this revision
runs. ``ALTER COLUMN ... DROP NOT NULL`` is a no-op there — the same
carry-forward shape every revision since the squash has kept.

``downgrade()`` refuses politely: it re-nulls nothing, because the only safe
re-tightening needs every NULL replaced — it fills them with placeholders
first, then restores the constraint.

Revision ID: 0018_account_email_nullable
Revises: 0017_account_albescent_glimpsed
Create Date: 2026-08-27
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0018_account_email_nullable"
down_revision: Union[str, None] = "0017_account_albescent_glimpsed"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE account ALTER COLUMN email DROP NOT NULL")


def downgrade() -> None:
    op.execute(
        "UPDATE account SET email = 'missing-' || id || '@deleted.invalid'"
        " WHERE email IS NULL"
    )
    op.execute("ALTER TABLE account ALTER COLUMN email SET NOT NULL")

"""Move vote uniqueness from the character to the account (#1150).

``uq_vote_praxis (praxis_id, voter_character_id)`` -> ``uq_vote_praxis_account
(praxis_id, voter_account_id)``. Anti-abuse is enforced one layer up from the
action (ADR-0041), so the uniqueness anchor is the account: alt characters on
one account can no longer stack several votes onto the same praxis. See
``models/vote.py`` and ``services/vote.py::cast_or_update_vote``.

``0001_squashed`` builds a *fresh* DB with ``Base.metadata.create_all``, so CI
and a local reset land on the account-scoped constraint the moment the model
says so — the squash needs no edit. A deployed DB is stamped further down the
chain and never re-runs the baseline, hence this revision. It is idempotent on
both: the DROP is ``IF EXISTS`` and the ADD asks ``pg_constraint`` first.

Not the 0008 / 0009 ``EXCEPTION WHEN duplicate_object`` pattern: adding a
UNIQUE also builds an index, and a pre-existing one raises ``duplicate_table``,
which that handler does not catch (#1193 hit exactly this and died on a fresh
DB). Any migration adding a UNIQUE constraint or index needs the
``pg_constraint`` lookup instead.

**Pre-existing duplicates are NOT resolved here.** If some account already
holds two votes on one praxis via alts, this migration RAISES with the count
and changes nothing. Which of a player's real votes survives — earliest,
latest, highest — is an owner call about someone's actual rating, not a
builder's, and a migration is the worst place to guess it. Nothing is deleted:
re-run once the owner has ruled and the surplus rows have been resolved by
hand. The dev database had zero such pairs when this landed.

Revision ID: 0011_vote_unique_per_account
Revises: 0010_feed_dismissal
Create Date: 2026-07-29
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0011_vote_unique_per_account"
down_revision: Union[str, None] = "0010_feed_dismissal"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

OLD_CONSTRAINT: str = "uq_vote_praxis"
NEW_CONSTRAINT: str = "uq_vote_praxis_account"

# Refuse rather than pick a survivor. Raised before either DDL statement so a
# deployed DB with duplicates is left exactly as it was found.
#
# ``RAISE ... USING MESSAGE`` rather than ``RAISE '...%', n``: the statement runs
# through the DBAPI, where a literal ``%`` is only safe while SQLAlchemy happens
# to take its no-parameters path. Concatenation keeps the SQL ``%``-free.
_GUARD_AGAINST_DUPLICATES: str = """
DO $$
DECLARE duplicate_pairs INTEGER;
BEGIN
    SELECT count(*) INTO duplicate_pairs FROM (
        SELECT 1 FROM vote
        GROUP BY praxis_id, voter_account_id
        HAVING count(*) > 1
    ) AS duplicates;
    IF duplicate_pairs > 0 THEN
        RAISE EXCEPTION USING
            MESSAGE = '#1150: ' || duplicate_pairs || ' (praxis, account) pair(s)'
                || ' hold more than one vote, so UNIQUE (praxis_id,'
                || ' voter_account_id) cannot be added.',
            DETAIL = 'This migration deliberately does not choose which real'
                || ' vote survives (earliest? latest? highest?) - that is an'
                || ' owner decision, not a builder''s. Nothing was changed.',
            HINT = 'List them with: SELECT praxis_id, voter_account_id,'
                || ' count(*) FROM vote GROUP BY praxis_id, voter_account_id'
                || ' HAVING count(*) > 1;';
    END IF;
END $$;
"""


def upgrade() -> None:
    op.execute(_GUARD_AGAINST_DUPLICATES)

    # Fresh DB: never existed (the model no longer declares it) -> no-op.
    op.execute(f"ALTER TABLE vote DROP CONSTRAINT IF EXISTS {OLD_CONSTRAINT}")

    op.execute(
        f"""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = '{NEW_CONSTRAINT}'
            ) THEN
                ALTER TABLE vote
                    ADD CONSTRAINT {NEW_CONSTRAINT}
                    UNIQUE (praxis_id, voter_account_id);
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    """Restore the character-scoped constraint.

    Widening is always safe: one vote per account per praxis already satisfies
    one vote per character per praxis, so no duplicate guard is needed here.
    """
    op.execute(f"ALTER TABLE vote DROP CONSTRAINT IF EXISTS {NEW_CONSTRAINT}")
    op.execute(
        f"""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = '{OLD_CONSTRAINT}'
            ) THEN
                ALTER TABLE vote
                    ADD CONSTRAINT {OLD_CONSTRAINT}
                    UNIQUE (praxis_id, voter_character_id);
            END IF;
        END $$;
        """
    )

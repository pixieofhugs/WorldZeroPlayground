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

**Pre-existing duplicates: the newest vote wins.** As first written this
migration RAISED on any account already holding two votes on one praxis via
alts, refusing to pick a survivor — earliest, latest, highest — because that is
an owner call about someone's real rating. Amended 2026-08-02 after that guard
fired on a production deploy (13 pairs) and blocked the API: **the owner has
ruled that the most recent vote survives.** That is not a fresh rule so much as
the existing one applied backwards — once the constraint lands, an account's
second rating is an *update* that overwrites the older value
(``services/vote.py::cast_or_update_vote``), so keeping the latest makes
history consistent with the behaviour going forward instead of inventing a
one-off. ``created_at DESC, id DESC`` — the id tiebreak so rows sharing a
timestamp still resolve deterministically rather than by table order.

**Two consequences of the DELETE are deliberately left unrepaired.** Both need
an era attribution this migration cannot derive in SQL without guessing, which
is the very thing the original guard refused to do:

1. ``votes_spent_this_era`` is a *stored* counter (``votes_available`` is
   computed on read from it and ``score`` — ``services/character.py``), so the
   caster of a deleted row stays charged for it. The refund belongs to that
   character's ``CharacterStats`` row for the era the deleted vote belongs to.
2. A praxis score includes ``total_stars``, so removing a vote lowers the
   recipient's score, and ``all_time_score`` is lifetime-cumulative — moved by
   delta, never recomputed here.

Both are owner follow-ups once the deploy is up;
``POST /admin/characters/backfill-stats`` already recomputes per-era score and
level. Getting the API deployable is this revision's only job.

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

# Keep the newest vote per (praxis, account); delete the rest. ``created_at``
# is NOT NULL (``models/vote.py``), so the ordering is total: the id tiebreak is
# only ever reached when two rows genuinely share a timestamp.
#
# A no-op on a fresh DB: ``0001_squashed`` builds from ``Base.metadata``, which
# already declares ``uq_vote_praxis_account``, so no duplicate can exist there
# and this deletes nothing. Idempotent for the same reason — re-running after
# the constraint is in place can never match a second row.
_DEDUPE_TO_LATEST: str = """
DELETE FROM vote WHERE id IN (
    SELECT id FROM (
        SELECT id, row_number() OVER (
            PARTITION BY praxis_id, voter_account_id
            ORDER BY created_at DESC, id DESC
        ) AS recency_rank
        FROM vote
    ) AS ranked
    WHERE recency_rank > 1
);
"""


def upgrade() -> None:
    op.execute(_DEDUPE_TO_LATEST)

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

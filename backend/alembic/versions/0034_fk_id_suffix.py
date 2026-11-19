"""Five FK columns get the ``_id`` suffix; ``contact_messages`` becomes ``contact_message`` (#3439).

Each rename is guarded by the old name existing, so a fresh DB (whose root already
built the new names) is a no-op. The FK constraints and the identity sequence are
renamed with them, since ``NAMING_CONVENTION`` derives names from the column.

Revision ID: 0034_fk_id_suffix
Revises: 0033_drop_task_vision_flag
Create Date: 2026-11-19
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0034_fk_id_suffix"
down_revision: Union[str, None] = "0033_drop_task_vision_flag"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# (table, old column, new column, referred table)
_COLUMNS = (
    ("task", "created_by", "created_by_id", "character"),
    ("flag", "flagged_by", "flagged_by_id", "character"),
    ("era", "started_by", "started_by_id", "account"),
    ("account_role", "granted_by", "granted_by_id", "account"),
    ("copy_override", "updated_by", "updated_by_id", "account"),
)


def _rename_column(table: str, old: str, new: str, referred: str) -> None:
    op.execute(
        f"""
        DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = '{table}' AND column_name = '{old}') THEN
                ALTER TABLE {table} RENAME COLUMN {old} TO {new};
                ALTER TABLE {table}
                    RENAME CONSTRAINT fk_{table}_{old}_{referred} TO fk_{table}_{new}_{referred};
            END IF;
        END $$
        """
    )


def _rename_table(old: str, new: str) -> None:
    op.execute(
        f"""
        DO $$ BEGIN
            IF to_regclass('{old}') IS NOT NULL THEN
                ALTER TABLE {old} RENAME TO {new};
                ALTER TABLE {new} RENAME CONSTRAINT pk_{old} TO pk_{new};
                ALTER SEQUENCE IF EXISTS {old}_id_seq RENAME TO {new}_id_seq;
            END IF;
        END $$
        """
    )


def upgrade() -> None:
    for table, old, new, referred in _COLUMNS:
        _rename_column(table, old, new, referred)
    _rename_table("contact_messages", "contact_message")


def downgrade() -> None:
    for table, old, new, referred in _COLUMNS:
        _rename_column(table, new, old, referred)
    _rename_table("contact_message", "contact_messages")


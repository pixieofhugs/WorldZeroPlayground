"""The schema-wide column conventions, enforced against ``Base.metadata`` (#1398).

The sweep that introduced these said "across all models" and enumerated none, so
nothing could answer *did we get all of them?* afterwards. These tests are that
answer, and they run over the live metadata rather than a hand-written list, so a
model added tomorrow is covered the moment it imports ``Base``.

The BIGINT rule in particular needs a machine: Postgres will happily accept an
``INTEGER`` foreign key pointing at a ``BIGINT`` primary key, so a missed column
produces no error anywhere — it just quietly caps that relationship at 2^31 and
costs a table rewrite to fix later.

The human-readable inventory lives in ``docs/agents/db-migrations.md``; keep the
two in step.
"""

import sqlalchemy as sa

from models.base import NAMING_CONVENTION, Base
import models  # noqa: F401 — registers every mapped class on Base.metadata

# ``faction``'s primary key is the human-written slug (ADR-0038), so it is
# exempt from the integer-identity rules and its FKs are strings.
STRING_PRIMARY_KEY_TABLES: frozenset[str] = frozenset({"faction"})

# The one composite primary key in the schema: both halves are foreign keys and
# the pair itself is the fact, so there is no surrogate key to generate.
COMPOSITE_PRIMARY_KEY_TABLES: frozenset[str] = frozenset({"praxis_meta_task"})


def _integer_columns() -> list[sa.Column]:
    return [
        column
        for table in Base.metadata.tables.values()
        for column in table.columns
        if isinstance(column.type, sa.Integer)
    ]


def test_metadata_carries_the_naming_convention() -> None:
    assert Base.metadata.naming_convention == NAMING_CONVENTION


def test_every_constraint_and_index_has_a_name() -> None:
    """No unnamed object anywhere — the whole point of the convention.

    An unnamed constraint is one Postgres names for us, which is one nothing in
    the repo can later ``ALTER`` or ``DROP`` by name.
    """
    unnamed: list[str] = []
    for table in Base.metadata.tables.values():
        for constraint in table.constraints:
            if constraint.name is None:
                unnamed.append(f"{table.name}: {type(constraint).__name__}")
        for index in table.indexes:
            if index.name is None:
                unnamed.append(f"{table.name}: Index{tuple(index.columns.keys())}")
    assert unnamed == [], f"unnamed constraints/indexes: {unnamed}"


def test_every_surrogate_primary_key_is_bigint_identity() -> None:
    """Rule 2 + rule 3 on the primary keys."""
    offenders: list[str] = []
    for table in Base.metadata.tables.values():
        if table.name in STRING_PRIMARY_KEY_TABLES:
            continue
        primary_key_columns = list(table.primary_key.columns)
        assert primary_key_columns, f"{table.name} has no primary key"

        if table.name in COMPOSITE_PRIMARY_KEY_TABLES:
            # Composite key of foreign keys: BIGINT, but nothing to generate.
            for column in primary_key_columns:
                if not isinstance(column.type, sa.BigInteger):
                    offenders.append(f"{table.name}.{column.name} is not BIGINT")
            continue

        assert len(primary_key_columns) == 1, (
            f"{table.name} has a composite primary key but is not listed in "
            f"COMPOSITE_PRIMARY_KEY_TABLES"
        )
        column = primary_key_columns[0]
        if not isinstance(column.type, sa.BigInteger):
            offenders.append(f"{table.name}.{column.name} is not BIGINT")
        if column.identity is None:
            offenders.append(f"{table.name}.{column.name} has no Identity()")
    assert offenders == [], f"primary keys off convention: {offenders}"


def test_every_foreign_key_column_matches_the_type_it_references() -> None:
    """Rule 3 on the referencing side — the half that fails silently.

    Checked as "same SQL type as the target column" rather than "is BIGINT", so
    the string ``faction_slug`` foreign keys are covered by the same assertion
    instead of needing an exemption list.
    """
    mismatches: list[str] = []
    for table in Base.metadata.tables.values():
        for column in table.columns:
            for foreign_key in column.foreign_keys:
                target = foreign_key.column
                if type(column.type) is not type(target.type):
                    mismatches.append(
                        f"{table.name}.{column.name} is {column.type} but "
                        f"{target.table.name}.{target.name} is {target.type}"
                    )
    assert mismatches == [], f"foreign key type mismatches: {mismatches}"


def test_no_plain_integer_primary_or_foreign_key_survives() -> None:
    """Belt and braces: a 32-bit INTEGER is only ever a score, never an id."""
    offenders = [
        f"{column.table.name}.{column.name}"
        for column in _integer_columns()
        if not isinstance(column.type, sa.BigInteger)
        and (column.primary_key or column.foreign_keys)
    ]
    assert offenders == [], f"32-bit INTEGER used as an identifier: {offenders}"

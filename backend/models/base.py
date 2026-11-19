"""Declarative base and schema-wide conventions.

Naming convention gives every constraint a predictable name so later
ALTER/DROP has a stable target. CHECKs use a bare ``name=`` (becomes
``ck_<table>_<name>``). Surrogate PKs and their FKs are ``BigInteger`` +
``Identity()``; faction's slug PK is the exception (ADR-0038).
Enforced by ``tests/unit/test_model_conventions.py``.
"""

import enum

from sqlalchemy import Enum, MetaData
from sqlalchemy.orm import DeclarativeBase

# Alembic's recommended set; `column_0_N_name` names every covered column.
NAMING_CONVENTION: dict[str, str] = {
    "ix": "ix_%(table_name)s_%(column_0_N_name)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_N_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


def string_enum(enum_class: type[enum.Enum]) -> Enum:
    """A Python enum stored as VARCHAR(32) with a CHECK on its names (#3448)."""
    return Enum(enum_class, native_enum=False, length=32, create_constraint=True)

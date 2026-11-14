"""Count the SELECTs a request issues, for tests that guard a query budget."""

from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import event
from sqlalchemy.engine import Engine


@contextmanager
def capture_selects() -> Iterator[list[str]]:
    """Record SELECTs only, so SAVEPOINT/RELEASE can't skew a count.

    Listens on the ``Engine`` class, which also fires for the async engine.
    """
    statements: list[str] = []

    def _record(conn, cursor, statement, parameters, context, executemany) -> None:
        if statement.lstrip().upper().startswith("SELECT"):
            statements.append(statement)

    event.listen(Engine, "before_cursor_execute", _record)
    try:
        yield statements
    finally:
        event.remove(Engine, "before_cursor_execute", _record)

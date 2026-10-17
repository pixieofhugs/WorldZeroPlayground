from db import engine


def test_engine_pings_connections_before_use() -> None:
    """A restarted db leaves dead pooled connections; pre-ping makes the first
    request survive (#3238)."""
    assert engine.pool._pre_ping is True

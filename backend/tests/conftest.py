# Unit test conftest — no DB or app imports here so env vars are not required.
# Integration fixtures live in tests/integration/conftest.py
import pytest


@pytest.fixture(autouse=True)
def restore_live_era():
    """Put the live era back after every test (ADR-0091, #827).

    A rollover rebinds the live ruleset in place (``services.era.
    commit_and_bind_live_era``), which is the whole point of it — but the live
    era is one process-wide object, so a test that rolls into Era 2 would
    otherwise hand Era 2 to every test after it in the same session, in file
    order, silently.

    Snapshots the *object* rather than the name because the name never moves;
    see ``game_config.bind_live_era``. The snapshot is a detached copy made the
    same way the live instance itself is, so restoring is one call to the real
    lever rather than a second hand-rolled refresh that could drift from it.
    ``game_config`` imports no settings, so this stays honest to the "no env
    vars" note above.
    """
    import game_config

    before = game_config._new_live_era(game_config.CURRENT_ERA)
    yield
    game_config.bind_live_era(before)

# Unit test conftest — no DB or app imports here so env vars are not required.
# Integration fixtures live in tests/integration/conftest.py
import pytest


@pytest.fixture(autouse=True)
def restore_live_era():
    """Put the live era back after every test (ADR-0091, #827).

    ``services.era.apply_era_reset`` rebinds the live ruleset in place, which is
    the whole point of it — but the live era is one process-wide object, so a
    test that rolls into Era 2 would otherwise hand Era 2 to every test after it
    in the same session, in file order, silently.

    Snapshots the ``__dict__`` rather than the name because the name never
    moves; see ``game_config.bind_live_era``. ``game_config`` imports no
    settings, so this stays honest to the "no env vars" note above.
    """
    import game_config

    before = dict(game_config.CURRENT_ERA.__dict__)
    yield
    live = game_config.CURRENT_ERA
    if live.__dict__ != before:
        live.__dict__.clear()
        live.__dict__.update(before)

# No DB or app imports here, so env vars are not required.
import pytest


@pytest.fixture(autouse=True)
def restore_live_era():
    """Restore the live era after every test (ADR-0091, #827); a rollover rebinds it
    process-wide.

    Snapshots the object (the name never moves) and restores via the real lever.
    """
    import game_config

    before = game_config._new_live_era(game_config.CURRENT_ERA)
    yield
    game_config.bind_live_era(before)

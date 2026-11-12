"""The era announcement labels each era from its own config (#1623).

Past eras are announced too, so neither ``Era.name`` (drifts) nor
``CURRENT_ERA`` is right.
"""
from datetime import datetime, timezone

from game_config import ERA_1, ERA_2
from models.era import Era
from services.activity_feed import _era_announcement_item


def _era_row(config_key: str, name: str) -> tuple[Era, ...]:
    """Shaped like ``_era_announcements_query`` rows."""
    return (
        Era(
            id=1,
            name=name,
            config_key=config_key,
            started_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
            notes="",
        ),
    )


def test_announcement_reads_the_config_not_the_stored_name():
    item = _era_announcement_item(_era_row("era_1", "TestEra"))
    assert item.payload.era_name == ERA_1.name


def test_each_announcement_carries_its_own_eras_name():
    first = _era_announcement_item(_era_row("era_1", "whatever"))
    second = _era_announcement_item(_era_row("era_2", "whatever"))

    assert first.payload.era_name == ERA_1.name
    assert second.payload.era_name == ERA_2.name
    assert first.payload.era_name != second.payload.era_name


def test_an_unknown_config_key_falls_back_to_the_stored_name():
    """The one reason ``Era.name`` is still written."""
    item = _era_announcement_item(_era_row("era_99", "The Long Winter"))
    assert item.payload.era_name == "The Long Winter"
    assert item.payload.config_key == "era_99"

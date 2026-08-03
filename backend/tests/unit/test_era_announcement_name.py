"""The era announcement labels each era from ITS OWN config (#1623).

The seam under test is ``services.activity_feed._era_announcement_item``, the
row-to-item mapper: it takes an ``Era`` row and decides what name players read.
It used to emit ``Era.name`` — a hand-editable column that had already drifted
from the config in production — and the query it serves emits announcements for
*past* eras too, so neither the column nor ``CURRENT_ERA`` is the right answer.

Unit-level on purpose: the mapper is a pure function of the row, so the whole
rule is reachable without a database.
"""
from datetime import datetime, timezone

from game_config import ERA_1, ERA_2
from models.era import Era
from services.activity_feed import _era_announcement_item


def _era_row(config_key: str, name: str) -> tuple[Era, ...]:
    """One row shaped the way ``_era_announcements_query`` returns it."""
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
    """The regression this issue exists to prevent.

    Two rows, two config_keys. If the mapper resolved through CURRENT_ERA both
    would read "Renaissance", and Era 1's historical announcement would be
    relabelled the day Metamorphosis starts.
    """
    first = _era_announcement_item(_era_row("era_1", "whatever"))
    second = _era_announcement_item(_era_row("era_2", "whatever"))

    assert first.payload.era_name == ERA_1.name
    assert second.payload.era_name == ERA_2.name
    assert first.payload.era_name != second.payload.era_name


def test_an_unknown_config_key_falls_back_to_the_stored_name():
    """A deleted era file, or a row from a newer version — the one reason the
    ``Era.name`` column is still written."""
    item = _era_announcement_item(_era_row("era_99", "The Long Winter"))
    assert item.payload.era_name == "The Long Winter"
    assert item.payload.config_key == "era_99"

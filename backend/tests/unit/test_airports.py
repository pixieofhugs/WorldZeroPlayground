"""Nearby-airport matching (#3247), over a fixed fixture so the test does not
depend on the full dataset."""
from pathlib import Path

import pytest

from services import airports

FIXTURE = """# comment line
code,lat,lon
PDX,45.5887,-122.598
VUO,45.6204,-122.6566
SEA,47.4479,-122.3103
JFK,40.6398,-73.7789
"""


def _clear() -> None:
    airports._airports.cache_clear()
    airports.nearby_airport_codes.cache_clear()


@pytest.fixture
def fixture_dataset(tmp_path, monkeypatch):
    path = tmp_path / "airports.csv"
    path.write_text(FIXTURE)
    monkeypatch.setattr(airports, "AIRPORTS_PATH", path)
    _clear()
    yield
    _clear()


def test_pdx_neighbours_include_self_and_close_exclude_far(fixture_dataset):
    assert airports.nearby_airport_codes("PDX") == {"PDX", "VUO"}


def test_unknown_or_empty_code_has_no_set(fixture_dataset):
    assert airports.nearby_airport_codes("ZZZ") is None
    assert airports.nearby_airport_codes("") is None


def test_bundled_dataset_parses_and_knows_pdx():
    _clear()
    assert Path(airports.AIRPORTS_PATH).is_file()
    codes = airports.nearby_airport_codes("PDX")
    assert codes is not None and "PDX" in codes

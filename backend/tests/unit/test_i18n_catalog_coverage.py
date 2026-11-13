"""ADR-0031 drift guard: every copy key CURRENT_ERA emits must resolve.

Lives in the backend because only config can enumerate the full key set; reads
the English catalog JSON directly.
"""
import json
import re
from pathlib import Path

import pytest

from errors import ErrorCode
from game_config import CURRENT_ERA
from models.taunt_message import TauntTriggerType
from tests.unit.uncoded_error_scan import scan_coded_backend

LOCALES_DIR = Path(__file__).resolve().parents[3] / "frontend" / "src" / "locales" / "en"


def _load(namespace: str) -> dict:
    path = LOCALES_DIR / f"{namespace}.json"
    assert path.exists(), f"missing catalog file: {path}"
    return json.loads(path.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def progression() -> dict:
    return _load("progression")


@pytest.fixture(scope="module")
def taunts() -> dict:
    return _load("taunts")


@pytest.fixture(scope="module")
def factions() -> dict:
    return _load("factions")


def test_every_rank_key_resolves(progression):
    ranks = progression["ranks"]
    for level, profile in enumerate(CURRENT_ERA.level_profiles):
        if level == 0:  # start-state placeholder, never shown
            assert profile.rank_key == ""
            continue
        assert profile.rank_key in ranks, (
            f"progression:ranks.{profile.rank_key} (level {level}) not in catalog"
        )


#: Deliberately name-only unlocks, each with its ruling.
#: * ``albescent_glimpse`` (#2770): a description would be the hint #2409 forbids.
UNLOCKS_WITHOUT_A_DESCRIPTION = {"albescent_glimpse"}


def test_every_unlock_key_resolves_name_and_desc(progression):
    unlocks = progression["unlocks"]
    for level, profile in enumerate(CURRENT_ERA.level_profiles):
        for unlock in profile.unlocks:
            entry = unlocks.get(unlock.key)
            assert entry is not None, (
                f"progression:unlocks.{unlock.key} (level {level}) not in catalog"
            )
            assert entry.get("name"), f"progression:unlocks.{unlock.key}.name missing"
            if unlock.key in UNLOCKS_WITHOUT_A_DESCRIPTION:
                assert "desc" not in entry, (
                    f"progression:unlocks.{unlock.key} is listed as deliberately "
                    "wordless past its name — delete it from "
                    "UNLOCKS_WITHOUT_A_DESCRIPTION or delete the desc"
                )
                continue
            assert entry.get("desc"), f"progression:unlocks.{unlock.key}.desc missing"


def test_default_faction_covers_every_trigger(taunts):
    """The shared fallback is what makes an unconfigured faction safe."""
    assert "default" in taunts, "taunts catalog is missing the 'default' faction"
    default = taunts["default"]
    for trigger in TauntTriggerType:
        variants = default.get(trigger.value)
        assert isinstance(variants, list) and variants, (
            f"taunts:default.{trigger.value} must be a non-empty variant list"
        )


def test_every_config_faction_name_and_description_resolves(factions):
    """ADR-0038: every slug, including the ``na`` sentinel."""
    names = factions.get("names", {})
    descriptions = factions.get("descriptions", {})
    for faction_slug in CURRENT_ERA.factions:
        name = names.get(faction_slug)
        assert isinstance(name, str) and name.strip(), (
            f"factions:names.{faction_slug} missing or empty in catalog"
        )
        description = descriptions.get(faction_slug)
        assert isinstance(description, str) and description.strip(), (
            f"factions:descriptions.{faction_slug} missing or empty in catalog"
        )


def test_every_config_faction_taunt_combo_resolves(taunts):
    default = taunts.get("default", {})
    faction_slugs = list(CURRENT_ERA.factions.keys())
    for faction_slug in faction_slugs:
        for trigger in TauntTriggerType:
            faction_variants = taunts.get(faction_slug, {}).get(trigger.value)
            fallback = default.get(trigger.value)
            resolvable = (
                (isinstance(faction_variants, list) and faction_variants)
                or (isinstance(fallback, list) and fallback)
            )
            assert resolvable, (
                f"taunts for ({faction_slug}, {trigger.value}) resolve to nothing "
                f"— no faction variant and no default fallback"
            )


# Error codes (#1401)
PLACEHOLDER_PATTERN = re.compile(r"\{\{(\w+)\}\}")


@pytest.fixture(scope="module")
def error_codes() -> dict:
    return _load("errors")["codes"]


def test_every_error_code_resolves(error_codes):
    """A gap is silent at runtime: ``extractError`` falls back to backend prose."""
    for code in ErrorCode:
        assert code.value in error_codes, (
            f"errors:codes.{code.value} not in catalog "
            f"(ErrorCode.{code.name}) — add the key or the failure renders "
            f"backend prose instead of catalog copy"
        )


def test_every_raise_site_context_resolves(error_codes):
    """Else i18next silently falls back to the base key's generic wording."""
    for site in scan_coded_backend():
        if site.context is None or site.code_member is None:
            continue
        code_value = ErrorCode[site.code_member].value
        sibling = f"{code_value}_{site.context}"
        assert sibling in error_codes, (
            f"errors:codes.{sibling} not in catalog — raised at "
            f"{site.module_path}:{site.line}. i18next would fall back to the "
            f"base key and render the wrong surface's wording."
        )


def test_every_catalog_placeholder_is_supplied_by_a_raise_site(error_codes):
    """``extractError`` won't half-interpolate: it silently skips the catalog."""
    supplied: dict[str, set[str]] = {}
    for site in scan_coded_backend():
        if site.code_member is None:
            continue
        code_value = ErrorCode[site.code_member].value
        supplied.setdefault(code_value, set()).update(site.param_names)

    for key, value in error_codes.items():
        placeholders = set(PLACEHOLDER_PATTERN.findall(value))
        if not placeholders:
            continue
        # A sibling uses its base code's params. Codes contain underscores, so
        # take the longest prefixing code rather than splitting on "_".
        base = max(
            (code for code in supplied if key == code or key.startswith(f"{code}_")),
            key=len,
            default=key,
        )
        missing = placeholders - supplied.get(base, set())
        assert not missing, (
            f"errors:codes.{key} interpolates {sorted(missing)}, which no "
            f"raise site for {base} passes in params — extractError will skip "
            f"the catalog entirely and fall back to backend prose"
        )

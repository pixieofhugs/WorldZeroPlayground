"""ADR-0031 drift guard: every copy key CURRENT_ERA emits must resolve.

The backend emits copy keys (rank_key, unlock key, and — via the taunt read
path — (faction_slug, trigger_type)); the frontend catalog owns the words. The
backend is the only layer that can enumerate the full key set from config, so
this coverage test lives here. It reads the English catalog JSON directly (no
running frontend) and fails if config references a key the catalog is missing.
"""
import json
import re
from pathlib import Path

import pytest

from errors import ErrorCode
from game_config import CURRENT_ERA
from models.taunt_message import TauntTriggerType
from tests.unit.uncoded_error_scan import scan_coded_backend

# backend/tests/unit/ -> worktree root -> frontend/src/locales/en/
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


#: Unlock keys that are deliberately name-only, with the ruling that made them so.
#:
#: ``LevelUpPopup`` renders the description as ``{desc && ...}``, so the field has
#: always been optional to the component — this test was what made it mandatory in
#: practice, and one rung now needs it not to be. The set is the exception, not a
#: relaxation: every other key must still carry both halves, and a rung added
#: without a description fails here until somebody writes down why.
#:
#: * ``albescent_glimpse`` (#2770) — the pop-up announces that mysteries will
#:   reveal themselves and STOPS. #2409 ruled "I'm not going to give them hints on
#:   how", and a second sentence explaining the mechanic is exactly the hint.
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
    """The catalog's shared fallback must have a variant list for every trigger
    the backend can emit — this is what makes an unconfigured faction safe."""
    assert "default" in taunts, "taunts catalog is missing the 'default' faction"
    default = taunts["default"]
    for trigger in TauntTriggerType:
        variants = default.get(trigger.value)
        assert isinstance(variants, list) and variants, (
            f"taunts:default.{trigger.value} must be a non-empty variant list"
        )


def test_every_config_faction_name_and_description_resolves(factions):
    """ADR-0038 drift guard: faction name/description prose is config-canonical
    but lives in the frontend factions.json catalog. Every slug the current era
    defines — with no exceptions, including the ``na`` sentinel — must resolve a
    non-empty names.<slug> and descriptions.<slug>. The backend is the only
    layer that can enumerate the full slug set from config, so this lives here.
    """
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
    """Every faction the current era can send taunts from resolves for every
    trigger — directly, or via the guaranteed default fallback."""
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


# ---------------------------------------------------------------------------
# Error codes (#1401)
# ---------------------------------------------------------------------------

#: i18next interpolation placeholders, as written in an ``errors.json`` value.
PLACEHOLDER_PATTERN = re.compile(r"\{\{(\w+)\}\}")


@pytest.fixture(scope="module")
def error_codes() -> dict:
    return _load("errors")["codes"]


def test_every_error_code_resolves(error_codes):
    """Every ``ErrorCode`` the backend can emit has words in the catalog.

    ``extractError`` falls back to the backend's own ``message`` for a code the
    catalog does not carry, so a gap here is silent at runtime — the player sees
    Python's prose and ADR-0031 quietly stops holding for that failure. This is
    the only thing that makes it loud.
    """
    for code in ErrorCode:
        assert code.value in error_codes, (
            f"errors:codes.{code.value} not in catalog "
            f"(ErrorCode.{code.name}) — add the key or the failure renders "
            f"backend prose instead of catalog copy"
        )


def test_every_raise_site_context_resolves(error_codes):
    """A raise site naming a ``context`` has a ``<CODE>_<context>`` sibling.

    A typo'd or uncatalogued context is the quiet failure this guards: i18next
    silently falls back to the base key, so the player gets the generic wording
    for their surface and nothing anywhere complains.
    """
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
    """No catalog value interpolates a value no raise site sends.

    The other half of the ``params`` contract. ``extractError`` refuses to
    render a half-interpolated string, so a placeholder nothing supplies does
    not garble copy — it silently disables the catalog for that code, which is
    just as invisible and just as wrong.
    """
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
        # A key is either a code or a ``<CODE>_<context>`` sibling, and a
        # sibling is rendered with its base code's params. Underscores are in
        # the code values themselves, so match the longest code that prefixes
        # this key rather than splitting on "_".
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

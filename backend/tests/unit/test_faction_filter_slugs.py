"""#1975: faction selection -> predicate. Routing is pinned in
``tests/integration/test_faction_filter_folds_albescent.py``."""
from faction_slugs import (
    ALBESCENT_FACTION_SLUG,
    UNAFFILIATED_FACTION_SLUG,
    faction_filter_slugs,
)


def test_empty_selection_is_no_filter():
    """``[]`` means "no faction filter", never "match nothing" (#1364)."""
    assert faction_filter_slugs(None) == []
    assert faction_filter_slugs([]) == []
    assert faction_filter_slugs(["", None]) == []


def test_unaffiliated_expands_to_albescent():
    assert faction_filter_slugs([UNAFFILIATED_FACTION_SLUG]) == [
        UNAFFILIATED_FACTION_SLUG,
        ALBESCENT_FACTION_SLUG,
    ]


def test_albescent_is_not_separable():
    """Not refused: a 422 for this one string would itself be the oracle."""
    assert faction_filter_slugs([ALBESCENT_FACTION_SLUG]) == faction_filter_slugs(
        [UNAFFILIATED_FACTION_SLUG]
    )


def test_revealed_caller_may_ask_for_albescent_alone():
    """#2422"""
    assert faction_filter_slugs(
        [ALBESCENT_FACTION_SLUG], reveal_albescent=True
    ) == [ALBESCENT_FACTION_SLUG]


def test_unaffiliated_still_folds_for_a_revealed_caller():
    """The un-fold is one-directional (#2422)."""
    assert faction_filter_slugs(
        [UNAFFILIATED_FACTION_SLUG], reveal_albescent=True
    ) == [UNAFFILIATED_FACTION_SLUG, ALBESCENT_FACTION_SLUG]


def test_reveal_defaults_to_closed():
    assert faction_filter_slugs([ALBESCENT_FACTION_SLUG]) == [
        UNAFFILIATED_FACTION_SLUG,
        ALBESCENT_FACTION_SLUG,
    ]


def test_other_factions_are_untouched():
    assert faction_filter_slugs(["ua"]) == ["ua"]
    assert faction_filter_slugs(["ua", "coven"]) == ["ua", "coven"]


def test_union_keeps_order_and_deduplicates():
    """Repeated ``?faction=`` is a union (#1364); the group joins it once."""
    assert faction_filter_slugs(["ua", UNAFFILIATED_FACTION_SLUG]) == [
        "ua",
        UNAFFILIATED_FACTION_SLUG,
        ALBESCENT_FACTION_SLUG,
    ]
    assert faction_filter_slugs(
        [UNAFFILIATED_FACTION_SLUG, ALBESCENT_FACTION_SLUG]
    ) == [UNAFFILIATED_FACTION_SLUG, ALBESCENT_FACTION_SLUG]


def test_unknown_slug_still_matches_nothing():
    """Collapsing to ``[]`` would make a mistyped deep link show everything."""
    assert faction_filter_slugs(["zzz"]) == ["zzz"]

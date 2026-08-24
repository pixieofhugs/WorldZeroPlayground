"""#1975 — the one translation from a faction *selection* to a predicate.

Unit half. The integration half
(``tests/integration/test_faction_filter_folds_albescent.py``) proves each
faceted route actually routes through this; these pin the rule itself, with no
DB in the way.
"""
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
    """A guessed ``?faction=albescent`` answers exactly what Unaffiliated does.

    Not refused: a 422 for this one string while every other unrecognised slug
    returns 200-with-nothing would itself be the oracle.
    """
    assert faction_filter_slugs([ALBESCENT_FACTION_SLUG]) == faction_filter_slugs(
        [UNAFFILIATED_FACTION_SLUG]
    )


def test_revealed_caller_may_ask_for_albescent_alone():
    """#2422 — the explicit ask un-folds for a caller who has been revealed."""
    assert faction_filter_slugs(
        [ALBESCENT_FACTION_SLUG], reveal_albescent=True
    ) == [ALBESCENT_FACTION_SLUG]


def test_unaffiliated_still_folds_for_a_revealed_caller():
    """The un-fold is one-directional (#2422): ``na`` is still the whole bucket.

    Being revealed lets you ask for Albescent directly; it does not evict
    Albescent from the bucket it hides in, which is the only facet option that
    matches it.
    """
    assert faction_filter_slugs(
        [UNAFFILIATED_FACTION_SLUG], reveal_albescent=True
    ) == [UNAFFILIATED_FACTION_SLUG, ALBESCENT_FACTION_SLUG]


def test_reveal_defaults_to_closed():
    """No viewer, no un-fold — the anti-oracle answer is the default answer."""
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
    """An unrecognised slug arms the filter rather than clearing it.

    ``["zzz"]`` must not collapse to ``[]`` — that would turn a nonsense filter
    into "show everything", which is the shape a mis-typed deep link takes.
    """
    assert faction_filter_slugs(["zzz"]) == ["zzz"]

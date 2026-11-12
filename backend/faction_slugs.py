"""Canonical faction-slug sentinels.

A **leaf** module (no project imports) so every layer can name the same string.
The two ``"na"`` constants are deliberately not aliases: a task's "no faction"
and a character's "no faction" are different concepts.

``na`` and ``albescent`` are structural in every era (ADR-0087). The birth
faction is a rule, not a sentinel: services read ``era.starting_faction_slug``,
never the constant below.
"""

from collections.abc import Iterable

#: A **character** has joined no faction (ADR-0019 / ADR-0030). A real, hidden
#: ``Faction`` row because ``character.faction_slug`` is a non-nullable FK.
UNAFFILIATED_FACTION_SLUG: str = "na"

#: A **task** belongs to no faction: open to all, no own-vs-other penalty.
CROSS_FACTION_SLUG: str = "na"

#: The secret society (ADR-0027). A ``visible`` row whose slug is on the wire,
#: but the *word* is masked client-side for the unrevealed (#1891) and it is
#: never a filter option of its own. ``services.character`` re-exports it.
ALBESCENT_FACTION_SLUG: str = "albescent"

#: The filter bucket ``na`` and ``albescent`` share; a tuple for stable SQL.
_UNAFFILIATED_FILTER_GROUP: tuple[str, ...] = (
    UNAFFILIATED_FACTION_SLUG,
    ALBESCENT_FACTION_SLUG,
)


def faction_filter_slugs(
    selected: Iterable[str | None] | None,
    *,
    reveal_albescent: bool = False,
) -> list[str]:
    """The slugs a caller's faction *filter* must match — #1975's one seam.

    The single translation for every faceted list (tasks, praxes, characters,
    leaderboard), so none can drift and leak.

    **Unaffiliated matches ``na`` OR ``albescent``**: Albescent members are
    shown as Unaffiliated (ADR-0039), so folding them in hides the secret. An
    explicit ``albescent`` is normalised into the same group, never a 422 — a
    refusal for that one slug would be an oracle for its existence.

    ``reveal_albescent`` (#2422): for a revealed caller, an explicit
    ``albescent`` returns the order alone. One-directional by ruling: ``na``
    still expands to both for everyone. Admin roster doesn't use this.

    Empty or all-blank selection returns ``[]`` = "no filter" (#1364).
    """
    out: list[str] = []
    for slug in selected or ():
        if not slug:
            continue
        if slug == ALBESCENT_FACTION_SLUG and reveal_albescent:
            group: tuple[str, ...] = (ALBESCENT_FACTION_SLUG,)
        elif slug in _UNAFFILIATED_FILTER_GROUP:
            group = _UNAFFILIATED_FILTER_GROUP
        else:
            group = (slug,)
        for member in group:
            if member not in out:
                out.append(member)
    return out


def real_faction_slugs(era) -> list[str]:
    """The slugs of ``era``'s *joinable* factions (not ``na``/``albescent``), in order.

    ``era`` is an ``EraConfig``, un-annotated to keep this module a leaf. An era
    with no real faction returns ``[]``; callers choose their own answer.
    """
    return [
        slug
        for slug in era.factions
        if slug not in (UNAFFILIATED_FACTION_SLUG, ALBESCENT_FACTION_SLUG)
    ]

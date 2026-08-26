"""Canonical faction-slug sentinels.

A **leaf** module: it imports nothing of this project's (the single import
below is stdlib and costs no edge), so the pure-math layer
(``services/scoring.py``), the config layer (``game_config.py``), the async
services, the routers and ``seed.py`` can all name the same string without any
of them importing each other. Before #1559 the string ``"na"`` was re-declared
under four different names in six files — including twice under the *same*
name — so a change of mind about the sentinel had six edit sites.

Two constants below share the value ``"na"``. That is deliberate, and they are
**not** aliases: they answer different questions about different rows, and an
era is free to answer them the same way (Era 1 does) without them being one
concept. Collapsing them would hide the day a task's "no faction" and a
character's "no faction" need different slugs.

**Two slugs below are structural, not era-owned** (ADR-0087). ``na`` is the
neutral faction in every era and ``albescent`` is the endgame faction in every
era; both must appear in ``era.factions``, and ``EraConfig.__post_init__``
raises at import if either is missing. Albescent's *gate* is still the era's
(``albescent_level_required``, the coverage rule) — what is fixed is that the
faction exists. Every other faction, and every perk, stays era-owned.

What is *not* here: the faction a character is **born into**. That is still a
rule rather than a sentinel, so it lives on ``EraConfig.starting_faction_slug``
(and ``reset_faction_slug`` for where a rollover returns them). ADR-0087 pins
both to :data:`UNAFFILIATED_FACTION_SLUG`, amending ADR-0042's "the era doc
wins" for those two fields and no others; they are kept as validated fields so
an era author who tries to move the birth faction gets the ruling read back to
them. Services still read ``era.starting_faction_slug``; they must not read the
constant below to answer "what faction does a new character get?" — reopening
the seam is deleting one validation line, and that is the point.
"""

from collections.abc import Iterable

#: A **character** has joined no faction — the unaffiliated state every
#: character is born into by default (ADR-0019 / ADR-0030). This is a real,
#: seeded ``Faction`` row (hidden, so it never appears in the faction registry)
#: because ``character.faction_slug`` is a non-nullable FK. It is *not*
#: :data:`CROSS_FACTION_SLUG`: that one describes a task, this one a player.
UNAFFILIATED_FACTION_SLUG: str = "na"

#: A **task** belongs to no faction — a generic / cross-faction task that any
#: character may take without an own-vs-other scoring penalty
#: (``services.scoring.compute_faction_multiplier``). It is *not*
#: :data:`UNAFFILIATED_FACTION_SLUG`: a cross-faction task is not "a task that
#: failed to join a faction", it is a task deliberately open to all of them.
CROSS_FACTION_SLUG: str = "na"

#: The secret society (ADR-0027). Unlike ``na`` this is a ``visible`` ``Faction``
#: row — its tasks and its members appear in ordinary listings, and the slug is
#: on the wire there — but the *word* is never shown to an account that has not
#: been revealed to it (#1891 / #1926 mask ``factionName()`` client-side), and it
#: is never a filter option of its own.
#:
#: Declared here rather than in ``services.character`` (which now re-exports it,
#: so every existing importer is unchanged) because
#: :func:`faction_filter_slugs` below needs it and this module is the leaf that
#: every layer may import. Membership *rules* still live on the era —
#: ``EraConfig.albescent_level_required``, ``ERA_1.factions["albescent"]``.
ALBESCENT_FACTION_SLUG: str = "albescent"

#: The one filter bucket ``na`` and ``albescent`` share. Order is the answer's
#: order; the group is a tuple rather than a set so a predicate built from it is
#: deterministic (and so the SQL is stable to read in a log).
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

    Every faceted list service turns a caller-supplied faction selection into a
    ``... IN (:slugs)`` predicate. This is the only place that translation
    happens, because the four surfaces sharing the facet
    (``GET /tasks``, ``GET /praxes``, ``GET /characters``, ``GET /leaderboard``)
    would otherwise drift and one of them would leak.

    **Selecting Unaffiliated matches ``na`` OR ``albescent``.** ``default ≡ na ≡
    Unaffiliated`` is one identity (ADR-0039 / ADR-0046 / ADR-0048) and an
    Albescent member is *shown* as Unaffiliated everywhere. Matching on slug
    equality made that identity a lie in one direction only: the facet correctly
    keeps Albescent out of its options, so before this an Albescent row matched
    **no** filter at all — unreachable rather than hidden behind another option.
    Folding it under Unaffiliated is also what preserves the secret, because it
    produces exactly the result an observer would expect if Albescent did not
    exist.

    An explicit ``?faction=albescent`` — a slug a client was never told — is
    **normalised into that same group**, not refused: it answers exactly what
    ``?faction=na`` answers, so the Albescent slice is never separable by any
    query. Rejecting it would be the louder tell: a 422 for this one string
    while every other unrecognised slug returns 200-with-nothing is an oracle
    for the slug's existence.

    ``reveal_albescent`` is who is asking (#2422). The faction detail page asks
    that same ``?faction=albescent`` in good faith on behalf of a member, and
    was handed the prober's answer: every unaffiliated row in the game, rendered
    as members of the order. For a caller
    :func:`services.albescent_reveal.is_albescent_revealed` says yes to, the
    explicit ask un-folds and returns the order alone. It defaults to ``False``,
    so an anonymous or unrevealed caller — and any call site that has no viewer
    to consult — keeps the anti-oracle answer, unchanged. Still never a 422.

    **The un-fold is one-directional, and that is the ruling, not an oversight.**
    ``na`` keeps expanding to both slugs for *everyone*, revealed or not:
    Unaffiliated is the bucket Albescent hides in, and being revealed lets you
    ask for Albescent directly, it does not evict them from the bucket. The facet
    has no Albescent option of its own, so a literal ``na`` would leave Albescent
    rows matching no filter at all — exactly the unreachability #1975 exists to
    fix. Giving Albescent its own facet option is a separate design call.

    Not applied to the admin roster (``services.admin_service``): moderation
    reads the truth, and that surface has no facet of this kind.

    An empty selection — or one holding only blanks, which is what a cleared
    client-side filter sends — returns ``[]``, which every call site reads as
    "no faction filter", never as "match nothing" (#1364).
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

"""Canonical faction-slug sentinels.

A **leaf** module: it imports nothing, so the pure-math layer
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

What is *not* here: the faction a character is **born into**. That is a rule,
not a sentinel, so it lives on ``EraConfig.starting_faction_slug`` (defaulted
to :data:`UNAFFILIATED_FACTION_SLUG`) where an era can override it — ADR-0042,
the era doc wins. Services read ``era.starting_faction_slug``; they must not
read the constant below to answer "what faction does a new character get?".
"""

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

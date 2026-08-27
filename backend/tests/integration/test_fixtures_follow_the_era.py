"""The integration fixtures ask the era for a faction; they never name one (#2708).

**The seam under test is the fixture layer itself** — ``conftest``'s faction
seeding and ``factories``' defaults. That is the one place an integration test
learns which faction it has, and before #2708 the answer was the literal
``"ua"`` in three factory signatures and two seeded rows. Pointing
``CURRENT_ERA`` at an era without UA turned that into 35 failures and 3 modules
that died at import, none of which was a bug in the era's config.

The rule (owner, 2026-08-25) is that **a test may know only that it got *some*
faction, never which one**. So this module asserts the two halves of that:

* the default is *derived* — whatever the live era's first real faction is —
  and every factory reads the same one, so a literal cannot creep back in;
* the seeding covers **every** slug **any** era ever configured, because
  ``character.faction_slug`` is an FK and a closed era's characters are history
  production keeps (``retired``, never deleted). Seeding only the live era's
  roster is the change that made it *worse*: 197 failures instead of 35.

The last test is the point of the whole issue: it drives real scoring under an
era that has no ``ua`` at all, with the multiplier derived from the slug the
fixture actually handed out. ``CURRENT_ERA`` is untouched — the era is passed
explicitly, because ``compute_contributions`` binds its default at ``def`` time
and patching a module attribute would never reach it.
"""
import inspect

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from faction_slugs import (
    ALBESCENT_FACTION_SLUG,
    UNAFFILIATED_FACTION_SLUG,
    real_faction_slugs,
)
from game_config import (
    _ERA_ATTRIBUTE_BY_CONFIG_KEY,
    CURRENT_ERA,
    era_config_for_key,
)
from models.era import Era
from models.faction import Faction, FactionStatus
from seed import HIDDEN_FACTION_SLUGS
from services.praxis_scoring import compute_contributions
from tests.integration import factories
from tests.integration.factories import (
    DEFAULT_FACTION_SLUG,
    cast_vote,
    make_character,
    make_solo_praxis,
    make_task,
)

#: Every era whose ruleset the app can still resolve — the live one and every
#: closed or authored one. This is the set the fixture has to be able to seat a
#: character in, not just the live one.
ALL_ERAS = [
    era_config_for_key(config_key) for config_key in _ERA_ATTRIBUTE_BY_CONFIG_KEY
]

#: An era that is *not* the live one, for the flip rehearsal below. Skipped
#: rather than failed if only one era is configured: the day Era 2 becomes
#: CURRENT_ERA, this file must keep passing without being edited.
OTHER_ERAS = [era for era in ALL_ERAS if era is not CURRENT_ERA]


def test_every_configured_era_has_a_real_faction_to_give():
    """``real_faction_slugs`` answers for every era, not just the live one."""
    for era in ALL_ERAS:
        real = real_faction_slugs(era)
        assert real, f"{era.config_key} configures no non-sentinel faction"
        for slug in real:
            assert slug in era.factions
            assert slug not in (UNAFFILIATED_FACTION_SLUG, ALBESCENT_FACTION_SLUG)


def test_the_fixture_default_is_the_live_eras_first_real_faction():
    """Derived, not named — and never the sentinel.

    ``era.starting_faction_slug`` is the tempting default and the wrong one: it
    is ``na``, which ``faction_filter_slugs`` folds with Albescent for every
    faceted list and which ``compute_faction_multiplier`` reads as own-faction
    for *any* task. Defaulting to it silently changes the answer to ~25
    task-listing tests rather than failing them.
    """
    assert DEFAULT_FACTION_SLUG == real_faction_slugs(CURRENT_ERA)[0]
    assert DEFAULT_FACTION_SLUG in CURRENT_ERA.factions
    assert DEFAULT_FACTION_SLUG != CURRENT_ERA.starting_faction_slug


def test_no_factory_defaults_to_a_named_faction():
    """Every ``faction``-ish keyword in ``factories`` defaults to the one constant.

    Introspected rather than listed, so a factory added later is covered the
    day it is written. This is the guard that stops ``"ua"`` creeping back into
    a signature after the rest of the suite stops caring which faction it got.
    """
    for name, factory in vars(factories).items():
        if not inspect.isfunction(factory):
            continue
        for param in inspect.signature(factory).parameters.values():
            if "faction" not in param.name or not isinstance(param.default, str):
                continue
            assert param.default == DEFAULT_FACTION_SLUG, (
                f"factories.{name}({param.name}={param.default!r}) names a "
                f"faction. Default it to DEFAULT_FACTION_SLUG — a fixture may "
                f"not know which faction it got (#2708)."
            )


async def test_the_fixture_seeds_a_row_for_every_slug_any_era_configured(
    db_session: AsyncSession, some_faction: Faction
):
    """Production's shape: nothing is deleted, the live era decides the status.

    ``upsert_era_factions`` is the mirror production runs on every deploy, and
    the fixture runs that same function rather than inventing a second rule for
    which status a slug gets.
    """
    rows = {
        row.slug: row.status
        for row in (await db_session.execute(select(Faction))).scalars()
    }
    for era in ALL_ERAS:
        for slug in era.factions:
            assert slug in rows, f"{era.config_key}'s {slug!r} has no Faction row"

    for slug in real_faction_slugs(CURRENT_ERA):
        assert rows[slug] is FactionStatus.visible
    for slug in HIDDEN_FACTION_SLUGS & rows.keys():
        assert rows[slug] is FactionStatus.hidden
    for era in OTHER_ERAS:
        for slug in set(era.factions) - set(CURRENT_ERA.factions):
            assert rows[slug] is FactionStatus.retired, (
                f"{slug!r} is in {era.config_key} and not in the live era, so "
                f"production would have retired it, not hidden or dropped it"
            )


@pytest.mark.skipif(not OTHER_ERAS, reason="only one era is configured")
@pytest.mark.parametrize("other_era", OTHER_ERAS, ids=lambda era: era.config_key)
async def test_a_praxis_scores_under_an_era_the_live_roster_never_had(
    db_session: AsyncSession, era: Era, some_faction: Faction, other_era
):
    """The flip rehearsal, without flipping anything.

    A character seated in ``other_era``'s first real faction — a slug the live
    era may not carry at all — completes an own-faction task and is scored with
    that era passed explicitly. The expected number is read off
    ``era.factions[character.faction_slug]``, which is the pattern the seven
    sites that already survive a flip use. Nothing here names a faction and
    nothing here asserts a product: Era 2 has no faction with a baseline task
    modifier, so ``10 x 1.0 = 10`` is an assertion that can never pass there.
    """
    slug = real_faction_slugs(other_era)[0]
    character = await make_character(
        db_session, era, username=f"flip{other_era.config_key}", faction_slug=slug
    )
    voter = await make_character(
        db_session, era, username=f"flipv{other_era.config_key}"
    )
    task = await make_task(db_session, character, faction_slug=slug)
    praxis = await make_solo_praxis(db_session, task, character)
    await cast_vote(db_session, praxis, voter, 4)

    contributions = await compute_contributions(
        [praxis], character, other_era, db_session
    )

    contribution = contributions[praxis.id]
    expected = other_era.factions[character.faction_slug].own_task_modifier
    assert contribution.faction_multiplier == expected
    assert contribution.total == task.point_value * expected + 4

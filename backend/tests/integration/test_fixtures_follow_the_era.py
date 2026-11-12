"""The integration fixtures ask the era for a faction; they never name one (#2708).

Rule: a test may know only that it got *some* faction, never which one.

* the default is derived (live era's first real faction), used by every factory;
* seeding covers every slug any era configured: ``faction_slug`` is an FK and
  closed eras' characters stay (``retired``, never deleted).

The flip rehearsal passes the era explicitly: ``compute_contributions`` binds its
default at ``def`` time, so patching would not reach it.
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

ALL_ERAS = [
    era_config_for_key(config_key) for config_key in _ERA_ATTRIBUTE_BY_CONFIG_KEY
]

#: By ``config_key``, not identity: ``CURRENT_ERA`` is a distinct instance (ADR-0091).
OTHER_ERAS = [era for era in ALL_ERAS if era.config_key != CURRENT_ERA.config_key]


def test_every_configured_era_has_a_real_faction_to_give():
    for era in ALL_ERAS:
        real = real_faction_slugs(era)
        assert real, f"{era.config_key} configures no non-sentinel faction"
        for slug in real:
            assert slug in era.factions
            assert slug not in (UNAFFILIATED_FACTION_SLUG, ALBESCENT_FACTION_SLUG)


def test_the_fixture_default_is_the_live_eras_first_real_faction():
    """Never ``starting_faction_slug`` (``na``): it folds with Albescent and scores
    as own-faction for any task, silently changing ~25 tests."""
    assert DEFAULT_FACTION_SLUG == real_faction_slugs(CURRENT_ERA)[0]
    assert DEFAULT_FACTION_SLUG in CURRENT_ERA.factions
    assert DEFAULT_FACTION_SLUG != CURRENT_ERA.starting_faction_slug


def test_no_factory_defaults_to_a_named_faction():
    """Introspected, so new factories are covered automatically."""
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
    """The fixture runs production's ``upsert_era_factions``."""
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
    """Flip rehearsal: score under another era, expected read off its config."""
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

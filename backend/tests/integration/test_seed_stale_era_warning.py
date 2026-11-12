"""``seed.stale_era_warning``, printed on every deploy (#2705, #827).

The row chooses the era (ADR-0091), so the only bad state is a row whose
``config_key`` no era file registers: the game silently falls back.
"""
import pytest
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, era_config_for_key
from models.character_stats import CharacterStats
from models.era import Era
from seed import stale_era_warning

#: A literal: every registered key is a legitimate live era.
UNREGISTERED_ERA_KEY = "era_from_the_future"


@pytest.mark.asyncio
async def test_no_warning_when_the_live_row_resolves(
    db_session: AsyncSession,
    era: Era,
):
    assert await stale_era_warning(db_session, CURRENT_ERA) is None


@pytest.mark.asyncio
async def test_no_warning_when_the_row_names_a_registered_era_that_is_not_the_first(
    db_session: AsyncSession,
    era: Era,
    account,
):
    other_key = next(
        key
        for key in ("era_1", "era_2")
        if key != CURRENT_ERA.config_key
    )
    db_session.add(
        Era(
            name=era_config_for_key(other_key).name,
            config_key=other_key,
            started_by=account.id,
        )
    )
    await db_session.commit()

    assert await stale_era_warning(db_session, era_config_for_key(other_key)) is None


@pytest.mark.asyncio
async def test_an_unresolvable_row_names_the_key_and_says_what_is_running(
    db_session: AsyncSession,
    era: Era,
    account,
):
    """Names the missing key and the fallback era."""
    db_session.add(
        Era(name="Whatever", config_key=UNREGISTERED_ERA_KEY, started_by=account.id)
    )
    await db_session.commit()

    warning = await stale_era_warning(db_session, CURRENT_ERA)

    assert warning is not None
    assert UNREGISTERED_ERA_KEY in warning
    assert "no era file" in warning
    assert f"fallen back to {CURRENT_ERA.config_key}" in warning


@pytest.mark.asyncio
async def test_an_empty_era_table_warns_rather_than_crashing_the_seed(
    db_session: AsyncSession,
    era: Era,
):
    await db_session.execute(delete(CharacterStats))
    await db_session.execute(delete(Era))
    await db_session.commit()

    warning = await stale_era_warning(db_session, CURRENT_ERA)

    assert warning is not None
    assert "no Era row exists" in warning

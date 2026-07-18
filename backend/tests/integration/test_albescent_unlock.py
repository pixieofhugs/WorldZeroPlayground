"""ADR-0021: the Albescent unlock is account-collective, level and coverage decoupled.

The gate is a *permissions* gate, so these tests pin the axes independently:

* level satisfied / not satisfied, on any character of the account;
* coverage pooled across the whole roster / partial;
* and crucially the case #698 fixed — level on one character, coverage on a
  *different* one. Under the old same-character coupling that account was
  locked out.

Threshold and faction list are read off ``EraConfig`` (never hardcoded); the
tests also drive a ``replace()``-d era to prove the service honours the
argument rather than the module singleton.
"""
from dataclasses import replace

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import CURRENT_ERA, EraConfig
from models.account import Account
from models.character import Character, CharacterStatus
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction, FactionStatus
from models.praxis import ModerationStatus, Praxis, PraxisStatus, PraxisType
from models.task import Task, TaskStatus
from services.character import _ALBESCENT_SENTINEL_SLUGS, can_start_as_albescent


def _required_faction_slugs(era: EraConfig = CURRENT_ERA) -> list[str]:
    """Every faction the coverage gate demands, in a stable order."""
    return [slug for slug in era.factions if slug not in _ALBESCENT_SENTINEL_SLUGS]


async def _seed_faction(db_session: AsyncSession, slug: str) -> None:
    existing = await db_session.scalar(select(Faction).where(Faction.slug == slug))
    if existing is None:
        db_session.add(Faction(slug=slug, status=FactionStatus.visible))
        await db_session.flush()


async def _make_character(
    db_session: AsyncSession,
    account: Account,
    era_row: Era,
    username: str,
    level: int,
    status: CharacterStatus = CharacterStatus.active,
) -> Character:
    """A second/third life on the *same* account, at a given level."""
    character = Character(
        account_id=account.id,
        username=username,
        display_name=username.title(),
        faction_slug="na",
        status=status,
    )
    db_session.add(character)
    await db_session.flush()
    db_session.add(
        CharacterStats(
            character_id=character.id,
            era_id=era_row.id,
            score=0,
            all_time_score=0,
            level=level,
            votes_spent_this_era=0,
        )
    )
    await db_session.commit()
    await db_session.refresh(character)
    return character


async def _set_level(
    db_session: AsyncSession, character: Character, era_row: Era, level: int
) -> None:
    stats = await db_session.scalar(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era_row.id,
        )
    )
    stats.level = level
    await db_session.commit()


async def _complete_task_for(
    db_session: AsyncSession,
    character: Character,
    faction_slug: str,
    *,
    status: PraxisStatus = PraxisStatus.submitted,
    moderation_status: ModerationStatus = ModerationStatus.visible,
) -> None:
    """One submitted, non-hidden praxis on a task whose primary faction is ``faction_slug``."""
    await _seed_faction(db_session, faction_slug)
    task = Task(
        title=f"Albescent coverage: {faction_slug}",
        description="test",
        point_value=5,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=faction_slug,
    )
    db_session.add(task)
    await db_session.flush()
    db_session.add(
        Praxis(
            task_id=task.id,
            created_by_id=character.id,
            type=PraxisType.solo,
            title=f"Albescent coverage praxis: {faction_slug}",
            body_text="proof",
            status=status,
            moderation_status=moderation_status,
        )
    )
    await db_session.commit()


# ---------------------------------------------------------------------------
# Single-character accounts — the classic path still behaves
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_one_character_with_level_and_full_coverage_unlocks(
    db_session: AsyncSession, account: Account, character: Character, era: Era
):
    """Account with a single life that is both high enough and has covered everything."""
    await _set_level(db_session, character, era, CURRENT_ERA.albescent_level_required)
    for slug in _required_faction_slugs():
        await _complete_task_for(db_session, character, slug)

    assert await can_start_as_albescent(account.id, db_session) is True


@pytest.mark.asyncio
async def test_one_character_below_level_stays_locked(
    db_session: AsyncSession, account: Account, character: Character, era: Era
):
    """Full coverage does not substitute for the level gate."""
    await _set_level(
        db_session, character, era, CURRENT_ERA.albescent_level_required - 1
    )
    for slug in _required_faction_slugs():
        await _complete_task_for(db_session, character, slug)

    assert await can_start_as_albescent(account.id, db_session) is False


@pytest.mark.asyncio
async def test_one_character_missing_one_faction_stays_locked(
    db_session: AsyncSession, account: Account, character: Character, era: Era
):
    """Coverage is ALL non-sentinel factions — one short is still short."""
    await _set_level(db_session, character, era, CURRENT_ERA.albescent_level_required)
    for slug in _required_faction_slugs()[:-1]:
        await _complete_task_for(db_session, character, slug)

    assert await can_start_as_albescent(account.id, db_session) is False


# ---------------------------------------------------------------------------
# The #698 case: level and coverage on DIFFERENT characters of one account
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_level_and_coverage_on_different_characters_unlocks(
    db_session: AsyncSession, account: Account, character: Character, era: Era
):
    """ADR-0021's headline case, and the one the old same-character code failed.

    The veteran is at the threshold but has completed nothing; the workhorse has
    covered every faction but is level 0. Pooled across the account, both
    conditions hold, so Albescent unlocks.
    """
    veteran = character
    await _set_level(db_session, veteran, era, CURRENT_ERA.albescent_level_required)

    workhorse = await _make_character(db_session, account, era, "workhorse", level=0)
    for slug in _required_faction_slugs():
        await _complete_task_for(db_session, workhorse, slug)

    assert await can_start_as_albescent(account.id, db_session) is True


@pytest.mark.asyncio
async def test_coverage_pools_across_several_characters(
    db_session: AsyncSession, account: Account, character: Character, era: Era
):
    """No single life covers everything; the account collectively does."""
    slugs = _required_faction_slugs()
    assert len(slugs) >= 2, "era must have >=2 non-sentinel factions for this test"

    await _set_level(db_session, character, era, CURRENT_ERA.albescent_level_required)
    await _complete_task_for(db_session, character, slugs[0])

    sibling = await _make_character(db_session, account, era, "sibling", level=0)
    for slug in slugs[1:]:
        await _complete_task_for(db_session, sibling, slug)

    assert await can_start_as_albescent(account.id, db_session) is True


@pytest.mark.asyncio
async def test_neither_gate_satisfied_stays_locked(
    db_session: AsyncSession, account: Account, character: Character, era: Era
):
    """Several lives, none at level, coverage incomplete even pooled."""
    slugs = _required_faction_slugs()
    await _set_level(
        db_session, character, era, CURRENT_ERA.albescent_level_required - 1
    )
    await _complete_task_for(db_session, character, slugs[0])

    sibling = await _make_character(db_session, account, era, "sibling", level=1)
    if len(slugs) > 2:
        await _complete_task_for(db_session, sibling, slugs[1])

    assert await can_start_as_albescent(account.id, db_session) is False


@pytest.mark.asyncio
async def test_pooled_coverage_without_the_level_stays_locked(
    db_session: AsyncSession, account: Account, character: Character, era: Era
):
    """The two gates are independent, not interchangeable: coverage alone is not enough."""
    await _set_level(db_session, character, era, 0)
    sibling = await _make_character(db_session, account, era, "sibling", level=1)
    for slug in _required_faction_slugs():
        await _complete_task_for(db_session, sibling, slug)

    assert await can_start_as_albescent(account.id, db_session) is False


# ---------------------------------------------------------------------------
# Scope guards: other accounts, non-roster lives, non-qualifying praxes
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_another_accounts_coverage_does_not_count(
    db_session: AsyncSession,
    account: Account,
    account2: Account,
    character: Character,
    character2: Character,
    era: Era,
):
    """Pooling is per-account, not global."""
    await _set_level(db_session, character, era, CURRENT_ERA.albescent_level_required)
    for slug in _required_faction_slugs():
        await _complete_task_for(db_session, character2, slug)

    assert await can_start_as_albescent(account.id, db_session) is False


@pytest.mark.asyncio
async def test_paused_life_contributes_coverage(
    db_session: AsyncSession, account: Account, character: Character, era: Era
):
    """A paused life is still one of the player's own lives (``_ROSTER_STATUSES``)."""
    await _set_level(db_session, character, era, CURRENT_ERA.albescent_level_required)
    paused = await _make_character(
        db_session, account, era, "paused", level=0, status=CharacterStatus.paused
    )
    for slug in _required_faction_slugs():
        await _complete_task_for(db_session, paused, slug)

    assert await can_start_as_albescent(account.id, db_session) is True


@pytest.mark.asyncio
async def test_banned_life_does_not_contribute_coverage(
    db_session: AsyncSession, account: Account, character: Character, era: Era
):
    """A banned life's work does not carry the account through the gate."""
    await _set_level(db_session, character, era, CURRENT_ERA.albescent_level_required)
    banned = await _make_character(
        db_session, account, era, "bannedlife", level=0, status=CharacterStatus.banned
    )
    for slug in _required_faction_slugs():
        await _complete_task_for(db_session, banned, slug)

    assert await can_start_as_albescent(account.id, db_session) is False


@pytest.mark.asyncio
async def test_banned_life_does_not_satisfy_the_level_gate(
    db_session: AsyncSession, account: Account, character: Character, era: Era
):
    """The level gate reads active lives only."""
    await _set_level(db_session, character, era, 0)
    for slug in _required_faction_slugs():
        await _complete_task_for(db_session, character, slug)
    await _make_character(
        db_session,
        account,
        era,
        "bannedvet",
        level=CURRENT_ERA.albescent_level_required,
        status=CharacterStatus.banned,
    )

    assert await can_start_as_albescent(account.id, db_session) is False


@pytest.mark.asyncio
async def test_unsubmitted_praxis_does_not_count_toward_coverage(
    db_session: AsyncSession, account: Account, character: Character, era: Era
):
    """Coverage is completed work: an in-progress praxis is not a completion."""
    slugs = _required_faction_slugs()
    await _set_level(db_session, character, era, CURRENT_ERA.albescent_level_required)
    for slug in slugs[:-1]:
        await _complete_task_for(db_session, character, slug)
    await _complete_task_for(
        db_session, character, slugs[-1], status=PraxisStatus.in_progress
    )

    assert await can_start_as_albescent(account.id, db_session) is False


@pytest.mark.asyncio
async def test_hidden_praxis_does_not_count_toward_coverage(
    db_session: AsyncSession, account: Account, character: Character, era: Era
):
    """Moderation-hidden work is not coverage; flagged-but-visible work is."""
    slugs = _required_faction_slugs()
    await _set_level(db_session, character, era, CURRENT_ERA.albescent_level_required)
    for slug in slugs[:-1]:
        await _complete_task_for(db_session, character, slug)
    await _complete_task_for(
        db_session,
        character,
        slugs[-1],
        moderation_status=ModerationStatus.hidden,
    )
    assert await can_start_as_albescent(account.id, db_session) is False

    # Same praxis, flagged rather than hidden -> counts, and the gate opens.
    await _complete_task_for(
        db_session,
        character,
        slugs[-1],
        moderation_status=ModerationStatus.flagged,
    )
    assert await can_start_as_albescent(account.id, db_session) is True


@pytest.mark.asyncio
async def test_account_with_no_characters_stays_locked(
    db_session: AsyncSession, account: Account, era: Era
):
    assert await can_start_as_albescent(account.id, db_session) is False


# ---------------------------------------------------------------------------
# The threshold comes from the era argument, not the module singleton
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_level_threshold_is_read_from_the_era_argument(
    db_session: AsyncSession, account: Account, character: Character, era: Era
):
    """A stricter EraConfig locks an account that CURRENT_ERA would unlock."""
    await _set_level(db_session, character, era, CURRENT_ERA.albescent_level_required)
    for slug in _required_faction_slugs():
        await _complete_task_for(db_session, character, slug)
    assert await can_start_as_albescent(account.id, db_session) is True

    strict_era = replace(
        CURRENT_ERA,
        albescent_level_required=CURRENT_ERA.albescent_level_required + 1,
    )
    assert await can_start_as_albescent(account.id, db_session, strict_era) is False


@pytest.mark.asyncio
async def test_coverage_faction_set_is_read_from_the_era_argument(
    db_session: AsyncSession, account: Account, character: Character, era: Era
):
    """Coverage demands exactly the era's non-sentinel factions.

    Narrow the era to a single faction and one completion is enough; the
    sentinels (``na``, ``albescent``) are never demanded.
    """
    slugs = _required_faction_slugs()
    await _set_level(db_session, character, era, CURRENT_ERA.albescent_level_required)
    await _complete_task_for(db_session, character, slugs[0])
    assert await can_start_as_albescent(account.id, db_session) is False

    narrow_era = replace(
        CURRENT_ERA,
        factions={
            faction_slug: faction_config
            for faction_slug, faction_config in CURRENT_ERA.factions.items()
            if faction_slug in _ALBESCENT_SENTINEL_SLUGS or faction_slug == slugs[0]
        },
    )
    assert await can_start_as_albescent(account.id, db_session, narrow_era) is True

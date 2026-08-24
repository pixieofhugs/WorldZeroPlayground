"""#2399: one life earns Albescent, its siblings take it, and the earner never can.

Supersedes the ADR-0021 tests this file used to hold. Three separate things are
pinned here, because the re-cut only makes sense as all three at once:

* **Earn** — :func:`character_earns_albescent` is a *same-character* predicate:
  one life, at ``era.albescent_level_required``, that has been invited to or has
  held every joinable faction this era. Coverage = invitation letters UNION the
  life's current faction UNION its :class:`FactionDefectionHistory` rows.
* **Stamp** — the account column is sticky and monotonic, written by
  ``recalculate_character_stats`` and never unwritten. The *read*
  (``can_start_as_albescent``) is the column, not a live recomputation, which is
  what makes the unlock survive an era reset.
* **Take / never the earner** — ``defect_to_faction`` gains a level **ceiling**.
  It is the only maximum-level gate in the game; every other one is a floor.

The threshold and the faction list are read off ``EraConfig`` (never hardcoded),
and several tests drive a ``replace()``-d era to prove the services honour the
argument rather than the module singleton.
"""
from dataclasses import replace

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode
from game_config import CURRENT_ERA, EraConfig
from models.account import Account
from models.character import Character, CharacterStatus
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction, FactionStatus
from models.faction_defection_history import FactionDefectionHistory
from models.invitation_letter import InvitationLetter
from models.praxis import ModerationStatus, Praxis, PraxisStatus, PraxisType
from models.task import Task, TaskStatus
from services.character import (
    _ALBESCENT_SENTINEL_SLUGS,
    can_start_as_albescent,
    character_earns_albescent,
    get_account_invited_faction_slugs,
    stamp_albescent_unlock,
)
from services.character_stats import recalculate_character_stats
from services.faction_service import defect_to_faction


def _joinable_faction_slugs(era: EraConfig = CURRENT_ERA) -> list[str]:
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
    faction_slug: str = "na",
    status: CharacterStatus = CharacterStatus.active,
) -> Character:
    """Another life on the *same* account, at a given level and faction."""
    await _seed_faction(db_session, faction_slug)
    character = Character(
        account_id=account.id,
        username=username,
        display_name=username.title(),
        faction_slug=faction_slug,
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


async def _give_letter(
    db_session: AsyncSession, character: Character, era_row: Era, slug: str
) -> None:
    await _seed_faction(db_session, slug)
    db_session.add(
        InvitationLetter(
            character_id=character.id, faction_slug=slug, era_id=era_row.id
        )
    )
    await db_session.commit()


async def _record_defection(
    db_session: AsyncSession, character: Character, era_row: Era, slug: str
) -> None:
    """A faction this life has *held and left* — the half a letter can never show."""
    await _seed_faction(db_session, slug)
    db_session.add(
        FactionDefectionHistory(
            character_id=character.id, faction_slug=slug, era_id=era_row.id
        )
    )
    await db_session.commit()


async def _cover_everything(
    db_session: AsyncSession, character: Character, era_row: Era
) -> None:
    """Full coverage, deliberately split across all three sources.

    The life *holds* the first slug, has *left* the second, and holds letters for
    the rest — so a predicate that reads only one of the three cannot pass this.
    """
    slugs = _joinable_faction_slugs()
    await _seed_faction(db_session, slugs[0])
    character.faction_slug = slugs[0]
    await db_session.commit()
    await _record_defection(db_session, character, era_row, slugs[1])
    for slug in slugs[2:]:
        await _give_letter(db_session, character, era_row, slug)


# ---------------------------------------------------------------------------
# Earn — the same-character predicate
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_one_life_at_the_level_covering_everything_earns(
    db_session: AsyncSession, account: Account, character: Character, era: Era
):
    await _set_level(db_session, character, era, CURRENT_ERA.albescent_level_required)
    await _cover_everything(db_session, character, era)

    assert await character_earns_albescent(character, era.id, db_session) is True


@pytest.mark.asyncio
async def test_coverage_without_the_level_does_not_earn(
    db_session: AsyncSession, account: Account, character: Character, era: Era
):
    await _set_level(
        db_session, character, era, CURRENT_ERA.albescent_level_required - 1
    )
    await _cover_everything(db_session, character, era)

    assert await character_earns_albescent(character, era.id, db_session) is False


@pytest.mark.asyncio
async def test_the_level_without_full_coverage_does_not_earn(
    db_session: AsyncSession, account: Account, character: Character, era: Era
):
    await _set_level(db_session, character, era, CURRENT_ERA.albescent_level_required)
    for slug in _joinable_faction_slugs()[:-1]:
        await _give_letter(db_session, character, era, slug)

    assert await character_earns_albescent(character, era.id, db_session) is False


@pytest.mark.asyncio
async def test_level_on_one_life_and_coverage_on_another_does_not_earn(
    db_session: AsyncSession, account: Account, character: Character, era: Era
):
    """The binding ADR-0021 rejected and #2399 restores: **both on one life**.

    Under ADR-0021 this exact account unlocked. It must not any more.
    """
    await _set_level(db_session, character, era, CURRENT_ERA.albescent_level_required)
    coverer = await _make_character(db_session, account, era, "coverer", level=1)
    await _cover_everything(db_session, coverer, era)

    assert await character_earns_albescent(character, era.id, db_session) is False
    assert await character_earns_albescent(coverer, era.id, db_session) is False
    assert await stamp_albescent_unlock(character, era.id, db_session) is False
    assert await stamp_albescent_unlock(coverer, era.id, db_session) is False
    assert await can_start_as_albescent(account.id, db_session) is False


@pytest.mark.asyncio
async def test_a_banned_life_never_earns(
    db_session: AsyncSession, account: Account, era: Era
):
    """A banned life's work does not carry the account through the gate."""
    banned = await _make_character(
        db_session,
        account,
        era,
        "banned",
        level=CURRENT_ERA.albescent_level_required,
        status=CharacterStatus.banned,
    )
    await _cover_everything(db_session, banned, era)

    assert await character_earns_albescent(banned, era.id, db_session) is False


@pytest.mark.asyncio
async def test_earn_honours_the_era_argument_not_the_singleton(
    db_session: AsyncSession, account: Account, character: Character, era: Era
):
    await _set_level(db_session, character, era, 1)
    await _cover_everything(db_session, character, era)

    lenient = replace(CURRENT_ERA, albescent_level_required=1)
    assert await character_earns_albescent(character, era.id, db_session) is False
    assert await character_earns_albescent(character, era.id, db_session, lenient) is True


# ---------------------------------------------------------------------------
# Stamp — sticky, monotonic, and what the read actually reads
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_the_read_is_the_column_not_a_live_recomputation(
    db_session: AsyncSession, account: Account, character: Character, era: Era
):
    """Coverage that would earn, but was never stamped, does **not** open the door.

    This is the whole point of the column: the unlock is a fact about the past,
    recorded, not re-derived — because after an era reset there is nothing left
    to derive it from.
    """
    await _set_level(db_session, character, era, CURRENT_ERA.albescent_level_required)
    await _cover_everything(db_session, character, era)

    assert await can_start_as_albescent(account.id, db_session) is False

    assert await stamp_albescent_unlock(character, era.id, db_session) is True
    await db_session.commit()
    assert await can_start_as_albescent(account.id, db_session) is True


@pytest.mark.asyncio
async def test_the_stamp_is_monotonic(
    db_session: AsyncSession, account: Account, character: Character, era: Era
):
    """Once set it is never unset — not by losing coverage, not by a re-stamp."""
    await _set_level(db_session, character, era, CURRENT_ERA.albescent_level_required)
    await _cover_everything(db_session, character, era)
    assert await stamp_albescent_unlock(character, era.id, db_session) is True
    await db_session.commit()

    # Everything that earned it goes away.
    await db_session.execute(
        InvitationLetter.__table__.delete().where(
            InvitationLetter.character_id == character.id
        )
    )
    await db_session.execute(
        FactionDefectionHistory.__table__.delete().where(
            FactionDefectionHistory.character_id == character.id
        )
    )
    character.faction_slug = "na"
    await _set_level(db_session, character, era, 0)

    # A second stamp is a no-op (already unlocked), and the flag stands.
    assert await stamp_albescent_unlock(character, era.id, db_session) is False
    assert await can_start_as_albescent(account.id, db_session) is True


@pytest.mark.asyncio
async def test_recalculate_character_stats_stamps_the_unlock(
    db_session: AsyncSession, account: Account, character: Character, era: Era
):
    """The stamp point is the recalc — where level and letters both already move."""
    await _cover_everything(db_session, character, era)
    await _seed_faction(db_session, "na")
    task = Task(
        title="Something worth a level",
        description="test",
        point_value=10,
        level_required=0,
        status=TaskStatus.active,
        created_by=character.id,
        primary_faction_slug=_joinable_faction_slugs()[0],
    )
    db_session.add(task)
    await db_session.flush()
    db_session.add(
        Praxis(
            task_id=task.id,
            created_by_id=character.id,
            type=PraxisType.solo,
            title="proof",
            body_text="proof",
            status=PraxisStatus.submitted,
            moderation_status=ModerationStatus.visible,
        )
    )
    await db_session.commit()

    # `albescent_level_required=1` so 10 points is enough to clear the bar; the
    # era's own level_thresholds still decide what level the score buys.
    cheap = replace(CURRENT_ERA, albescent_level_required=1)
    await recalculate_character_stats(character.id, db_session, cheap, era_row=era)
    await db_session.commit()

    await db_session.refresh(account)
    assert account.albescent_unlocked is True


@pytest.mark.asyncio
async def test_no_backfill_a_fresh_account_starts_locked(
    db_session: AsyncSession, account: Account, era: Era
):
    assert account.albescent_unlocked is False
    assert await can_start_as_albescent(account.id, db_session) is False


# ---------------------------------------------------------------------------
# Take, and never the earner — the ceiling
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_a_low_level_sibling_takes_albescent(
    db_session: AsyncSession, account: Account, character: Character, era: Era
):
    """Ungated by the *taker's* own progress — the account already paid."""
    account.albescent_unlocked = True
    await db_session.commit()
    await _seed_faction(db_session, "albescent")
    sibling = await _make_character(db_session, account, era, "sibling", level=0)

    joined = await defect_to_faction(sibling, "albescent", db_session)
    assert joined.faction_slug == "albescent"


@pytest.mark.asyncio
async def test_the_earner_at_the_ceiling_is_refused(
    db_session: AsyncSession, account: Account, character: Character, era: Era
):
    """"Available only for New Game+" — the game's one MAXIMUM level gate."""
    account.albescent_unlocked = True
    await db_session.commit()
    await _seed_faction(db_session, "albescent")
    await _set_level(db_session, character, era, CURRENT_ERA.albescent_level_required)

    with pytest.raises(Exception) as excinfo:
        await defect_to_faction(character, "albescent", db_session)
    assert (
        excinfo.value.detail["code"]
        == ErrorCode.faction_albescent_new_game_plus_only.value
    )


@pytest.mark.asyncio
async def test_one_level_below_the_ceiling_still_walks_in(
    db_session: AsyncSession, account: Account, character: Character, era: Era
):
    """The boundary is ``>=``, so the level *below* the bar is the last that fits."""
    account.albescent_unlocked = True
    await db_session.commit()
    await _seed_faction(db_session, "albescent")
    await _set_level(
        db_session, character, era, CURRENT_ERA.albescent_level_required - 1
    )

    joined = await defect_to_faction(character, "albescent", db_session)
    assert joined.faction_slug == "albescent"


@pytest.mark.asyncio
async def test_a_locked_account_is_still_refused_at_the_door(
    db_session: AsyncSession, account: Account, character: Character, era: Era
):
    await _seed_faction(db_session, "albescent")
    with pytest.raises(Exception) as excinfo:
        await defect_to_faction(character, "albescent", db_session)
    assert (
        excinfo.value.detail["code"] == ErrorCode.faction_albescent_not_eligible.value
    )


# ---------------------------------------------------------------------------
# Character creation — the other door the unlock opens
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_creation_pool_offers_albescent_once_unlocked(
    db_session: AsyncSession, account: Account, character: Character, era: Era
):
    """A new life is born at level 0, so it can never be the earner — no ceiling here."""
    assert "albescent" not in await get_account_invited_faction_slugs(
        account.id, db_session
    )

    account.albescent_unlocked = True
    await db_session.commit()

    assert "albescent" in await get_account_invited_faction_slugs(
        account.id, db_session
    )

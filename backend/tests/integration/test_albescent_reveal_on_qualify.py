"""#2518: reveal Albescent on QUALIFY, not only on join.

An earned-but-unjoined account was offered the calling while its tile read
"Unaffiliated". Seam: ``services.albescent_reveal.is_albescent_revealed``, read via
``/auth/me``'s ``albescent_revealed`` (the frontend mask's only input).

Must NOT widen with it: the join side (``defect_to_faction``'s guard) and the
level ceiling. A qualified account is level 8, so a reveal predicate that read
the character's level would shut the only path in (#2399). The ceiling matrix
lives in ``test_albescent_unlock.py``.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode
from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction, FactionStatus


async def _seed_faction(session: AsyncSession, slug: str) -> None:
    existing = await session.scalar(select(Faction).where(Faction.slug == slug))
    if existing is None:
        session.add(Faction(slug=slug, status=FactionStatus.visible))
        await session.flush()


async def _set_level(
    session: AsyncSession, character: Character, era_row: Era, level: int
) -> None:
    stats = await session.scalar(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era_row.id,
        )
    )
    stats.level = level
    await session.commit()


async def _qualify(session: AsyncSession, account: Account) -> None:
    """Stamp the unlock only (never joined); how it is earned is tested elsewhere."""
    account.albescent_unlocked = True
    await session.commit()


@pytest.mark.asyncio
async def test_qualified_but_never_joined_account_is_revealed(
    client: AsyncClient,
    character: Character,
    account: Account,
    auth_headers: dict,
    era: Era,
    db_session: AsyncSession,
):
    """Both flags open together; reveal is derived, not a second sticky write."""
    await _seed_faction(db_session, "albescent")
    await _qualify(db_session, account)

    me = (await client.get("/auth/me", headers=auth_headers)).json()
    assert me["can_start_as_albescent"] is True
    assert me["albescent_revealed"] is True

    invited = (await client.get("/me/invited-factions", headers=auth_headers)).json()
    assert "albescent" in invited
    # One row per slug: two "Unaffiliated" tiles was part of the bug.
    assert len(invited) == len(set(invited))

    # Derived, not written.
    await db_session.refresh(account)
    assert account.albescent_revealed is False


@pytest.mark.asyncio
async def test_unqualified_account_still_gets_the_mask(
    client: AsyncClient,
    character: Character,
    account: Account,
    auth_headers: dict,
    era: Era,
    db_session: AsyncSession,
):
    """Widening reveal must not hand the WORD to someone who has not earned it.

    ADR-0082's boundary: ``albescent_revealed`` stays False (the client's redaction
    gate); the creation chooser still drops the row (#1891 ruling 3); ``/factions``
    serves it redacted (#2409).
    """
    await _seed_faction(db_session, "albescent")

    me = (await client.get("/auth/me", headers=auth_headers)).json()
    assert me["can_start_as_albescent"] is False
    assert me["albescent_revealed"] is False

    listed = (await client.get("/factions", headers=auth_headers)).json()
    assert "albescent" in [f["slug"] for f in listed]

    invited = (await client.get("/me/invited-factions", headers=auth_headers)).json()
    assert "albescent" not in invited


@pytest.mark.asyncio
async def test_the_ceiling_does_not_reach_the_reveal(
    client: AsyncClient,
    character: Character,
    account: Account,
    auth_headers: dict,
    era: Era,
    db_session: AsyncSession,
):
    """#2399 guard: reveal is account-scoped and says yes; the ceiling is
    character-scoped and still says no. The level-0 sibling is created from here.
    """
    await _seed_faction(db_session, "albescent")
    await _qualify(db_session, account)
    await _set_level(db_session, character, era, CURRENT_ERA.albescent_level_required)

    me = (await client.get("/auth/me", headers=auth_headers)).json()
    assert me["albescent_revealed"] is True
    invited = (await client.get("/me/invited-factions", headers=auth_headers)).json()
    assert "albescent" in invited

    resp = await client.post(
        "/factions/choose",
        json={"faction_slug": "albescent"},
        headers=auth_headers,
    )
    assert resp.status_code == 403
    assert (
        resp.json()["detail"]["code"]
        == ErrorCode.faction_albescent_new_game_plus_only.value
    )


@pytest.mark.asyncio
async def test_reveal_survives_the_eviction_that_unset_no_column(
    client: AsyncClient,
    character: Character,
    account: Account,
    auth_headers: dict,
    era: Era,
    db_session: AsyncSession,
):
    """Joined long ago, evicted by #2399, still revealed: widening is an ``or``."""
    await _seed_faction(db_session, "albescent")
    account.albescent_revealed = True
    account.albescent_unlocked = False
    await db_session.commit()

    me = (await client.get("/auth/me", headers=auth_headers)).json()
    assert me["albescent_revealed"] is True
    assert me["can_start_as_albescent"] is False

    listed = (await client.get("/factions", headers=auth_headers)).json()
    assert "albescent" in [f["slug"] for f in listed]


@pytest.mark.asyncio
async def test_qualifying_does_not_open_the_join_gate_for_a_stranger(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
):
    """Revealed-but-not-unlocked is refused with the eligibility code, not ceiling."""
    from services.faction_service import defect_to_faction

    await _seed_faction(db_session, "albescent")
    account.albescent_revealed = True
    await db_session.commit()

    with pytest.raises(Exception) as excinfo:
        await defect_to_faction(character, "albescent", db_session)
    assert (
        excinfo.value.detail["code"] == ErrorCode.faction_albescent_not_eligible.value
    )


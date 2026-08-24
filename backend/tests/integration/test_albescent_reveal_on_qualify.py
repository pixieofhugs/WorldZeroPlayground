"""#2518: reveal on QUALIFY, not on join — the last gap between earning and being told.

#2409 §6 held this open; it is now ruled. An account that has **earned** the
Albescent door but never **joined** used to be offered the calling at character
creation while the tile read "Unaffiliated": ``can_start_as_albescent`` opened
off the stamped ``account.albescent_unlocked`` column, and
``is_albescent_revealed`` stayed shut because ``account.albescent_revealed``
only flips on a join. Two flags, one door, and only one of them opened.

The seam is :func:`services.albescent_reveal.is_albescent_revealed` — the one
predicate every "may this account be told the society exists" surface asks. The
wire field these tests read, ``/auth/me``'s ``albescent_revealed``, is that
predicate's only route to the frontend mask (``utils/factions.factionName``),
so pinning it here pins the tile's label without a browser.

Post-#2399 that is every future member: the reveal column is sticky and only a
join ever wrote it, so an account qualifying under the new rule has never had it
set. See #2518's repro note — the owner account joined *before* #2399 re-cut the
gate, which is why it is the one account on the system that cannot reproduce it.

**What must NOT widen with it.** Two things, and both have a test below:

* The **join** side. ``can_start_as_albescent`` is an *input* to reveal now, not
  a peer, and ``defect_to_faction``'s guard is untouched. The reverse asymmetry
  — ``is_admin`` reveals without granting (#2400) — is pinned in
  ``test_albescent_admin_reveal.py`` and is unaffected by this widening.
* The **ceiling**. ``defect_to_faction``'s maximum-level gate is a fact about the
  joining *character*; a qualified account is by definition a level-8 account,
  and a fix that read "the account is at the ceiling, so hide it" would shut the
  only path into the faction (#2399's New Game+ shape). The reveal predicate has
  no character in hand and must never grow one.

The ceiling's own behaviour — earner refused, level-0 sibling admitted — is
already pinned in ``test_albescent_unlock.py`` and is not restated here; what is
tested below is only that the *reveal* did not learn about it.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode
from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character, CharacterStatus
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
    """Stamp the unlock and nothing else — never joined, so reveal stays unwritten.

    Deliberately does not go through ``character_earns_albescent``: how the door
    was earned has its own tests in ``test_albescent_unlock.py``, and stamping
    directly is what keeps *this* file about the reveal.
    """
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
    """The bug, at the wire field the creation tile reads.

    Both flags now open together, and the column stays unwritten — reveal is
    *derived* from the unlock, not a second sticky write that could drift from
    it.
    """
    await _seed_faction(db_session, "albescent")
    await _qualify(db_session, account)

    me = (await client.get("/auth/me", headers=auth_headers)).json()
    assert me["can_start_as_albescent"] is True
    assert me["albescent_revealed"] is True

    invited = (await client.get("/me/invited-factions", headers=auth_headers)).json()
    assert "albescent" in invited
    # One row per slug: two "Unaffiliated" tiles was the louder half of the bug.
    assert len(invited) == len(set(invited))

    # Derived, not written. A second sticky write is a second definition.
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

    Two of the three assertions below are unchanged by #2409 and one is
    inverted, and the split is exactly ADR-0082's boundary:

    * ``albescent_revealed`` on ``/auth/me`` stays False — that flag is what the
      client's redaction gate reads, so it is now the whole of the mask rather
      than a hint about a filter.
    * the creation CHOOSER still drops the row. #1891 ruling 3 is untouched:
      masking a chooser hands an unrevealed player two identical rows, which is
      louder than the leak it replaces. A directory tile LABELS something;
      ``/me/invited-factions`` builds a picker.
    * ``/factions`` now SERVES the row (#2409). The eighth card renders for this
      account and every string on it redacts.
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
    """The earner sees the name it can no longer take — and the door still refuses it.

    This is the #2399 regression guard. The account that earned the door is by
    definition at ``era.albescent_level_required``; if the widened predicate ever
    grows a character-level test, this account goes dark and the faction becomes
    unreachable, because the level-0 sibling that *can* join is created from this
    very screen.

    Reveal is account-scoped and says yes. The ceiling is character-scoped and
    still says no. Both, at once, is the correct state.
    """
    await _seed_faction(db_session, "albescent")
    await _qualify(db_session, account)
    await _set_level(db_session, character, era, CURRENT_ERA.albescent_level_required)

    me = (await client.get("/auth/me", headers=auth_headers)).json()
    assert me["albescent_revealed"] is True
    invited = (await client.get("/me/invited-factions", headers=auth_headers)).json()
    assert "albescent" in invited

    # ...and the door is still shut to *this* life.
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
    """The owner-account shape: joined long ago, evicted by #2399, still revealed.

    Widening is a union, never a replacement. An account whose sticky column was
    written by an old join keeps the reveal even though it no longer qualifies —
    #2399 moved ``faction_slug`` and touched neither flag. Guards against
    "reveal = unlocked" being written as an assignment rather than an ``or``.
    """
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
    """Seeing is not joining, from the other side: reveal alone grants nothing.

    An account that is revealed-but-not-unlocked is refused at the door with the
    *eligibility* code, not the ceiling code — proof the two gates read different
    columns and that the widening ran one way only.
    """
    from services.faction_service import defect_to_faction

    await _seed_faction(db_session, "albescent")
    account.albescent_revealed = True
    await db_session.commit()

    with pytest.raises(Exception) as excinfo:
        await defect_to_faction(character, "albescent", db_session)
    assert (
        excinfo.value.detail["code"] == ErrorCode.faction_albescent_not_eligible.value
    )


@pytest.mark.asyncio
async def test_a_level_zero_sibling_on_a_qualified_account_still_joins(
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
):
    """The only path into the faction, asserted alongside the reveal that names it.

    ``test_albescent_unlock.py`` owns the ceiling's full matrix; this restates the
    one branch #2518 names as the thing a careless fix would break.
    """
    from services.faction_service import defect_to_faction

    await _seed_faction(db_session, "albescent")
    await _qualify(db_session, account)
    await _set_level(db_session, character, era, CURRENT_ERA.albescent_level_required)

    sibling = Character(
        account_id=account.id,
        username="newgameplus",
        display_name="New Game Plus",
        faction_slug="na",
        status=CharacterStatus.active,
    )
    await _seed_faction(db_session, "na")
    db_session.add(sibling)
    await db_session.commit()
    await db_session.refresh(sibling)

    joined = await defect_to_faction(sibling, "albescent", db_session)
    assert joined.faction_slug == "albescent"

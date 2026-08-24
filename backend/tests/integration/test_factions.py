"""Integration tests for /factions endpoints."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode
from models.account import Account
from models.character import Character
from models.era import Era
from models.faction import Faction, FactionStatus


# ---------------------------------------------------------------------------
# List factions (public)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_factions_returns_visible(
    client: AsyncClient,
    faction_ua: Faction,
):
    """GET /factions returns only visible factions."""
    resp = await client.get("/factions")
    assert resp.status_code == 200
    data = resp.json()
    slugs = [f["slug"] for f in data]
    # "ua" is visible; seeded in faction_ua fixture
    assert "ua" in slugs
    # "na" is hidden; must not appear
    assert "na" not in slugs


@pytest.mark.asyncio
async def test_list_factions_structure(
    client: AsyncClient,
    faction_ua: Faction,
):
    """Each faction in the list has the expected fields.

    ADR-0038: the backend emits slug + status only; name/description prose lives
    in the frontend factions.json catalog and is never returned here.
    """
    resp = await client.get("/factions")
    assert resp.status_code == 200
    for faction in resp.json():
        assert "slug" in faction
        assert "status" in faction
        assert "name" not in faction
        assert "description" not in faction


# ---------------------------------------------------------------------------
# Faction status (authenticated — requires era seed)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_faction_status_authenticated(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    faction_ua: Faction,
    era: Era,
):
    """GET /factions/status returns current faction and status map."""
    resp = await client.get("/factions/status", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "current_faction_slug" in data
    assert "all_factions" in data
    assert data["current_faction_slug"] == character.faction_slug


@pytest.mark.asyncio
async def test_faction_status_unauthenticated(client: AsyncClient):
    """GET /factions/status without auth returns 401."""
    resp = await client.get("/factions/status")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_faction_status_carries_invitation_letters(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    faction_ua: Faction,
    era: Era,
    db_session: AsyncSession,
):
    """The letters the deleted /factions/invitations returned now ride on /status (#1384).

    Asserts the VALUE, not merely the field's presence: the ``delivered_at`` the
    fold emits must be the stored letter's own timestamp, because the two routes
    always read the exact same rows.
    """
    from datetime import datetime

    from sqlalchemy import select

    from models.invitation_letter import InvitationLetter

    db_session.add(InvitationLetter(
        character_id=character.id,
        faction_slug="ua",
        era_id=era.id,
    ))
    await db_session.commit()

    stored = (await db_session.execute(
        select(InvitationLetter).where(InvitationLetter.character_id == character.id)
    )).scalars().one()

    resp = await client.get("/factions/status", headers=auth_headers)
    assert resp.status_code == 200
    letters = resp.json()["invitations"]
    assert [letter["faction_slug"] for letter in letters] == ["ua"]
    assert datetime.fromisoformat(letters[0]["delivered_at"]) == stored.delivered_at


@pytest.mark.asyncio
async def test_faction_status_invitations_empty_without_letters(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    faction_ua: Faction,
    era: Era,
):
    """Holding no letters, the folded array is present and empty — never absent."""
    resp = await client.get("/factions/status", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["invitations"] == []


@pytest.mark.asyncio
async def test_invitations_endpoint_is_gone(
    client: AsyncClient,
    auth_headers: dict,
):
    """GET /factions/invitations is deleted — it ran /status's exact query (#1384)."""
    resp = await client.get("/factions/invitations", headers=auth_headers)
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Defection history
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Choose faction (defection)
# ---------------------------------------------------------------------------


async def _seed_invitation(
    session: AsyncSession,
    character_id: int,
    faction_slug: str,
    era_id: int,
) -> None:
    """Seed the invitation letter that gates defecting into faction_slug (#454)."""
    from models.invitation_letter import InvitationLetter

    session.add(InvitationLetter(
        character_id=character_id,
        faction_slug=faction_slug,
        era_id=era_id,
    ))
    await session.commit()


@pytest.mark.asyncio
async def test_choose_faction_with_invitation_succeeds(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    faction_ua: Faction,
    era: Era,
    db_session: AsyncSession,
):
    """A character holding wow's current-era invitation can defect into wow."""
    from models.faction import Faction as FactionModel
    from sqlalchemy import select

    # Seed the wow faction in the DB (required for FK constraint)
    existing = await db_session.execute(select(FactionModel).where(FactionModel.slug == "wow"))
    if existing.scalar_one_or_none() is None:
        db_session.add(FactionModel(
            slug="wow",
            status=FactionStatus.visible,
        ))
        await db_session.commit()

    await _seed_invitation(db_session, character.id, "wow", era.id)

    resp = await client.post(
        "/factions/choose",
        json={"faction_slug": "wow"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    # The choose POST answers the refreshed CurrentUser, so the caller never has
    # to re-ask /auth/me for the membership it just caused (#1383).
    assert resp.json()["character"]["faction_slug"] == "wow"


@pytest.mark.asyncio
async def test_choose_faction_without_invitation_forbidden(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    faction_ua: Faction,
    era: Era,
    db_session: AsyncSession,
):
    """Defecting into a faction without holding its invitation letter is 403 (#454)."""
    await _seed_faction(db_session, "wow")
    await db_session.commit()

    resp = await client.post(
        "/factions/choose",
        json={"faction_slug": "wow"},
        headers=auth_headers,
    )
    assert resp.status_code == 403
    assert character.faction_slug == "ua"


# ---------------------------------------------------------------------------
# Albescent join gate (ADR-0021, #395)
# ---------------------------------------------------------------------------


async def _seed_faction(session: AsyncSession, slug: str) -> None:
    """Seed a Faction row (FK target) if it doesn't already exist."""
    from sqlalchemy import select

    existing = await session.execute(select(Faction).where(Faction.slug == slug))
    if existing.scalar_one_or_none() is None:
        session.add(Faction(
            slug=slug,
            status=FactionStatus.visible,
        ))
        await session.flush()


async def _make_account_albescent_eligible(
    session: AsyncSession,
    character: Character,
    era: Era,
) -> None:
    """Put ``character`` in a state where the Albescent door opens for it (#2399).

    Two facts, and they are about two different things — which is the whole
    shape of the re-cut (ADR-0080):

    * the **account** holds the stamped unlock. How it was earned is not this
      file's question; the earn predicate has its own tests in
      ``test_albescent_unlock.py``, and stamping directly here keeps these tests
      about reveal, listing and stickiness rather than re-deriving the rule.
    * the **character** is below ``era.albescent_level_required``. It has to be:
      #2399's ceiling means a life *at* the bar can never take Albescent, so a
      helper that left it at level 8 would be setting up the one state in which
      every join below is refused.

    This replaces the ADR-0021 seeding (level 8 + a submitted praxis per
    faction), which measured coverage a way the game no longer counts.
    """
    from sqlalchemy import select

    from game_config import CURRENT_ERA
    from models.character_stats import CharacterStats

    account = await session.get(Account, character.account_id)
    account.albescent_unlocked = True

    result = await session.execute(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era.id,
        )
    )
    stats = result.scalar_one()
    stats.level = CURRENT_ERA.albescent_level_required - 1
    await session.commit()


@pytest.mark.asyncio
async def test_choose_albescent_ineligible_forbidden(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    era: Era,
    db_session: AsyncSession,
):
    """An account that hasn't met the ADR-0021 bar gets 403 defecting to Albescent.

    Albescent's can_always_rejoin=True clears the defection guard, so the
    eligibility guard must still refuse the join.
    """
    await _seed_faction(db_session, "albescent")
    await db_session.commit()

    resp = await client.post(
        "/factions/choose",
        json={"faction_slug": "albescent"},
        headers=auth_headers,
    )
    assert resp.status_code == 403
    assert character.faction_slug == "ua"


@pytest.mark.asyncio
async def test_choose_albescent_eligible_succeeds(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    era: Era,
    db_session: AsyncSession,
):
    """An eligible account (level 8 + full faction coverage) may defect to Albescent.

    No invitation letter is seeded: `can_always_rejoin` supersedes the #454
    invitation gate — the ADR-0021 eligibility bar is Albescent's only gate.
    """
    await _seed_faction(db_session, "albescent")
    await _make_account_albescent_eligible(db_session, character, era)

    resp = await client.post(
        "/factions/choose",
        json={"faction_slug": "albescent"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["character"]["faction_slug"] == "albescent"
    # The sticky ADR-0027 reveal arrives in the SAME answer as the join. This is
    # the case that most needed the widened response (#1383): joining is what
    # reveals the secret society, and the client used to learn that only on the
    # follow-up /auth/me.
    assert body["albescent_revealed"] is True


@pytest.mark.asyncio
async def test_choose_nonexistent_faction(
    client: AsyncClient,
    character: Character,
    auth_headers: dict,
    era: Era,
):
    """Choosing a faction not in the era config returns 404."""
    resp = await client.post(
        "/factions/choose",
        json={"faction_slug": "does_not_exist"},
        headers=auth_headers,
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Albescent secret-society reveal gate (ADR-0027, #390)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_factions_serves_albescent_to_an_unrevealed_account(
    client: AsyncClient,
    account: Account,
    auth_headers: dict,
    faction_ua: Faction,
    db_session: AsyncSession,
):
    """The row is served to everyone now — redaction happens at the render (#2409).

    This case is the LEFT side of the reveal predicate and it is deliberately
    the un-qualified one: no ``albescent_unlocked``, no ``albescent_revealed``,
    no admin role. Before #2409 that account got a seven-row list; it now gets
    the eighth row like everybody else, and what it does NOT get is the word —
    ``utils/factions.ts`` resolves every Albescent-scoped string to
    ``[REDACTED]`` for a viewer whose ``/auth/me`` says unrevealed.

    Moving the row across the wire moves the boundary, which is the whole point
    of ADR-0082: the server no longer withholds the *row*, and this test is what
    pins that. Withholding the row's CONTENTS is the follow-on ADR-0082 enables;
    until it lands, ``FactionOut`` is `{slug, status}` and carries no prose to
    leak.
    """
    await _seed_faction(db_session, "albescent")
    await db_session.commit()

    resp = await client.get("/factions", headers=auth_headers)
    assert resp.status_code == 200
    slugs = [f["slug"] for f in resp.json()]
    assert "albescent" in slugs
    assert "ua" in slugs
    # The account is genuinely on the unrevealed side — otherwise this passes
    # for the wrong reason the moment a fixture starts stamping the unlock.
    await db_session.refresh(account)
    assert account.albescent_revealed is False
    assert account.albescent_unlocked is False


@pytest.mark.asyncio
async def test_list_factions_serves_albescent_to_an_anonymous_caller(
    client: AsyncClient,
    faction_ua: Faction,
    db_session: AsyncSession,
):
    """No auth at all is still the unrevealed side, and it still gets the row.

    ``list_factions`` took an optional-auth dependency for exactly one reason —
    to answer "is this viewer revealed?" — so #2409 deleted the dependency along
    with the filter rather than leave a resolved-and-ignored account behind. A
    signed-out visitor and a signed-in unrevealed one get byte-identical lists,
    which is the strongest statement that the listing no longer depends on who
    is asking.
    """
    await _seed_faction(db_session, "albescent")
    await db_session.commit()

    resp = await client.get("/factions")
    assert resp.status_code == 200
    slugs = [f["slug"] for f in resp.json()]
    assert "albescent" in slugs
    assert "ua" in slugs


@pytest.mark.asyncio
async def test_albescent_join_reveals_and_lists(
    client: AsyncClient,
    character: Character,
    account: Account,
    auth_headers: dict,
    era: Era,
    db_session: AsyncSession,
):
    """A successful Albescent defect flips albescent_revealed and keeps the
    faction listed in GET /factions for that account.

    Since #2518 the listing is already open before the join — reveal follows
    QUALIFY, and this account is qualified by construction, so there is no
    pre-join hidden state left to assert here. The masked case moved to
    ``test_list_factions_serves_albescent_to_an_unrevealed_account`` (no unlock,
    a served row and a redacted word) and to ``test_albescent_reveal_on_qualify.py``.

    What is still this test's own: the *column write*. ``albescent_revealed``
    stays load-bearing rather than subsumed by the unlock, because an account
    that joined before #2399 existed carries the reveal without ever having been
    stamped — the owner account's shape. The join is what writes it.
    """
    await _seed_faction(db_session, "albescent")
    await _make_account_albescent_eligible(db_session, character, era)

    # Pre-join: already listed, because qualifying is now what reveals (#2518).
    before = await client.get("/factions", headers=auth_headers)
    assert "albescent" in [f["slug"] for f in before.json()]
    await db_session.refresh(account)
    assert account.albescent_revealed is False

    resp = await client.post(
        "/factions/choose",
        json={"faction_slug": "albescent"},
        headers=auth_headers,
    )
    assert resp.status_code == 200

    # The sticky flag is now set on the account.
    await db_session.refresh(account)
    assert account.albescent_revealed is True

    # And the faction now surfaces for this account.
    after = await client.get("/factions", headers=auth_headers)
    assert "albescent" in [f["slug"] for f in after.json()]


@pytest.mark.asyncio
async def test_the_ladder_rung_is_display_only_never_the_gate(
    client: AsyncClient,
    character: Character,
    account: Account,
    auth_headers: dict,
    era: Era,
    db_session: AsyncSession,
):
    """The ``join_albescent`` rung is announcement copy, never the gate (#1891).

    Eligibility is decided by the stamped ``account.albescent_unlocked`` column
    in ``services.character`` (ADR-0080) plus the ceiling in
    ``services.faction_service``, neither of which ever consults
    ``level_profiles`` — this is the tripwire for anyone who later routes the
    gate through the ladder and turns a display filter into an enforcement gate.

    #2518 flipped which direction demonstrates it. This test used to show a
    *hidden* rung over a working ability: an account could qualify without being
    revealed, so the ladder stayed dark while the door stood open. That state is
    exactly the defect #2518 closed and is now unreachable — qualifying reveals.

    The gap survives the other way round, and that is what runs below: an
    account revealed by an old join but never stamped (the owner account's shape
    after #2399's eviction) is *shown* the rung and still refused at the door.
    Display says yes, enforcement says no, and the two are read off different
    columns — which is the same tripwire, from the side that still exists.
    """
    await _seed_faction(db_session, "albescent")
    account.albescent_revealed = True
    await db_session.commit()

    # The rung IS on this account's ladder — it is revealed...
    config = (await client.get("/game-config", headers=auth_headers)).json()
    keys = {
        unlock["key"]
        for profile in config["level_profiles"]
        for unlock in profile["unlocks"]
    }
    assert "join_albescent" in keys

    # ...but the ability it describes has NOT fired: nothing stamped the door.
    me = (await client.get("/auth/me", headers=auth_headers)).json()
    assert me["albescent_revealed"] is True
    assert me["can_start_as_albescent"] is False

    # And the join it advertises is refused, on the eligibility code — proof the
    # gate read the unlock column and not the ladder that just showed the rung.
    resp = await client.post(
        "/factions/choose",
        json={"faction_slug": "albescent"},
        headers=auth_headers,
    )
    assert resp.status_code == 403
    assert (
        resp.json()["detail"]["code"] == ErrorCode.faction_albescent_not_eligible.value
    )


@pytest.mark.asyncio
async def test_albescent_reveal_is_sticky_not_derived_from_membership(
    client: AsyncClient,
    character: Character,
    account: Account,
    auth_headers: dict,
    era: Era,
    db_session: AsyncSession,
):
    """Reveal survives leaving Albescent — it is not derived from live membership.

    After joining (which reveals), the character defects back to a real faction;
    the flag stays True and the faction stays listed."""
    await _seed_faction(db_session, "albescent")
    await _make_account_albescent_eligible(db_session, character, era)

    join = await client.post(
        "/factions/choose",
        json={"faction_slug": "albescent"},
        headers=auth_headers,
    )
    assert join.status_code == 200

    # Leave Albescent for a real faction (albescent can_always_rejoin). Leaving
    # still means joining wow, so the character needs wow's Faction row and its
    # invitation letter (#454) — the ADR-0021 seeding used to create every
    # faction row as a side effect of pooling praxes across them, and #2399's
    # helper does not, so the row is asked for here explicitly.
    await _seed_faction(db_session, "wow")
    await _seed_invitation(db_session, character.id, "wow", era.id)
    leave = await client.post(
        "/factions/choose",
        json={"faction_slug": "wow"},
        headers=auth_headers,
    )
    assert leave.status_code == 200

    await db_session.refresh(character)
    assert character.faction_slug != "albescent"

    # Flag persists even with no live Albescent membership.
    await db_session.refresh(account)
    assert account.albescent_revealed is True

    listed = await client.get("/factions", headers=auth_headers)
    assert "albescent" in [f["slug"] for f in listed.json()]


# ADR-0038: the admin faction-copy edit path (PUT /factions/{slug},
# update_faction, FactionUpdate) has been retired — faction name/description
# prose is config-canonical and lives in frontend/src/locales/en/factions.json,
# so there is nothing to edit through the API. No update tests remain.

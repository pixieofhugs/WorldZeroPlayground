"""The two paths into ``status = banned``, and what they cost (#1577).

A player deleting their own life and a moderator banning someone land in the same
row state by two different code paths. Before #1577 those paths disagreed:
``DELETE /characters/{id}`` forfeited every settled duel the character was a side
of, ``POST /admin/characters/{id}/ban`` did not — while ADR-0011 §Forfeit names
"the ban / soft-delete of a side's character" as one trigger.

**The seam under test is the HTTP route on both sides**, not the shared service
function. The bug was never in the forfeit loop — it was that one caller never
reached it — so a test at ``forfeit_settled_duels_for_character`` would have
passed on the broken code. Everything below drives ``POST /admin/characters/
{id}/ban`` or ``DELETE /characters/{id}``.

The self-delete forfeit's own regression test predates this file and stays where
it is: ``test_votes.py::test_self_deletion_forfeits_settled_duels``.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from errors import ErrorCode, detail_code
from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character, CharacterStatus
from models.duel import Duel, DuelStatus
from models.era import Era
from models.faction import Faction
from tests.integration.factories import (
    make_admin,
    make_character,
    make_duel,
    make_solo_praxis,
    make_task,
)


async def _ban(client: AsyncClient, character_id: int, headers: dict, banned: bool):
    return await client.post(
        f"/admin/characters/{character_id}/ban",
        json={"banned": banned},
        headers=headers,
    )


async def _duel_win_multiplier(praxis_id: int, viewer: Character, session: AsyncSession):
    """The duel modifier the scoring path assigns ``viewer`` for their side."""
    from services.praxis import get_praxis
    from services.praxis_scoring import compute_contributions

    praxis = await get_praxis(praxis_id, session)
    contributions = await compute_contributions(
        [praxis], viewer, CURRENT_ERA, session
    )
    return contributions[praxis_id].duel_multiplier


# ---------------------------------------------------------------------------
# Ruling 1 — a moderator ban forfeits, exactly as a self-deletion does
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_moderator_ban_forfeits_every_settled_duel(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    auth_headers: dict,
    era: Era,
    some_faction: Faction,
):
    """ADR-0011 §Forfeit: banning a side forfeits it and the opponent wins by default.

    This is the assertion that failed before #1577 — the ban route set ``status``
    and nothing else, so a banned duellist's opponent went on waiting for a tally.
    """
    await make_admin(db_session, account)
    # "Every duel the character is a side of" means both sides of the row: the
    # Duel names only the opponent, and the challenger is whoever authored the
    # challenger praxis. The banned character sits on one of each.
    as_opponent, challenger, banned_character = await make_duel(
        db_session, era, label="banfft"
    )
    other = await make_character(db_session, era, username="banfftother")
    task = await make_task(db_session, banned_character)
    as_challenger = Duel(
        task_id=task.id,
        challenger_praxis_id=(
            await make_solo_praxis(db_session, task, banned_character)
        ).id,
        opponent_character_id=other.id,
        opponent_praxis_id=(await make_solo_praxis(db_session, task, other)).id,
        status=DuelStatus.settled,
    )
    db_session.add(as_challenger)
    await db_session.flush()

    resp = await _ban(client, banned_character.id, auth_headers, banned=True)
    assert resp.status_code == 200, resp.text

    await db_session.refresh(as_opponent)
    assert as_opponent.status == DuelStatus.settled, "a forfeit does not reopen the duel"
    assert as_opponent.forfeited_by_character_id == banned_character.id

    await db_session.refresh(as_challenger)
    assert as_challenger.forfeited_by_character_id == banned_character.id

    win = CURRENT_ERA.factions[challenger.faction_slug].duel_win_modifier
    assert (
        await _duel_win_multiplier(
            as_opponent.challenger_praxis_id, challenger, db_session
        )
        == win
    )


@pytest.mark.asyncio
async def test_moderator_ban_leaves_an_already_forfeited_duel_alone(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    auth_headers: dict,
    era: Era,
    some_faction: Faction,
):
    """Sticky (ADR-0011): the first forfeit is the record and is never overwritten."""
    await make_admin(db_session, account)
    duel, challenger, opponent = await make_duel(
        db_session, era, label="bansticky", forfeiter="challenger"
    )

    assert (await _ban(client, opponent.id, auth_headers, banned=True)).status_code == 200

    await db_session.refresh(duel)
    assert duel.forfeited_by_character_id == challenger.id


@pytest.mark.asyncio
async def test_self_deletion_leaves_an_already_forfeited_duel_alone(
    db_session: AsyncSession,
    era: Era,
    some_faction: Faction,
):
    """The other half of stickiness — the same guard, reached by the other path."""
    from services.character import soft_delete_character

    duel, challenger, opponent = await make_duel(
        db_session, era, label="delsticky", forfeiter="challenger"
    )

    await soft_delete_character(opponent.id, db_session)

    await db_session.refresh(duel)
    assert duel.forfeited_by_character_id == challenger.id


# ---------------------------------------------------------------------------
# Ruling 2 — departed_at tells the two paths apart
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_self_deletion_stamps_departed_at(
    client: AsyncClient,
    db_session: AsyncSession,
    character: Character,
    auth_headers: dict,
):
    """``DELETE /characters/{id}`` records that the player left, not that we banned them."""
    resp = await client.delete(f"/characters/{character.id}", headers=auth_headers)
    assert resp.status_code == 204, resp.text

    await db_session.refresh(character)
    assert character.status == CharacterStatus.banned
    assert character.departed_at is not None


@pytest.mark.asyncio
async def test_moderator_ban_leaves_departed_at_null(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character2: Character,
    auth_headers: dict,
):
    """A ban is not a departure. Only ``soft_delete_character`` ever writes the column."""
    await make_admin(db_session, account)

    assert (await _ban(client, character2.id, auth_headers, banned=True)).status_code == 200

    await db_session.refresh(character2)
    assert character2.status == CharacterStatus.banned
    assert character2.departed_at is None


@pytest.mark.asyncio
async def test_a_departed_character_reads_exactly_like_a_banned_one(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    auth_headers: dict,
):
    """Ruling 2 added a column, not a status — so no existing read changed.

    ``departed_at`` was chosen over a third ``CharacterStatus`` value precisely so
    that every read meaning "not playable" keeps working untouched. The two checked
    here are the ones the issue names: the account roster (``_ROSTER_STATUSES``)
    and ``admin_service.list_active_characters``'s non-banned select.
    """
    from services.admin_service import list_active_characters
    from services.character import list_account_roster

    assert (
        await client.delete(f"/characters/{character.id}", headers=auth_headers)
    ).status_code == 204
    await db_session.refresh(character)
    assert character.departed_at is not None

    roster = await list_account_roster(account, db_session)
    assert character.id not in {row[0].id for row in roster}

    active = await list_active_characters(db_session)
    assert character.id not in {entry.id for entry in active}


# ---------------------------------------------------------------------------
# Ruling 3 — the un-ban leg
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_unban_restores_a_moderator_banned_character(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character2: Character,
    auth_headers: dict,
):
    """The reverse leg still works for the case it was built for."""
    await make_admin(db_session, account)

    assert (await _ban(client, character2.id, auth_headers, banned=True)).status_code == 200
    resp = await _ban(client, character2.id, auth_headers, banned=False)

    assert resp.status_code == 200
    assert resp.json()["banned"] is False
    await db_session.refresh(character2)
    assert character2.status == CharacterStatus.active


@pytest.mark.asyncio
async def test_unban_refuses_a_departed_character(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    auth_headers: dict,
):
    """An admin reversing a moderation action must not resurrect someone who left.

    Both paths land in ``status = banned``, so without ``departed_at`` the toggle
    cannot tell "I banned this yesterday" from "this player deleted their own life"
    — and it would silently do the second while an admin thought they were doing
    the first. 409, with a code, because the refusal is about the row's state.
    """
    await make_admin(db_session, account)
    assert (
        await client.delete(f"/characters/{character.id}", headers=auth_headers)
    ).status_code == 204

    resp = await _ban(client, character.id, auth_headers, banned=False)

    assert resp.status_code == 409, resp.text
    assert (
        detail_code(resp.json()["detail"])
        == ErrorCode.character_departed_not_restorable.value
    )
    await db_session.refresh(character)
    assert character.status == CharacterStatus.banned


@pytest.mark.asyncio
async def test_unban_does_not_restore_a_duel_the_ban_forfeited(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    auth_headers: dict,
    era: Era,
    some_faction: Faction,
):
    """Un-banning reverses the status and nothing else — the forfeit is sticky.

    ADR-0011 records ``forfeited_by_character_id`` on the first forfeit and never
    overwrites it, so once the ban route forfeits, banning is destructive on first
    use even though the toggle reads as reversible. #1577 names that consequence
    and explicitly leaves it standing rather than adding an un-forfeit, so this
    test pins the *chosen* behaviour, not an oversight: any future un-forfeit is a
    deliberate change that has to argue with ADR-0011 and fail here first.
    """
    await make_admin(db_session, account)
    duel, challenger, opponent = await make_duel(db_session, era, label="unbanfft")

    assert (await _ban(client, opponent.id, auth_headers, banned=True)).status_code == 200
    assert (await _ban(client, opponent.id, auth_headers, banned=False)).status_code == 200

    await db_session.refresh(duel)
    await db_session.refresh(opponent)
    assert opponent.status == CharacterStatus.active
    assert duel.forfeited_by_character_id == opponent.id
    win = CURRENT_ERA.factions[challenger.faction_slug].duel_win_modifier
    assert (
        await _duel_win_multiplier(duel.challenger_praxis_id, challenger, db_session)
        == win
    )

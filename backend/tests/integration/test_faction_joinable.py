"""#3168: ``joinable`` on the faction status row is the move's own answer.

The seam is ``GET /factions/status`` against ``defect_to_faction``. Both decide
through ``services.faction_service.move_refusal``; this file is what keeps it
that way. Every scenario asks the door about EVERY slug the era lists (plus the
unaffiliated sentinel and a slug nobody has), so a lock added to the door
outside ``move_refusal`` makes some cell here accept-or-refuse differently from
its ``joinable`` and fails — no list of cases to remember to extend.
"""

from dataclasses import replace

import pytest
from fastapi import HTTPException
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from faction_slugs import UNAFFILIATED_FACTION_SLUG
from game_config import CURRENT_ERA
from models.account import Account
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction, FactionStatus
from models.faction_defection_history import FactionDefectionHistory
from models.invitation_letter import InvitationLetter
from services.character import ALBESCENT_FACTION_SLUG
from services.faction_service import defect_to_faction, load_move_facts, move_refusal

CEILING = CURRENT_ERA.albescent_level_required
REJOINER = "wow"  # any non-Albescent faction; made always-rejoin in `FUTURE_ERA`
FUTURE_ERA = replace(
    CURRENT_ERA,
    factions={
        **CURRENT_ERA.factions,
        REJOINER: replace(CURRENT_ERA.factions[REJOINER], can_always_rejoin=True),
    },
)
LETTERED = ["ua", "snide", "wow", "coven"]


async def _setup(
    db, account, character, era_row, *, letters=(), left=(), unlocked=False, level=0
):
    for slug in CURRENT_ERA.factions:
        if await db.scalar(select(Faction).where(Faction.slug == slug)) is None:
            db.add(Faction(slug=slug, status=FactionStatus.visible))
    await db.flush()
    for slug in letters:
        db.add(
            InvitationLetter(
                character_id=character.id, faction_slug=slug, era_id=era_row.id
            )
        )
    for slug in left:
        db.add(
            FactionDefectionHistory(
                character_id=character.id, faction_slug=slug, era_id=era_row.id
            )
        )
    account.albescent_unlocked = unlocked
    stats = await db.scalar(
        select(CharacterStats).where(
            CharacterStats.character_id == character.id,
            CharacterStats.era_id == era_row.id,
        )
    )
    if stats is None:
        stats = CharacterStats(character_id=character.id, era_id=era_row.id)
        db.add(stats)
    stats.level = level
    await db.commit()


# name -> (setup kwargs, era the door reads, slugs the door should accept)
SCENARIOS = {
    "fresh": ({}, CURRENT_ERA, set()),
    "holds_letters": ({"letters": LETTERED}, CURRENT_ERA, set(LETTERED)),
    "left_and_cannot_return": (
        {"left": ["coven"], "letters": ["coven"]},
        CURRENT_ERA,
        set(),
    ),
    "always_rejoin_left_no_letter": ({"left": [REJOINER]}, FUTURE_ERA, {REJOINER}),
    "albescent_locked": ({"unlocked": False, "level": 0}, CURRENT_ERA, set()),
    "albescent_unlocked_below_ceiling": (
        {"unlocked": True, "level": CEILING - 1},
        CURRENT_ERA,
        {ALBESCENT_FACTION_SLUG},
    ),
    "albescent_unlocked_at_ceiling": (
        {"unlocked": True, "level": CEILING},
        CURRENT_ERA,
        set(),
    ),
}


@pytest.mark.asyncio
@pytest.mark.parametrize("name", SCENARIOS)
async def test_joinable_is_exactly_whether_the_move_is_accepted(
    name, db_session: AsyncSession, account: Account, character: Character, era: Era
):
    kwargs, era_cfg, expected = SCENARIOS[name]
    await _setup(db_session, account, character, era, **kwargs)
    current, character_id, era_id = character.faction_slug, character.id, era.id
    targets = [*CURRENT_ERA.factions, UNAFFILIATED_FACTION_SLUG, "no-such-faction"]
    accepted = set()
    for slug in targets:
        char = await db_session.get(Character, character_id)
        facts = await load_move_facts(char, era_id, db_session, era_cfg)
        refusal = move_refusal(slug, facts, era_cfg)
        try:
            await defect_to_faction(char, slug, db_session, era_cfg)
            moved = True
        except HTTPException as exc:
            moved = False
            assert refusal is not None, (name, slug)
            assert (exc.status_code, exc.detail) == (
                refusal.status_code,
                refusal.detail,
            ), (name, slug)
        finally:
            await db_session.rollback()  # setup was committed; the move was not
        assert moved == (refusal is None), (name, slug)
        if moved:
            accepted.add(slug)
    assert accepted == expected - {current}


@pytest.mark.asyncio
async def test_status_route_serves_joinable(
    client: AsyncClient,
    db_session: AsyncSession,
    account: Account,
    character: Character,
    era: Era,
    auth_headers: dict,
):
    await _setup(
        db_session,
        account,
        character,
        era,
        letters=["coven"],
        unlocked=True,
        level=CEILING - 1,
    )
    rows = {
        r["slug"]: r
        for r in (await client.get("/factions/status", headers=auth_headers)).json()[
            "all_factions"
        ]
    }
    assert rows["coven"]["joinable"] is True
    assert rows[ALBESCENT_FACTION_SLUG]["joinable"] is True
    assert (
        rows[ALBESCENT_FACTION_SLUG]["status"] == "not_invited"
    )  # the word is unchanged
    assert rows["ua"]["joinable"] is False  # no letter
    assert rows[character.faction_slug]["joinable"] is False  # current faction
    assert not rows.get(UNAFFILIATED_FACTION_SLUG, {}).get("joinable", False)

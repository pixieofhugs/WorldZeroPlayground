"""Bodies the Era 1 and Era 2 rule tests share; only era and control faction differ."""
from sqlalchemy.ext.asyncio import AsyncSession

from game_config import EraConfig
from models.era import Era
from models.faction_defection_history import FactionDefectionHistory
from models.praxis import PraxisStatus
from seed import upsert_era_factions
from services.praxis import evaluate_signup
from tests.integration.factories import (
    make_character,
    make_solo_praxis,
    make_task,
    rejoin_gate_open,
)


async def signup_one_level_up(
    session: AsyncSession, era: Era, cfg: EraConfig, faction_slug: str
) -> bool:
    await upsert_era_factions(session, cfg)
    member = await make_character(
        session, era, username=f"{faction_slug}jumper", faction_slug=faction_slug
    )
    task = await make_task(
        session, member, title="One up", level_required=1, faction_slug=faction_slug
    )
    return (await evaluate_signup(member, task, session, cfg)).allowed


async def signup_on_task_already_held(
    session: AsyncSession, era: Era, cfg: EraConfig, faction_slug: str
) -> bool:
    await upsert_era_factions(session, cfg)
    member = await make_character(
        session, era, username=f"{faction_slug}dipper", faction_slug=faction_slug
    )
    task = await make_task(session, member, faction_slug=faction_slug)
    await make_solo_praxis(session, task, member, status=PraxisStatus.in_progress)
    return (await evaluate_signup(member, task, session, cfg)).allowed


async def rejoin_after_defection(
    session: AsyncSession, era: Era, cfg: EraConfig, faction_slug: str
) -> bool:
    await upsert_era_factions(session, cfg)
    defector = await make_character(
        session, era, username=f"{faction_slug}exile", faction_slug="na"
    )
    session.add(
        FactionDefectionHistory(
            character_id=defector.id, faction_slug=faction_slug, era_id=era.id
        )
    )
    await session.flush()
    return await rejoin_gate_open(defector.id, faction_slug, era.id, session, cfg)

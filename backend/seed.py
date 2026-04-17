"""
Seed script for World Zero — production bootstrap.

Prerequisites: run `alembic upgrade head` first.
Migrations handle schema. This script adds:
  - Factions (from the era config)
  - Era row
  - Pixie admin account + character + admin role
  - All live tasks (from the era config)

Run from /backend:
    python seed.py               # dev (default)
    python seed.py --env prod --yes
"""

import argparse
import asyncio
import sys

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from sqlalchemy import func, select, text

from game_config import CURRENT_ERA
from script_utils import add_env_argument, get_settings
from models.account import Account, OAuthProvider
from models.character import Character
from models.character_stats import CharacterStats
from models.era import Era
from models.faction import Faction, FactionStatus
from models.meta_task import BonusType, MetaTask
from models.roles import AccountRole, Role
from models.task import Task, TaskStatus


# ---------------------------------------------------------------------------
# Faction status mapping
# ---------------------------------------------------------------------------
# System factions that should be hidden in the UI.
HIDDEN_FACTION_SLUGS = frozenset({"aged_out", "na"})


# ---------------------------------------------------------------------------
# Main seed function
# ---------------------------------------------------------------------------

async def seed(env: str, yes: bool) -> None:
    era = CURRENT_ERA
    settings = get_settings(env)
    db_host = settings.DATABASE_URL.split("@")[-1]

    print(f"Environment : {env}")
    print(f"Database    : {db_host}")
    print(f"Era         : {era.name} ({era.config_key})\n")

    if env == "prod" and not yes:
        print("WARNING: You are about to seed a PRODUCTION database.")
        print(f"Target: {db_host}\n")
        answer = input("Type 'yes' to continue: ").strip()
        if answer != "yes":
            print("Aborted.")
            sys.exit(0)

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    async with async_session() as session:

        # Check what's already present
        pixie_result = await session.execute(
            select(Account).where(Account.email == "pixieofhugs@gmail.com")
        )
        pixie_acc = pixie_result.scalar_one_or_none()

        task_count = (await session.execute(select(func.count()).select_from(Task))).scalar()

        if pixie_acc and task_count > 0:
            print("Database already fully seeded (pixie account + tasks exist). Nothing to do.")
            await engine.dispose()
            return

        print("Seeding World Zero...\n")

        # ------------------------------------------------------------------
        # Phase 1: Factions (from era config, upsert)
        # ------------------------------------------------------------------
        faction_count = 0
        for slug, faction_config in era.factions.items():
            existing = await session.execute(
                select(Faction).where(Faction.slug == slug)
            )
            if existing.scalar_one_or_none() is None:
                status = FactionStatus.hidden if slug in HIDDEN_FACTION_SLUGS else FactionStatus.visible
                session.add(Faction(
                    slug=slug,
                    name=faction_config.name,
                    description=faction_config.description,
                    status=status,
                ))
                faction_count += 1
        await session.flush()
        if faction_count > 0:
            print(f"  >Factions ({faction_count} new)")
        else:
            print("  >Factions already exist — skipping")

        # ------------------------------------------------------------------
        # Phase 2: Admin bootstrap (Pixie account + character + role)
        # ------------------------------------------------------------------
        if pixie_acc:
            print("  >Pixie account already exists — skipping account/era/admin setup")
            pixie_char_result = await session.execute(
                select(Character).where(Character.account_id == pixie_acc.id).limit(1)
            )
            pixie_char = pixie_char_result.scalar_one()
        else:
            print("  >Pixie account")
            pixie_acc = Account(email="pixieofhugs@gmail.com")
            session.add(pixie_acc)
            await session.flush()

            session.add(OAuthProvider(
                account_id=pixie_acc.id,
                provider="google",
                provider_user_id="google_pixie",
                access_token="seed_token",
            ))

            pixie_char = Character(
                account_id=pixie_acc.id,
                username="pixie",
                display_name="Pixie",
                bio="",
                faction_slug="ua",
            )
            session.add(pixie_char)
            await session.flush()

            # ------------------------------------------------------------------
            # Era
            # ------------------------------------------------------------------
            print(f"  >{era.name}")
            era_row = Era(
                name=era.name,
                config_key=era.config_key,
                started_by=pixie_acc.id,
            )
            session.add(era_row)
            await session.flush()

            # ------------------------------------------------------------------
            # Admin role + grant
            # ------------------------------------------------------------------
            print("  >Admin role -> pixie")
            admin_role = Role(name="admin", description="Full administrative access")
            session.add(admin_role)
            await session.flush()

            session.add(AccountRole(
                account_id=pixie_acc.id,
                role_id=admin_role.id,
                granted_by=pixie_acc.id,
            ))

            # ------------------------------------------------------------------
            # CharacterStats (pixie starts at zero)
            # ------------------------------------------------------------------
            session.add(CharacterStats(
                character_id=pixie_char.id,
                era_id=era_row.id,
                score=0,
                all_time_score=0,
                level=0,
                votes_spent_this_era=0,
            ))
            await session.flush()

        # ------------------------------------------------------------------
        # Phase 3: Tasks (from era config)
        # ------------------------------------------------------------------
        if task_count == 0:
            print(f"  >Tasks ({len(era.tasks)})")
            for task_def in era.tasks:
                session.add(Task(
                    title=task_def.title,
                    description=task_def.description,
                    point_value=task_def.point_value,
                    level_required=task_def.level_required,
                    status=TaskStatus.active,
                    created_by=pixie_char.id,
                    primary_faction_slug=task_def.faction_slug,
                    is_task_vision_eligible=task_def.is_task_vision_eligible,
                ))
        else:
            print(f"  >Tasks already exist ({task_count}) — skipping")

        # ------------------------------------------------------------------
        # Phase 4: Meta Tasks (placeholder)
        # ------------------------------------------------------------------
        from sqlalchemy import func as sqlfunc
        meta_task_count = (
            await session.execute(select(sqlfunc.count()).select_from(MetaTask))
        ).scalar()
        if meta_task_count == 0:
            print("  >Meta tasks (1 placeholder)")
            session.add(MetaTask(
                name="Upside Down",
                description="Do this task upside down",
                faction_slug="ua_masters",
                bonus_type=BonusType.flat,
                bonus_value=100.0,
                level_required=0,
            ))
        else:
            print(f"  >Meta tasks already exist ({meta_task_count}) — skipping")

        await session.commit()
        print("\nSeed complete!\n")
        print(f"  era            : {era.name} ({era.config_key})")
        print(f"  factions       : {len(era.factions)}")
        print(f"  pixie account  : pixieofhugs@gmail.com")
        print(f"  pixie character: @pixie (admin)")
        print(f"  tasks          : {len(era.tasks)}")

    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed the World Zero database.")
    add_env_argument(parser)
    parser.add_argument(
        "--yes", "-y",
        action="store_true",
        help="Skip confirmation prompt when targeting production.",
    )
    args = parser.parse_args()
    asyncio.run(seed(args.env, args.yes))

"""
Grant — or revoke — the admin role on a character's account.

Finds the account linked to the given character username, ensures the
'admin' Role row exists, then creates an AccountRole entry.
Safe to run more than once — skips if already an admin.

Usage:
    python elevate_admin.py pixie                # dev (default)
    python elevate_admin.py pixie --env prod     # production
    python elevate_admin.py --env prod           # defaults username to 'pixie'
    python elevate_admin.py pixie --revoke       # take the admin role away

``--revoke`` exists because this pair is the *only* way to move the admin role
(#1666). ``POST /admin/accounts/{id}/role`` was the application's one HTTP
privilege-escalation path — it granted any role, including admin, to any
account — and it is being deleted (#1667); a grant that can only be made by
someone already holding the database credentials is a much smaller target.

Revoking a role nobody holds is refused rather than shrugged off: the service
underneath is idempotent, so a silent success here would read identically
whether the account had just lost admin or the username was a typo.

Only ``admin`` means anything — ``dependencies.require_admin`` is the sole
reader of ``Role.name`` — so this deliberately manages that one role and is not
a general role CLI.
"""

import argparse
import asyncio
import sys

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from models.character import Character
from models.roles import AccountRole, Role
from script_utils import add_env_argument, get_settings
from services.admin_service import assign_or_revoke_role

#: The only role the application reads (``dependencies.require_admin``).
ADMIN_ROLE_NAME = "admin"
#: ``assign_or_revoke_role``'s action vocabulary — mirrors ``schemas.admin.RoleAction``.
REVOKE_ACTION = "revoke"


async def run(username: str, env: str, revoke: bool) -> None:
    settings = get_settings(env)
    print(f"Environment : {env}")
    print(f"Database    : {settings.DATABASE_URL.split('@')[-1]}\n")  # host/db only, no creds
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    async with async_session() as session:

        # 1. Find the character
        char_result = await session.execute(
            select(Character).where(Character.username == username)
        )
        character = char_result.scalar_one_or_none()
        if not character:
            print(f"ERROR: No character found with username '{username}'")
            await engine.dispose()
            sys.exit(1)

        account_id = character.account_id
        print(f"Found character '{username}' -> account_id={account_id}")

        if revoke:
            # Refuse before delegating: assign_or_revoke_role returns quietly when
            # the account never held the role, which is the one answer an operator
            # taking admin away must not receive on a mistyped username.
            held = await session.execute(
                select(AccountRole)
                .join(Role, AccountRole.role_id == Role.id)
                .where(
                    AccountRole.account_id == account_id,
                    Role.name == ADMIN_ROLE_NAME,
                )
            )
            if held.scalar_one_or_none() is None:
                print(f"ERROR: account {account_id} ('{username}') is not an admin - nothing to revoke.")
                await engine.dispose()
                sys.exit(1)

            await assign_or_revoke_role(
                account_id=account_id,
                role_name=ADMIN_ROLE_NAME,
                action=REVOKE_ACTION,
                admin_account_id=account_id,
                session=session,
            )
            await session.commit()
            print(f"\nDone: Account {account_id} (character: '{username}') is no longer an admin.")
            await engine.dispose()
            return

        # 2. Find or create the 'admin' role
        role_result = await session.execute(
            select(Role).where(Role.name == ADMIN_ROLE_NAME)
        )
        admin_role = role_result.scalar_one_or_none()
        if not admin_role:
            print("'admin' role not found - creating it")
            admin_role = Role(name=ADMIN_ROLE_NAME, description="Full administrative access")
            session.add(admin_role)
            await session.flush()
        else:
            print(f"Found 'admin' role (id={admin_role.id})")

        # 3. Check if already an admin
        existing = await session.execute(
            select(AccountRole).where(
                AccountRole.account_id == account_id,
                AccountRole.role_id == admin_role.id,
            )
        )
        if existing.scalar_one_or_none():
            print(f"Account {account_id} is already an admin. Nothing to do.")
            await engine.dispose()
            return

        # 4. Grant admin — self-granted bootstrap (granted_by = own account_id)
        account_role = AccountRole(
            account_id=account_id,
            role_id=admin_role.id,
            granted_by=account_id,
        )
        session.add(account_role)
        await session.commit()

        print(f"\nDone: Account {account_id} (character: '{username}') is now an admin.")

    await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description="Grant or revoke the admin role on a character's account.")
    parser.add_argument("username", nargs="?", default="pixie", help="Character username (default: pixie)")
    add_env_argument(parser)
    parser.add_argument(
        "--revoke",
        action="store_true",
        help="Take the admin role away instead of granting it.",
    )
    args = parser.parse_args()
    asyncio.run(run(args.username, args.env, args.revoke))


if __name__ == "__main__":
    main()

"""Throwaway: create the dedicated test database for issue #1810. Not committed."""
import asyncio
import sys

import asyncpg


async def main() -> None:
    conn = await asyncpg.connect(
        user="worldzero",
        password="localdev",
        host="localhost",
        port=5432,
        database="postgres",
    )
    name = sys.argv[1]
    exists = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname=$1", name)
    if exists:
        print("exists", name)
    else:
        await conn.execute(f'CREATE DATABASE "{name}"')
        print("created", name)
    await conn.close()


asyncio.run(main())

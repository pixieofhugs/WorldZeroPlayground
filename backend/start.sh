#!/bin/sh
set -e

# Wait for the database to be reachable (up to 60 s, 2 s between retries)
echo "Waiting for database..."
i=0
until python - <<'PYEOF'
import asyncio, asyncpg, os

url = os.environ["DATABASE_URL"]
dsn = url.replace("postgresql+asyncpg://", "postgresql://", 1)

async def check():
    conn = await asyncpg.connect(dsn=dsn, timeout=5)
    await conn.close()

asyncio.run(check())
PYEOF
do
    i=$((i + 1))
    if [ "$i" -ge 30 ]; then
        echo "Database did not become ready within 60 seconds. Aborting."
        exit 1
    fi
    echo "  ...not ready yet (attempt $i/30). Retrying in 2 s."
    sleep 2
done
echo "Database is ready."

# Fail loud (never auto-destroy) if the DB is stamped at a squashed-away revision.
python scripts/check_db_stamp.py

alembic upgrade head
python seed.py --env prod --yes
exec uvicorn main:app --host 0.0.0.0 --port 8000

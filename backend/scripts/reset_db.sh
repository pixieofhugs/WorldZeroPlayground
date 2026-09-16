#!/bin/sh
# Reset a World Zero database after a migration squash (or when local DB is wedged).
#
#   local mode (default):  scripts/reset_db.sh
#       Delegates to `scripts/wz reset` at the repo root: down -v -> up ->
#       alembic upgrade head -> seed -> demo praxes, all inside the containers.
#       The "my local DB is wedged, start fresh" button. It runs the migrations
#       in the backend container, so it needs no venv and works from a worktree.
#
#   prod/remote mode:      scripts/reset_db.sh --url <connection-string>
#       Drops the public schema on the target DB so the next deploy rebuilds.
#       Guarded by a typed confirmation (mirrors seed.py's prod gate).
#
# See docs/agents/db-migrations.md.
set -e

# Resolve paths so the script works from any cwd.
BACKEND_DIR=$(cd "$(dirname "$0")/.." && pwd)
ROOT_DIR=$(cd "$BACKEND_DIR/.." && pwd)

REMOTE_URL=""
if [ "$1" = "--url" ]; then
    REMOTE_URL="$2"
    [ -n "$REMOTE_URL" ] || { echo "--url requires a connection string."; exit 1; }
fi

if [ -n "$REMOTE_URL" ]; then
    # --- prod/remote mode: drop the public schema, nothing else ---
    DSN=$(echo "$REMOTE_URL" | sed 's|^postgresql+asyncpg://|postgresql://|; s|^postgres://|postgresql://|')
    TARGET=$(echo "$DSN" | sed 's|.*@||')
    echo "WARNING: this DROPs the public schema on a REMOTE database — all data is lost."
    echo "Target: $TARGET"
    printf "Type 'drop' to continue: "
    read answer
    [ "$answer" = "drop" ] || { echo "Aborted."; exit 0; }
    psql "$DSN" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
    echo "Schema dropped. Redeploy to rebuild (start.sh runs alembic upgrade head + seed)."
    exit 0
fi

# --- local mode: full rebuild from scratch ---
# One implementation, not two. `wz reset` already sequences down -v, up,
# migrate, seed and demo praxes against the containers; duplicating that here
# is how the two drift, and the copy that drifts is always the one nobody runs.
exec "$ROOT_DIR/scripts/wz" reset

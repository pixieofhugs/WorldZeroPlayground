#!/usr/bin/env bash
# One-command Playwright e2e runner against an ISOLATED database.
#
#   bash frontend/e2e/run-e2e.sh              # full suite
#   bash frontend/e2e/run-e2e.sh collaboration.spec.ts   # extra args pass through
#
# What it does, in order:
#   1. Derives an e2e DATABASE_URL (dev URL with the db name swapped to
#      worldzero_e2e) unless E2E_DATABASE_URL is already exported (CI does this).
#   2. Drops + recreates the e2e database (scripts/reset_e2e_db.py — refuses
#      to touch anything not ending in _e2e).
#   3. Runs `alembic upgrade head` — DATABASE_URL is exported because
#      alembic/env.py reads os.environ, NOT backend/.env. Fails loudly on drift.
#   4. Seeds via seed.py (env vars override .env, so it seeds the e2e db), then
#      adds the suite's own fixtures (fixture_tasks.py) to that database only —
#      seed.py is production bootstrap and holds no test data.
#   5. Starts the branch backend on a dedicated port (default 8001) so the
#      docker-compose backend on :8000 can't shadow the code under test.
#   6. Runs `npx playwright test` — the playwright config starts the frontend
#      dev server on a dedicated port (default 5174) with VITE_API_URL pointed
#      at the e2e backend, serially (workers=1).
#   7. Tears the backend down. The dev database is never touched.
#
# Prereqs: Postgres up (docker-compose up -d db), backend/.env present
# (copy from your main checkout if this is a fresh worktree), npm ci done,
# and `npx playwright install chromium` once.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

E2E_DB_NAME="${E2E_DB_NAME:-worldzero_e2e}"
E2E_BACKEND_PORT="${E2E_BACKEND_PORT:-8001}"
E2E_WEB_PORT="${E2E_WEB_PORT:-5174}"

# Prefer the backend venv if present (Windows and POSIX layouts), else PATH python.
if [ -x "$BACKEND_DIR/.venv/Scripts/python.exe" ]; then
  PYTHON_BIN="$BACKEND_DIR/.venv/Scripts/python.exe"
elif [ -x "$BACKEND_DIR/.venv/bin/python" ]; then
  PYTHON_BIN="$BACKEND_DIR/.venv/bin/python"
else
  PYTHON_BIN="${PYTHON:-python}"
fi

cd "$BACKEND_DIR"

if [ -z "${E2E_DATABASE_URL:-}" ]; then
  if [ ! -f .env ]; then
    echo "ERROR: backend/.env not found and E2E_DATABASE_URL not set." >&2
    echo "Fresh worktree? Copy backend/.env from your main checkout." >&2
    exit 1
  fi
  E2E_DATABASE_URL="$(E2E_DB_NAME="$E2E_DB_NAME" "$PYTHON_BIN" - <<'PYEOF'
import os
import re
from script_utils import get_settings

dev_url = get_settings("dev").DATABASE_URL
e2e_url = re.sub(r"/[^/?]+(\?.*)?$", "/" + os.environ["E2E_DB_NAME"] + r"\1", dev_url)
print(e2e_url)
PYEOF
)"
fi

export DATABASE_URL="$E2E_DATABASE_URL"
export CORS_ORIGINS="http://localhost:$E2E_WEB_PORT"

echo "==> e2e database: ${DATABASE_URL##*@}"

echo "==> reset e2e database"
"$PYTHON_BIN" scripts/reset_e2e_db.py

echo "==> alembic upgrade head"
"$PYTHON_BIN" -m alembic upgrade head

echo "==> seed"
"$PYTHON_BIN" seed.py

# Suite fixtures, not game content. seed.py is production bootstrap (start.sh
# runs it on every deploy) and must stay ignorant that a test suite exists, so
# the tasks the specs need are inserted here, into the e2e database only. See
# the docblock in fixture_tasks.py for why the era config cannot hold them.
echo "==> e2e task fixture"
"$PYTHON_BIN" "$SCRIPT_DIR/fixture_tasks.py"

echo "==> start backend on :$E2E_BACKEND_PORT"
"$PYTHON_BIN" -m uvicorn main:app --port "$E2E_BACKEND_PORT" &
BACKEND_PID=$!
trap 'kill "$BACKEND_PID" 2>/dev/null || true' EXIT

for _ in $(seq 1 60); do
  if curl -sf "http://localhost:$E2E_BACKEND_PORT/health" >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "ERROR: backend exited during startup." >&2
    exit 1
  fi
  sleep 1
done
curl -sf "http://localhost:$E2E_BACKEND_PORT/health" >/dev/null || {
  echo "ERROR: backend never became healthy on :$E2E_BACKEND_PORT." >&2
  exit 1
}

echo "==> playwright"
cd "$FRONTEND_DIR"
export E2E_API_URL="http://localhost:$E2E_BACKEND_PORT"
export E2E_WEB_PORT
# A spec that needs an admin-only operation runs the backend script (era reset is
# scripts/era_reset.py since #1667, not a route) — it needs this interpreter, and
# DATABASE_URL (exported above) both to reach the e2e db and to prove it IS the
# e2e db before doing anything destructive. See duel-zzz-resolved.spec.ts.
export E2E_PYTHON="$PYTHON_BIN"
npx playwright test "$@"

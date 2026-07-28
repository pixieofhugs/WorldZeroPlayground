#!/usr/bin/env bash
# Nightly page-load measurement (#1064).
#
# Deliberately not on the PR path. A stopwatch in PR CI measures the runner's
# mood as much as the code, and a check that flaps gets muted within a week; the
# byte budget (`npm run budget`) is the per-PR guard and this is the periodic
# reality check that the bytes are still buying what we think they are.
#
# Runs against the BUILT app, because that is the only thing whose chunk
# graph resembles production — the dev server serves unbundled modules.
#
# Assumes a seeded database and reuses the same backend port as run-e2e.sh.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$FRONTEND_DIR")"
BACKEND_DIR="$ROOT_DIR/backend"

BACKEND_PORT="${E2E_BACKEND_PORT:-8001}"
PREVIEW_PORT="${MEASURE_WEB_PORT:-4173}"
PROFILE="${MEASURE_PROFILE:-fast4g}"
RUNS="${MEASURE_RUNS:-3}"

if [ -x "$BACKEND_DIR/.venv/Scripts/python.exe" ]; then
  PYTHON_BIN="$BACKEND_DIR/.venv/Scripts/python.exe"
elif [ -x "$BACKEND_DIR/.venv/bin/python" ]; then
  PYTHON_BIN="$BACKEND_DIR/.venv/bin/python"
else
  PYTHON_BIN="python"
fi

cleanup() {
  [ -n "${BACKEND_PID:-}" ] && kill "$BACKEND_PID" 2>/dev/null || true
  [ -n "${PREVIEW_PID:-}" ] && kill "$PREVIEW_PID" 2>/dev/null || true
}
trap cleanup EXIT

echo "==> build (VITE_API_URL=http://localhost:$BACKEND_PORT)"
cd "$FRONTEND_DIR"
VITE_API_URL="http://localhost:$BACKEND_PORT" npm run build

echo "==> backend on :$BACKEND_PORT"
(cd "$BACKEND_DIR" && "$PYTHON_BIN" -m uvicorn main:app --port "$BACKEND_PORT") &
BACKEND_PID=$!

echo "==> preview on :$PREVIEW_PORT"
npx vite preview --port "$PREVIEW_PORT" --strictPort &
PREVIEW_PID=$!

for _ in $(seq 1 40); do
  if curl -sf "http://localhost:$BACKEND_PORT/health" >/dev/null 2>&1 &&
     curl -sf "http://localhost:$PREVIEW_PORT/" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "==> measure"
node scripts/measure-load.mjs \
  --base "http://localhost:$PREVIEW_PORT" \
  --api "http://localhost:$BACKEND_PORT" \
  --profile "$PROFILE" \
  --runs "$RUNS"

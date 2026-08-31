#!/usr/bin/env bash
# Local test runner for #1047. Lives in THIS worktree, not the shared scratchpad:
# parallel agents clobber a generically-named script there and would run it
# against the wrong worktree and the wrong test DB, silently and green.
# Deleted before the PR is opened.
set -euo pipefail
set -a
# shellcheck disable=SC1091
source "C:/Users/pixie/Documents/WorldZero/.env"
set +a
export DATABASE_URL="postgresql+asyncpg://worldzero:localdev@localhost:5432/worldzero"
export TEST_DATABASE_URL="postgresql+asyncpg://worldzero:localdev@localhost:5432/wz1047_test"
cd "C:/Users/pixie/Documents/WorldZero/.claude/worktrees/agent-aa620015f9cdd8213/backend"
exec "C:/Users/pixie/Documents/WorldZero/backend/.venv/Scripts/python.exe" -m "$@"

#!/usr/bin/env bash
# Regenerate the API contract artifacts for #1047, from THIS worktree.
# Deleted before the PR is opened.
set -euo pipefail
set -a
# shellcheck disable=SC1091
source "C:/Users/pixie/Documents/WorldZero/.env"
set +a
export DATABASE_URL="postgresql+asyncpg://worldzero:localdev@localhost:5432/worldzero"
cd "C:/Users/pixie/Documents/WorldZero/.claude/worktrees/agent-aa620015f9cdd8213"
exec "C:/Users/pixie/Documents/WorldZero/backend/.venv/Scripts/python.exe" scripts/regen_api_client.py

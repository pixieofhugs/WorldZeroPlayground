#!/usr/bin/env bash
# Issue #2399 test runner — dedicated DB wz2399_test.
# Parallel agents share worldzero_test and drop each other's tables mid-run,
# so this pins TEST_DATABASE_URL to an issue-scoped database. Not committed.
set -e
cd "$(dirname "$0")"
set -a
. /c/Users/pixie/Documents/WorldZero/backend/.env
set +a
export TEST_DATABASE_URL="postgresql+asyncpg://worldzero:localdev@localhost:5432/wz2399_test"
exec /c/Users/pixie/Documents/WorldZero/backend/.venv/Scripts/python.exe -m pytest "$@"

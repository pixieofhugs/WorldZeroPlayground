# World Zero — Testing Strategy

## Philosophy
- Game logic lives in `services/` and is pure (accepts `EraConfig`, returns a value)
- Unit tests require no DB or running server — just import `game_config` and `services`
- Integration tests spin up a test DB (via `pytest` fixtures + SQLAlchemy)
- CI runs the full suite on every push and blocks merge on failure

## Test Structure
```
/backend/tests/
├── unit/          # pure logic: scoring, era-config validity, level thresholds, reset
├── integration/   # DB-backed: auth, characters, tasks, praxes, votes, admin
└── conftest.py    # shared fixtures: test DB, test client, seeded characters
```
Read the actual files under `backend/tests/` for current coverage — the tree above is
orientation, not an index.

## Config-Driven Test Principle
Tests that validate game rules should **import the config and assert against it**, not
hardcode magic numbers. If a config value changes, the test either still passes (the rule
held) or fails immediately and tells you exactly what broke.

```python
# Good — validates the rule using config values
def test_level_1_threshold():
    threshold = ERA_1.level_thresholds[1]
    assert compute_level(score=threshold - 1, era=ERA_1) == 0
    assert compute_level(score=threshold, era=ERA_1) == 1

# Bad — fragile, breaks silently if the threshold changes
def test_level_1_threshold():
    assert compute_level(score=10) == 1
```

For live examples read `backend/tests/unit/` (`test_scoring.py`, `test_era_config.py`, …)
rather than trusting inlined snippets, which drift from the real service signatures.

## Running e2e (Playwright lifecycle suites)

Browser end-to-end tests live in `frontend/e2e/` (`playwright.config.ts` next to
them). They log in via the dev-only `POST /auth/dev-login` bypass and drive real
pages, so they need a live backend + frontend + Postgres.

**One command, isolated database (recommended):**

```bash
bash frontend/e2e/run-e2e.sh                        # full suite
bash frontend/e2e/run-e2e.sh collaboration.spec.ts  # one spec
```

The script resets a dedicated `worldzero_e2e` database on the compose Postgres
(never the dev `worldzero` database — the reset script refuses any name not
ending in `_e2e`), runs `alembic upgrade head` (fails loudly on drift), seeds
via `seed.py`, starts the *branch* backend on **:8001** (so the docker-compose
backend image on :8000 can't shadow the code under test), then runs Playwright,
which starts the frontend dev server on **:5174** with `VITE_API_URL` pointed at
:8001. Specs run serially (`workers: 1`) because lifecycle tests share DB-level
gates. Prereqs: Postgres up (`docker-compose up -d db`), `backend/.env` present
(fresh worktrees: copy it from the main checkout), `npm ci` +
`npx playwright install chromium` done once in `frontend/`.

**The DATABASE_URL / alembic gotcha:** `backend/alembic/env.py` reads
`DATABASE_URL` from `os.environ`, **not** from `backend/.env`. Running
`alembic upgrade head` by hand without it exported dies with
`Can't load plugin: sqlalchemy.dialects:driver`. The runner script exports it
for you; export it yourself for manual alembic runs. Because pydantic-settings
gives real env vars precedence over `.env`, that same exported `DATABASE_URL`
also repoints the backend and `seed.py` at the e2e database — isolation is
env-var-only, no code changes.

**Ad-hoc mode** (`npm run e2e` from `frontend/`) still works: it assumes a
backend already up on :8000 and runs against whatever database that backend
uses — fine for quick iteration, but it leaves bot accounts behind in the dev DB.

**CI:** `.github/workflows/e2e.yml` runs the same `run-e2e.sh` nightly and on
manual `workflow_dispatch`, and uploads the Playwright HTML report as an
artifact. It is deliberately not on the PR-blocking path.

## GitHub Actions CI

The PR-blocking suite is `.github/workflows/test.yml`, and it is **three jobs**, all
three of them required checks on `main`:

- `test` — a Postgres service, `alembic upgrade head`, then `pytest --cov --cov-fail-under=92`
- `frontend` — lint, `tsc --noEmit`, the `/design-sync` typecheck, vitest, `vite build`,
  and the initial-load byte budget
- `api-schema` — regenerate `backend/openapi.json` and the generated TS types, then
  `git diff --exit-code`

That workflow is the authoritative config (don't mirror its YAML here) — this list names
the jobs because agents need to know how many gates exist, not what is inside them. Read
the workflow for the steps. The coverage floor is 92% and should rise over time.

Note `npm test` alone is only vitest, i.e. one of `frontend`'s six steps; it is not the
frontend gate.

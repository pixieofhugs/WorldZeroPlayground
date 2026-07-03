# World Zero — Testing Strategy

## 12. Testing Strategy

### Philosophy
- Game logic lives in `services/` and is pure (accepts `EraConfig`, returns a value)
- Unit tests require no DB or running server — just import `game_config` and `services`
- Integration tests spin up a test DB (via `pytest` fixtures + SQLAlchemy)
- CI runs the full suite on every push and blocks merge on failure

### Test Structure
```
/backend/tests/
├── unit/
│   ├── test_scoring.py         # compute_submission_score, compute_vote_budget, compute_level
│   ├── test_era_config.py      # validates ERA_1, ERA_FOO etc. are internally consistent
│   ├── test_level_thresholds.py # level breakpoints fire at correct scores
│   └── test_era_reset.py       # reset logic applied correctly per EraConfig flags
├── integration/
│   ├── test_auth.py            # OAuth flow, JWT creation, /auth/me
│   ├── test_characters.py      # create, level gate, anti-self-vote
│   ├── test_tasks.py           # signup, max cap, level gate
│   ├── test_praxes.py          # praxis create, lifecycle, flag, vote
│   ├── test_votes.py           # cast, update, budget deduction, anti-self-vote
│   └── test_admin.py           # task approval, era reset endpoint
└── conftest.py                 # shared fixtures: test DB, test client, seeded characters
```

### Config-Driven Test Principle
Tests that validate game rules should **import the config and assert against it**, not hardcode magic numbers. If a config value changes, the test either still passes (the rule held) or fails immediately and tells you exactly what broke.

```python
# Good — validates the rule using config values
def test_level_1_threshold():
    threshold = ERA_1.level_thresholds[1]
    assert compute_level(score=threshold - 1, era=ERA_1) == 0
    assert compute_level(score=threshold, era=ERA_1) == 1

# Bad — fragile, breaks silently if threshold changes
def test_level_1_threshold():
    assert compute_level(score=10) == 1
```

### Example Unit Tests

```python
# tests/unit/test_scoring.py
from game_config import ERA_1
from services.scoring import compute_vote_budget, compute_level, compute_submission_score

def test_vote_budget_era1_base():
    assert compute_vote_budget(score=0, era=ERA_1) == 100

def test_vote_budget_era1_with_score():
    assert compute_vote_budget(score=50, era=ERA_1) == 200  # 100 + 2*50

def test_level_0_at_start():
    assert compute_level(score=0, era=ERA_1) == 0

def test_level_1_threshold():
    assert compute_level(score=9, era=ERA_1) == 0
    assert compute_level(score=10, era=ERA_1) == 1

def test_submission_score():
    assert compute_submission_score(avg_stars=3.0, task_point_value=10) == 30.0


# tests/unit/test_era_config.py
from game_config import ERA_1, CURRENT_ERA

def test_all_factions_have_valid_multipliers():
    for slug, faction in ERA_1.factions.items():
        assert 0 < faction.point_multiplier <= 2.0

def test_level_thresholds_count():
    assert len(ERA_1.level_thresholds) == 9  # levels 0–8

def test_current_era_is_defined():
    assert CURRENT_ERA is not None
    assert CURRENT_ERA.config_key != ""
```

### Running e2e (Playwright lifecycle suites)

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

### GitHub Actions CI

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: worldzero
          POSTGRES_PASSWORD: test
          POSTGRES_DB: worldzero_test
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Install dependencies
        run: pip install -r backend/requirements.txt
      - name: Run migrations
        run: alembic upgrade head
        working-directory: backend
        env:
          DATABASE_URL: postgresql+asyncpg://worldzero:test@localhost/worldzero_test
      - name: Run tests with coverage
        run: pytest --cov=. --cov-report=term-missing --cov-fail-under=80
        working-directory: backend
        env:
          DATABASE_URL: postgresql+asyncpg://worldzero:test@localhost/worldzero_test
```

Coverage threshold starts at 80% and should increase over time.

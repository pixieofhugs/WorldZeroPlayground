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

## The frontend unit suite

The largest body of test code in the repo, and the one with the tightest constraint.

### The harness — stated once

Vitest runs in the **`node` environment**: `frontend/vite.config.ts` declares no
`environment`, so there is no DOM — no `document`, no layout, no browser APIs.
Components are rendered with `renderToStaticMarkup` and asserted against the resulting
HTML string, usually with `toContain()`. **Effects never run**, so nothing in this suite
exercises a fetch, a subscription, a focus move, or a cleanup-on-unmount.

That is the whole constraint. A test file that needs to explain why it cannot watch a
component *do* something should cite this section rather than restate it.

### The three classes of invariant

Ruled in #2864. Every frontend invariant is one of three classes, and each has one home:

| class | what it is | home |
|---|---|---|
| **structure** | markup — what renders, with what text, in what order | the `renderToStaticMarkup` + `toContain()` harness above. It is the right tool for this. |
| **behaviour** | effects, request plans, ordering, conditional fetches | **extracted as a value** and asserted directly — see below |
| **geometry** | layout, computed style, contrast ratios, pixel measurement | the rendered sweep / Playwright (#2888) |

### Behaviour is reached by extracting a value, not by reaching for a DOM

Where a component's behaviour is only observable by running an effect, the effect's
*decision* — which requests, in what order, under what condition — becomes a plain value
the component consumes. That value is directly assertable in the harness that already
exists.

`pages/editPraxis/initialLoadPlan.ts` is the reference implementation (#2881): the
composer's mount-time load became `planInitialLoad`, and
`pages/editPraxis/__tests__/composerWaterfall.test.ts` drives it directly. The next such
extraction copies that shape rather than inventing one.

**Source-text assertion is banned as a way of reaching runtime behaviour.** Slicing a
hook's source between a comment banner and a dependency-array prefix makes a comment
load-bearing: rename either boundary and the slice silently empties, and every assertion
passes on air. `composerWaterfall.test.ts` did exactly that before #2881; its docblock
records the before and the after. Where a test wants such an invariant, the fix is to
extract the plan — not to write a guard-the-guard test around the slice.

What the ban does **not** cover:

- It is a rule for **new** tests. The files that already read their own source are not
  swept; the ones in scope convert as their surface is touched.
- It does not touch the **source-scan repo rules** — `rawColourRule`, `factionInkRule`,
  the `src/test/sourceScan.ts` guards. Those are *structure* rules about the shape of the
  tree, not behaviour, and they stay.
- Where a behavioural claim has no value seam at all, the residue stays source-reading
  and says so loudly. `pages/editPraxis/__tests__/composerMountSourceScan.test.ts` is
  what the #2881 conversion left behind: two claims with no plan to extract, kept with
  the comment-bounded slice removed and the guard-the-guard retained.

### `src/test/sourceScan.ts` is the only walk

A source-scanning guard answers a question no render can: *does any file, anywhere under
`frontend/src`, still reach for X?* The offending line usually sits in a branch no
fixture reaches, so one scan covers every surface, present and future, without
instantiating any of them.

**Do not re-derive that walk.** `src/test/sourceScan.ts` owns the directory traversal,
the comment stripper, the path relativiser and `resolveRoleReads()`. A new guard supplies
only its *predicate*, which is the only part that was ever different.
(See #2885, #2886, #2887.)

### ESLint rule, or vitest guard?

Both mechanisms are load-bearing. They answer different shapes of question:

- Reach for an **ESLint rule** when the invariant is a property of **one file, visible in
  that file's AST**, and you want it enforced in the editor as it is typed — and
  especially when an existing population has to be migrated off it. `eslint.config.js` is
  where the shrink-only ratchet machinery lives (`.eslint-legacy-raw-styles.txt`,
  `.eslint-legacy-raw-colours.txt`, `.eslint-legacy-faction-ink.txt`); note that a ratchet
  entry turns a whole *rule* off for a file, so two arms must never share a rule id.
- Reach for a **vitest source-scan guard** when the question is about **the tree as a
  whole** — "does anything, anywhere, still do X", a relationship between files, or a
  comparison against rendered output. That is not expressible per-file, so it is not an
  ESLint rule.

### No DOM environment — and the trigger that would change that

`jsdom`/`happy-dom` is **deferred, not refused** (#2864). It does no layout, so it
catches none of the geometry failures that are actually shipping green; the suite mocks
`useFormFactor` in enough files that a real DOM is not opt-in-per-file in practice; and it
is a new dependency and an environment split, bought for a capability — clicks, focus,
cleanup-on-unmount — that nothing is currently blocked on.

The named trigger for revisiting it:

> Revisit the DOM environment when a bug ships that a value-extraction test structurally
> could not have caught — one whose root cause is a click, a focus move, a subscription
> or a cleanup-on-unmount, rather than a request plan or a piece of markup.

**The ceiling, stated plainly.** Value-extraction does not test interaction. Nothing in
the unit harness will exercise a click. That gap is accepted and named, and Playwright
owns it — with the standing caveat that the e2e suite is currently red (#2453, #2463,
epic #1674), so "Playwright owns it" only becomes true when the nightly goes green.

### Faction architecture

Adding or changing a faction has its own procedure and its own checklist; it is not
repeated here. Read `docs/spec/SPEC-faction-ui-profile.md` §4 (#2719).

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

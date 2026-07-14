# Vault context
@../../../CLAUDE.md
@../../../MEMORY.md

---

# World Zero — Agent Instructions

A pointer document. It tells you *where* the rules live, not what they are.
Keep it thin so it can't drift.

## Project
FastAPI (Python) + React community game. Players make Characters, complete
real-world tasks, post proof ("praxis"), earn points via star-rating votes.

## Stack
FastAPI · SQLAlchemy (async) · Alembic · PostgreSQL · React · Axios ·
Google OAuth2 → JWT · local-fs media (relative paths) · pytest + GitHub Actions.
Deeper notes: `docs/spec/SPEC-architecture.md`.

---

## Where to look for X

| Need... | Go to |
|---|---|
| Active rule values (signup cap, vote budget, level thresholds, resets) | `backend/eras/era_1.py` (live `ERA_1`; `CURRENT_ERA` resolves here) |
| Factions, tasks, level ranks/unlocks + taunt structure for the live era | `backend/eras/era_1.py` |
| Taunt & rank/unlock **wording** (ADR-0031: backend emits keys) | `frontend/src/locales/en/{taunts,progression}.json` |
| Era config *shape* (dataclass fields) | `backend/game_config.py` |
| Backend layering, DDD posture, what goes in services vs. routes | `docs/spec/SPEC-backend-architecture.md` |
| Building a new era | `backend/eras/_template.py` |
| Account vs. Character, anti-self-voting | `docs/spec/SPEC-architecture.md` §3 |
| DB schema | `docs/spec/SPEC-data-models.md` |
| Scoring, level perks, era reset semantics | `docs/spec/SPEC-game-rules.md` |
| API routes + auth guards | `backend/routers/` (source files) |
| Pages, routing, components | `frontend/src/` (source files) |
| Frontend API clients | `frontend/src/api/` |
| User-facing frontend copy (i18n catalogs) | `frontend/src/locales/en/*.json` — editor guide: `frontend/src/locales/README.md` |
| Testing approach | `docs/spec/SPEC-testing.md` |
| Design intent, UX, faction archetypes | `WORLD_ZERO_STYLE.md` |
| CSS variables (colors, type, themes) | `frontend/src/index.css` |
| JS faction config | `frontend/src/utils/factions.ts` |
| Open work / issues | GitHub Issues — `gh issue list` (see `docs/agents/issue-tracker.md`) |
| Past task history (archived) | `docs/archive/TASKS-completed.md` |
| Squashing migrations / resetting the DB | `docs/agents/db-migrations.md` |
| Library/framework API docs (React, FastAPI, SQLAlchemy, Alembic, Pydantic, etc.) | Context7 -- call `mcp__MCP_DOCKER__resolve-library-id` then `mcp__MCP_DOCKER__get-library-docs` |

Read only what your task needs.

**Library lookups:** Use Context7 (`resolve-library-id` to `get-library-docs`) instead of relying on training knowledge for any third-party library API question.

---

## Config architecture
- `game_config.py` = dataclass shape. `eras/era_N.py` = values. `CURRENT_ERA` = active era.
- DB `Era.config_key` records which era was active; it does not own rules.
- Services take `era: EraConfig = CURRENT_ERA`. Never import `CURRENT_ERA`
  inside a service body.
- Never hardcode a value that lives in `EraConfig`. Read `era.*`.

## Python conventions
- async/await throughout FastAPI routes; Pydantic for request/response bodies
- Models in `models/`, business logic in `services/`. Routes stay thin.
- Frozen dataclasses over tuples/dicts unless mutation is required
- ALL_CAPS for module-level constants/singletons
- Full names, no abbreviations (`task` not `t`, `index` not `idx`)
- Type-annotate every parameter and return
- No bare string literals for domain values — use a constant or Enum

## Frontend conventions
- Read `WORLD_ZERO_STYLE.md` before any UI work
- Color values live only in `index.css` (CSS vars). Never hardcode hex.
- Faction config: `factions.ts`. Use `factionCssVar()` for styles.
- Dark mode via the `[data-theme="dark"]` cascade — no `dark ? '#a' : '#b'` ternaries
- Each faction has its own card archetype; don't unify
- Reuse `.card-footer`, `.card-meta`, `.card-description` for repeated patterns
- Hide unusable controls; don't show them disabled

## Do NOT
- Duplicate game rules into this file, services, tests, or docs — read `era.*` or cite the spec
- Mix secrets and rules (`config.py` = secrets; `game_config.py` + `eras/` = rules)
- Hardcode values that live in `EraConfig`
- Write sync SQLAlchemy in async routes
- Store absolute media paths
- Expose `account_id` or `email` publicly
- Put business logic in route handlers

---

## Running locally
- Backend: `uvicorn main:app --reload` from `/backend`
- Frontend: `npm start` from `/frontend`
- DB: `docker-compose up -d`; `alembic upgrade head` after pulling
- Tests: `pytest --cov=. --cov-fail-under=80` from `/backend`

## Agent skills

This repo is configured for the engineering skill set (`triage`, `qa`, `review`, `tdd`, etc.). Details live in `docs/agents/`.

### Scoped subagents
For file-editing work, dispatch to a specialist that loads only its own context: `backend`, `frontend-feature`, `frontend-style`. Definitions and the dispatch shape are in `.claude/agents/README.md`. Orchestration (clarify + dispatch) is this main session's job, not a subagent.

`/wz-next-issue` picks up where `/triage` stops: it selects the best unblocked `ready-for-agent` issue (dependency-aware), builds it in a worktree, and opens a draft PR — commenting on the issue and stopping if it needs a human.

### Issue tracker
Work lives in **GitHub Issues** on `pixieofhugs/WorldZeroPlayground`, managed via the `gh` CLI. External PRs are **not** a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels
Default vocabulary — `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs
Multi-context (`backend/`, `frontend/`). Domain knowledge is the routing table above plus `docs/spec/*` and `WORLD_ZERO_STYLE.md`; `CONTEXT.md` / `CONTEXT-MAP.md` get created lazily by `/domain-modeling`. See `docs/agents/domain.md`.

## Working in worktrees
For any non-trivial code change, work in an isolated git worktree on its own branch rather than directly on the current branch. Stay within the file scope of the issue you picked up.

## Keeping this file thin
Before adding a section: does it belong in a spec file, `game_config.py`, or
an era file? Usually yes. This file holds only conventions, pointers, and the
`Do NOT` list.

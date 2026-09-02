# World Zero — Agent Instructions

A pointer document. It tells you *where* the rules live, not what they are.
Keep it thin so it can't drift.

## Project
FastAPI (Python) + React community game. Players make Characters, complete
real-world tasks, post proof ("praxis"), earn points via star-rating votes.

## Stack
Deeper notes: `docs/spec/SPEC-backend-architecture.md` (backend posture);
identity + era-as-ruleset in ADR-0041 / ADR-0042.

---

## Where to look for X

| Need... | Go to |
|---|---|
| Active rule values (signup cap, vote budget, level thresholds, resets) | `backend/eras/era_1.py` (`ERA_1`; which era is live is the latest DB `Era` row — ADR-0091) |
| Factions, tasks, level ranks/unlocks + taunt structure for the live era | `backend/eras/era_1.py` |
| Taunt & rank/unlock **wording** (ADR-0031: backend emits keys) | `frontend/src/locales/en/{taunts,progression}.json` |
| Faction **name/description** wording (ADR-0038: backend emits slug) | `frontend/src/locales/en/factions.json` (`names.<slug>`, `descriptions.<slug>`) |
| Era config *shape* (dataclass fields) | `backend/game_config.py` |
| Backend layering, DDD posture, what goes in services vs. routes | `docs/spec/SPEC-backend-architecture.md` (how); ADR-0045 (why-not-full-DDD) |
| Building a new era | `backend/eras/_template.py` |
| The onboarding arc — QR scan to level 1, what a stranger is told, terms, the hand-off | `docs/spec/SPEC-onboarding.md` (decisions charted on #1732) |
| Which ADRs are still rules (vs. superseded, amended, reversed) | `docs/adr/README.md` — generated; regenerate with `python scripts/adr_index.py` |
| Account vs. Character, anti-self-voting | ADR-0041 + CONTEXT.md ("Account", "Character") |
| DB schema | `backend/models/*.py` (source of truth) |
| Scoring formulas / era-reset semantics | `backend/services/scoring.py` + `praxis_scoring.py` + `services/era.py`; **values** in `backend/eras/era_1.py`; rationale in ADR-0014/0042/0043/0044 |
| API routes + auth guards | `backend/routers/` (source files) |
| Pages, routing, components | `frontend/src/` (source files) |
| Frontend API clients | `frontend/src/api/` |
| How stale a cached read may be — which class, why, and the era epoch | ADR-0072; code in `frontend/src/hooks/cachedResource.ts` + `frontend/src/utils/cacheEpoch.ts` |
| User-facing frontend copy (i18n catalogs) | `frontend/src/locales/en/*.json` — editor guide: `frontend/src/locales/README.md` |
| Testing approach | `docs/spec/SPEC-testing.md` |
| Design intent, UX, faction archetypes | `WORLD_ZERO_STYLE.md` |
| Building against a Claude design (fidelity rule, vendor-then-delete, what a green build misses) | `docs/agents/design-fidelity.md` |
| Kit shape: how many surfaces, which faction identities, responsive-vs-split | `docs/kit-structure.md` |
| Adding a faction — what it must supply, what it inherits, what it may never author | `docs/spec/SPEC-faction-ui-profile.md` §4 (the checklist); ADR-0090 (which of paint/tree/behaviour/content a difference is) |
| Shipping a surface without slowing the site down (payload budget, what makes a surface free, asset + font rules) | `docs/agents/load-time.md` |
| CSS variables (colors, type, themes) | `frontend/src/css/*.css` (`index.css` is the import map that orders them; #2891) |
| JS faction config | `frontend/src/utils/factions.ts` |
| Open work / issues | GitHub Issues — `gh issue list` (see `docs/agents/issue-tracker.md`) |
| Squashing migrations / resetting the DB | `docs/agents/db-migrations.md` |
| Library/framework API docs (React, FastAPI, SQLAlchemy, Alembic, Pydantic, etc.) | Context7 -- call `mcp__MCP_DOCKER__resolve-library-id` then `mcp__MCP_DOCKER__get-library-docs` |

Read only what your task needs.

**Library lookups:** Use Context7 (`resolve-library-id` to `get-library-docs`) instead of relying on training knowledge for any third-party library API question.

---

## Config architecture
- `game_config.py` = dataclass shape. `eras/era_N.py` = values. `CURRENT_ERA` = active era.
- **The latest DB `Era` row's `config_key` chooses which era is active** (ADR-0091).
  It owns no rule *value* — those stay in `eras/` — but it decides which set is
  live, and a mod sets it from the admin page. `CURRENT_ERA` is still the one
  lever; the hand on it moved off a code edit.
- `CURRENT_ERA` is a stable **object identity**, refreshed in place. Never
  reassign `game_config.CURRENT_ERA` — a default argument binds at `def` time,
  so that moves one name and leaves 157 call sites on the old era. The only
  rebinding site is `services.era.rebind_live_era`, and a test keeps it at one.
- Services take `era: EraConfig = CURRENT_ERA`. Never import `CURRENT_ERA`
  inside a service body.
- Never hardcode a value that lives in `EraConfig`. Read `era.*`.

## Language conventions
Python conventions live in `backend/CLAUDE.md`; frontend conventions in
`frontend/CLAUDE.md`. Each loads when you work under that directory.

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
- Frontend: `npm run dev` from `/frontend`
- DB: `docker-compose up -d`; `alembic upgrade head` after pulling
- Tests: `pytest --cov=. --cov-fail-under=92` from `/backend` — the gate is
  `.github/workflows/test.yml`; if that number and this one disagree, it wins

Every backend command above needs `backend/.venv` activated, and the backend
preview does **not** work from a worktree — worktrees carry no venv. Read
`docs/agents/running-locally.md` before starting the stack.

## Agent skills

This repo is configured for the engineering skill set (`triage`, `qa`, `review`, `tdd`, etc.). Details live in `docs/agents/`.

### Scoped subagents
For file-editing work, dispatch to a specialist that loads only its own context: `backend`, `frontend-feature`, `frontend-style`. Definitions and the dispatch shape are in `.claude/agents/README.md`. Orchestration (clarify + dispatch) is this main session's job, not a subagent.

`/planner-bot` sweeps the open board into a dispatchable state; `/builder-bot`
batches and ships what it labelled; `/git-reaper` sweeps up after. A merge
ships to production — `main` auto-deploys.

### Issue tracker
Work lives in **GitHub Issues** on `pixieofhugs/WorldZeroPlayground`, managed via the `gh` CLI. External PRs are **not** a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels
Default vocabulary — `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs
A single root `CONTEXT.md` glossary holds the ubiquitous language (one context — no `CONTEXT-MAP.md`); `/domain-modeling` maintains it. Domain knowledge = the routing table above + `CONTEXT.md` + `docs/adr/*` + the `docs/spec/*` + `WORLD_ZERO_STYLE.md`. See `docs/agents/domain.md`.

## Working in worktrees
For any non-trivial code change, work in an isolated git worktree on its own branch rather than directly on the current branch. Stay within the file scope of the issue you picked up.

## Keeping this file thin
Before adding a section: does it belong in a spec file, `game_config.py`, or
an era file? Usually yes. This file holds only conventions, pointers, and the
`Do NOT` list.

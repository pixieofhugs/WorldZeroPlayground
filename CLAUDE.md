# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

WorldZero is a community game (FastAPI + React) where players create Characters, complete real-world Tasks, post proof submissions ("Praxis"), and earn points through community star-rating votes. A modern rebuild of sf0.org.

## Identity Model (critical)

- **Account** = private login identity (Google OAuth). Never expose `account_id` or `email` in public API responses.
- **Character** = public game persona. Multiple per Account (level-gated at level 3).
- All game actions use Character IDs. Anti-self-vote is enforced at the **Account** level.

## Config Architecture (critical)

- `backend/game_config.py` is the single source of truth for all game rules.
- `EraConfig` defines mechanics: task limits, vote budget formula, level thresholds, faction rules, reset behaviour.
- `CURRENT_ERA` is the one variable that switches live game mechanics.
- The DB `Era` table stores `config_key` to record history; it does not own rules.
- All service functions accept `era: EraConfig = CURRENT_ERA` for testability.

## Stack

- Backend: FastAPI, SQLAlchemy (async), Alembic, PostgreSQL
- Frontend: React, React Router, Axios
- Auth: Google OAuth2 via Authlib -> JWT (provider-agnostic design)
- Media: Local filesystem v1 (`/media/{character_id}/{submission_id}/`), relative paths only
- Testing: pytest + pytest-cov, GitHub Actions CI

## Common Commands

```bash
# Start the database
docker-compose up -d db

# Run the backend locally
cd backend
uvicorn main:app --reload

# Database migrations
cd backend
alembic upgrade head
alembic downgrade base

# Tests
cd backend
pytest --cov=. --cov-fail-under=80

# Install dependencies (local dev)
cd backend && python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
```

## Environment Setup

Copy `.env.example` to `.env` and fill in values. `DATABASE_URL` must use the `postgresql+asyncpg://` scheme.

## Key Conventions

- async/await throughout all FastAPI routes
- Pydantic schemas for all request/response bodies (in `schemas/`)
- SQLAlchemy models in `models/` — columns only, no business logic
- Business logic in `services/` — accept `era: EraConfig = CURRENT_ERA`, never import `CURRENT_ERA` inside a service body
- All migrations via Alembic only; never modify the schema manually

## Key Business Rules (all driven by EraConfig)

- Vote budget: `era.vote_budget_base + floor(era.vote_budget_multiplier * score)`
- First vote costs 1 from `votes_available`; updating an existing vote is free
- Cannot vote if `voter_account_id == submission.character.account_id`
- Max task signups: `era.max_task_signups` (enforced at API layer)
- Character creation beyond first requires `level >= 3`

## Project Structure

```
backend/
  game_config.py   # EraConfig, FactionConfig, ERA_1, CURRENT_ERA
  config.py        # env vars and secrets (not game rules)
  db.py            # async SQLAlchemy engine + session factory
  models/          # SQLAlchemy mapped classes, one file per model
  schemas/         # Pydantic request/response schemas
  services/        # pure game logic, all accept EraConfig param
  routers/         # FastAPI route handlers (no business logic here)
  alembic/         # migrations
frontend/
  src/pages/
  src/components/
  src/api/
  src/auth/
.github/workflows/test.yml  # CI: postgres service + pytest --cov
```

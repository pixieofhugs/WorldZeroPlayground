# World Zero — Agent Instructions

## Project
A community game built with FastAPI (Python) + React. Players create Characters (public personas),
complete real-world tasks, post proof ("praxis"), and earn points through community star-rating votes.

## Identity Model (critical)
- Account = private login identity (Google OAuth). Never exposed publicly.
- Character = public game persona. Multiple per Account (level-gated at level 3).
- All game logic uses Character IDs. Votes enforce account-level anti-self-voting.
- Never expose account_id or email in public API responses.

## Config Architecture (critical)
- game_config.py is the single source of truth for all game rules.
- EraConfig defines mechanics for one era: task limits, vote budget formula, level thresholds,
  faction rules, and reset behaviour.
- CURRENT_ERA is the one variable that controls live game mechanics.
- The DB Era table stores config_key to record which era was active — it does not own rules.
- All service functions accept `era: EraConfig = CURRENT_ERA` for testability.

## Stack
- Backend: FastAPI, SQLAlchemy (async), Alembic, PostgreSQL
- Frontend: React, React Router, Axios
- Auth: Google OAuth2 via Authlib → JWT (provider-agnostic)
- Media: Local filesystem (v1), relative paths only
- Testing: pytest + pytest-cov, GitHub Actions CI

## Python conventions
- async/await throughout all FastAPI routes
- Pydantic schemas for all request/response bodies
- SQLAlchemy models in models/, business logic in services/
- Never put business logic in route handlers
- Services accept EraConfig parameter; never import CURRENT_ERA inside a service function body

## Key business rules (all driven by CURRENT_ERA / EraConfig)
- Max task signups: era.max_task_signups (default 20)
- Task level gate: character.level >= task.level_required to sign up
- Submission level gap: can submit up to era.task_submit_level_gap levels above own level
- Vote budget: era.vote_budget_base + floor(era.vote_budget_multiplier × score)
- First vote cast costs 1 from votes_available; updates are free
- Cannot vote if voter_account_id == submission author's account_id
- Character creation beyond first requires level >= 3

## Testing
- Unit tests: no DB required, test services directly with EraConfig instances
- Integration tests: use test DB via conftest.py fixtures
- Tests assert against config values, not hardcoded magic numbers
- Run: pytest --cov=. --cov-fail-under=80 from /backend

## Database
- PostgreSQL via docker-compose
- All migrations via Alembic only
- Run: alembic upgrade head after pulling

## Running locally
- Backend: uvicorn main:app --reload from /backend
- Frontend: npm start from /frontend
- DB: docker-compose up -d
- Tests: pytest from /backend

## Do NOT
- Put secrets or game rules in the same file (config.py = secrets, game_config.py = rules)
- Hardcode magic numbers from EraConfig in service logic
- Write sync SQLAlchemy in async routes
- Store absolute media paths
- Expose account_id or email in public API responses
- Put business logic in route handlers

Complete project specification is in docs/SPEC.md. Read it before starting any feature.
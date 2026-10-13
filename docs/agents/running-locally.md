# Running the stack locally

The full guide is **`docs/agents/local-world.md`** — how to bring the stack up,
what data it starts with, and how to mint characters, tasks and praxes without
asking anyone. This page holds only the things that still bite.

    scripts/wz up

## The backend no longer needs a venv, and worktrees work

This used to be the main hazard on this page: `.claude/launch.json` ran
`python -m uvicorn`, `python` resolved off `PATH`, and uvicorn lived in
`backend/.venv`. No worktree under `.claude/worktrees/` carries a venv, so the
backend preview died instantly in exactly the situation CLAUDE.md tells agents
to work in.

The backend now runs in a container with `./backend` bind-mounted and its
dependencies baked into the image (`backend/Dockerfile`, `dev` stage). There is
nothing to activate, and `scripts/wz` — including `wz test`, `wz migrate` and
`wz seed` — behaves identically from every worktree.

A venv is still fine to keep for editor tooling, and `frontend/e2e/run-e2e.sh`
still prefers one if it finds it. Neither is required to run the app.

## The frontend still runs on the host

`npm run dev` in `frontend/`, because Vite's file watching through a bind mount
is slower and drops HMR often enough to matter. If you have no `npm` — a fresh
machine, or a worktree with no install — `scripts/wz up --full` puts Vite in a
container too.

## `--reload` does not notice a branch switch

`uvicorn --reload` watches for file writes. A `git checkout` of another branch
rewrites the working tree, and the reloader does **not** reliably pick it up —
you can read a response produced by the code you just checked out *away* from,
and mistake it for a bug on the branch you are now on.

**Restart the backend after changing branches:** `scripts/wz down && scripts/wz up`.

## Migrations run before the app, not alongside it

The app's lifespan reads the live `Era` row at boot (ADR-0091,
`backend/main.py:47`), so an unmigrated database makes uvicorn exit rather than
serve. `scripts/wz up` sequences it correctly — postgres, `alembic upgrade head`,
seed, and only then the backend. A bare `docker compose up -d` against a fresh
volume will not.

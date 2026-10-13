# Two stages, two audiences. `prod` is last, so an untargeted
# `docker build -f backend/Dockerfile .` still produces the deployable image —
# that is what CI and the server build, and neither passes `--target`.
#
# Build context is the REPO ROOT, not backend/ (see docker-compose.yml and
# .github/workflows/deploy.yml).

FROM python:3.12-slim AS base
WORKDIR /app
# Unbuffered so `docker compose logs -f` shows a traceback as it happens rather
# than when the pipe fills; no .pyc because the dev stage bind-mounts the source
# and stale bytecode written into a mount is a debugging trap.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1


# --- dev ------------------------------------------------------------------
# The local world (docs/agents/local-world.md). Deliberately installs
# requirements.txt — the CI/dev superset — because this container is also where
# pytest, alembic, ruff and the seed scripts run. That is the whole point: no
# venv exists on the host, so a worktree has nothing to activate.
#
# No `COPY backend/ .` here. docker-compose bind-mounts the WHOLE REPO at /repo
# and works from /repo/backend, so the source is the working tree and --reload
# sees every edit. The repo root, not backend/, because tests reach outside it.
#
# Building this stage on its own gives you an interpreter with the dependencies
# and no app.
FROM base AS dev
# git, because part of the suite shells out to it:
# tests/test_shipped_svgs_are_well_formed.py takes its file list from
# `git ls-files` rather than a hardcoded glob. Without it that test fails as a
# bare FileNotFoundError, and a suite that reports a failure the code did not
# cause is a suite people learn to ignore.
RUN apt-get update \
    && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*
# The mounted repo is owned by the host user, not by root in here, which git
# refuses to touch as "dubious ownership".
RUN git config --global --add safe.directory /repo
COPY backend/requirements.txt backend/requirements-prod.txt ./
RUN pip install --no-cache-dir -r requirements.txt
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]


# --- prod -----------------------------------------------------------------
# Runtime deps only — requirements.txt is the dev/CI superset and pulls in the
# pytest family, which has no business in the image.
FROM base AS prod
COPY backend/requirements-prod.txt .
RUN pip install --no-cache-dir -r requirements-prod.txt

COPY backend/ .
RUN chmod +x start.sh

EXPOSE 8000
CMD ["./start.sh"]

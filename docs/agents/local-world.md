# The local world

A complete, populated World Zero on your machine — characters at any level in
any faction, tasks, praxes with real votes — brought up with one command and
driven without asking the owner for anything.

Read this before reaching for prod, a seed script, or the API by hand. It exists
so you do not have to re-derive the seams from `backend/routers/auth.py` and
`backend/seed.py` every session.

    scripts/wz up          # migrated, seeded, running
    scripts/wz reset       # throw it away, build a fresh one
    scripts/wz help        # everything else

## What it is

`docker-compose.yml` at the repo root runs Postgres and the backend. The backend
image is the `dev` stage of `backend/Dockerfile`: the CI dependency superset,
with the **whole repo** bind-mounted at `/repo`, `/repo/backend` as the working
directory, and `uvicorn --reload` on top. The whole repo, not just `backend/`,
because backend tests reach out of their own tree by relative path. **There
is no venv anywhere in this path**, which is the whole point — it behaves
identically from the main checkout and from every git worktree.

The frontend is deliberately outside the default stack. Run `npm run dev` on the
host for reliable HMR, or `scripts/wz up --full` to put Vite in a container too
when you have no `npm` (a fresh machine, or a worktree with no install).

| | |
|---|---|
| API | `http://localhost:8000`, OpenAPI at `/docs` |
| Frontend | `http://localhost:5173` |
| Postgres | `localhost:5432`, `worldzero` / `worldzero` |

`ENVIRONMENT=development` here and **only** here. Both deployed environments set
`production` — see `deploy/env.example` for why that is not negotiable.

## Signing in, and making characters

`POST /auth/dev-login` (`backend/routers/auth.py:507`) is the whole story. It
mints an account and a character with no OAuth, and its query parameters make it
a one-call fixture. It 404s unless `ENVIRONMENT=development`.

| Parameter | Effect |
|---|---|
| `key` | Which dev account. `1` is the legacy one; any other string is a distinct account. |
| `name` | Ensure the account carries a character with this display name |
| `level` | Seed that character's current-era level (collaboration needs ≥ 1) |
| `faction` | Place the character in a faction **directly**, bypassing the join gate |

`faction` skips the gate on purpose: players start unaffiliated and most factions
are invite-gated (ADR-0030), so no real flow puts a character in all seven.

    scripts/wz login 1
    scripts/wz login 7 --name Tester --level 3 --faction snide

The command prints `account_id` and `character_id`, then a snippet to paste into
the browser console. That second step is not redundant: the shell call is what
*creates* the character, but the session cookie it sets goes nowhere useful.
Running the same request from the page puts the cookie where the app can use it.

Faction slugs come from the live era — read `backend/eras/era_1.py`, never a
hardcoded list, and never assume `ua` or `coven` exist (Era 2 carries neither).

## What data you start with

`scripts/wz up` runs `seed.py` in dev mode, which is idempotent and gives you:

- every faction the live era declares, plus the era row and the admin account
- the game-wide level-0 onboarding task, and any tasks the era config declares
  (Era 1 declares none — #1398)
- `@dev` ("Molly", unaffiliated) with one in-progress task, so the sidebar
  renders fully the moment you sign in
- the duel e2e fixture task

`scripts/wz reset` adds `scripts/seed_demo_praxes.py` on top: cross-faction demo
players and one submitted, community-voted praxis per faction, so the faction
cards render with genuine scores. Add it to a running stack with
`scripts/wz seed --demo`, and take it away again with `--remove-demo`.

`scripts/wz task` adds six more tasks at levels 1–6
(`frontend/e2e/fixture_tasks.py`). Level 0 stays reserved for the onboarding
task (#904).

**Do not put test data in `seed.py`.** `backend/start.sh` runs it on every
production deploy, so anything it names is restored the next deploy after an
admin deletes it. Test fixtures live beside the suite that needs them.

## Looking at the result

`scripts/wz psql` for the database, `scripts/wz logs backend` for the app,
`scripts/wz shell` for a shell in the container. `scripts/wz test` runs pytest
inside the container — no venv, and it creates `worldzero_test` if it is missing.

One caveat in a **worktree**: `.git` there is a file pointing at metadata under
the main checkout, outside the mount, so no git command works in the container.
`test_shipped_svgs_are_well_formed` takes its file list from `git ls-files`, so
`wz test` skips exactly that one and says so. It still runs in CI and in the
main checkout.

For anything visual, drive `http://localhost:5173` through the browser tools
rather than reasoning about the markup: bring the stack up, sign the browser in
with the printed snippet, then `read_page` and screenshot.

## What this is not

Not the deployed stack. `deploy/docker-compose.yml` is what the server runs: it
pulls published images instead of building, publishes no port but Caddy's, and
never sets `ENVIRONMENT=development`. Media is a named `media` volume in both,
though the mount path differs (`/media` here, `/app/media` there) — it is an
env var on both sides and nothing else reads it.

Not the e2e harness either. `frontend/e2e/run-e2e.sh` builds its own isolated
`worldzero_e2e` database and never touches the one above.

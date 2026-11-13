# Merge notes

What `/foreman:merge-bot` (Bot Bros) leaves to the repo. The skill is the loop; this is
World Zero's half of it.

## Who merges

`bros merge` lands only PRs the repo owner authored. A Dependabot bump is re-opened as an
owner-authored PR: regenerate the lockfile with `--package-lock-only --ignore-scripts
--before=<4 days ago>` and close the bot's PR with a pointer (#3337, #3340).

## Shooting a UI change

A PR whose diff touches `frontend/src` gets pictures. With the local world up
(`curl -sf localhost:8000/health`, else `scripts/wz up` from the main checkout), from the
PR's worktree:

```
cd <worktree>/frontend && SHOT_DIR=<main checkout>/.claude/reviews/shots/<N>/<slug> \
  SHOT_ROUTES="<routes>" SHOT_LOGIN="faction=<slug>&level=<L>" npm run shots
```

- Routes, faction and level come from the PR body's "What to eyeball" list. Do one run
  per faction it names.
- The knobs are in the header of `frontend/e2e/shots/routes.shots.ts`. `SHOT_VIEWPORTS` is
  **comma**-separated, and `SHOT_THEME=both` shoots light and dark.
- A finished worktree has no `frontend/node_modules`, so run `scripts/wz prep` in it first.
- After a Playwright bump, run `npx playwright install chromium` once.
- The backend in the picture is the main checkout's. A PR that also changes `backend/` is
  shown without that half, so say so.
- A screen that needs data the seed lacks (a bio, a badge) can be set up in the dev DB
  with `scripts/wz psql`. `docs/agents/local-world.md` covers minting characters.

## Fix rounds

Dispatch the scoped type that owns the files: `frontend-style`, `frontend-feature` or
`backend` (see `.claude/agents/README.md`). For work no single owner fits, use `claude`
with `model: "sonnet"`, and open its prompt with
`Before anything else, Read docs/agents/writer-rules.md in full and follow it.`

Before a backend PR's merge, run `bros ratchet ruff` in its worktree. Writers often ship
E501, and the ratchet sits inside the required `test` job.

## Stopping for a human

Use the comment template and labels in `/builder-bot` Step 8
(`.claude/skills/builder-bot/SKILL.md`).

## What a merge ships

`main` deploys to dev.worldzero.org once Test is green on `main`. Production takes a `v*`
tag, gated by a required reviewer on the `prod` environment (`.github/workflows/deploy.yml`).
Tags are lightweight. Find the latest with `git describe --tags --abbrev=0 --match "v*" origin/main`.
Nothing is on dev if `main`'s own run is red.

## Close-out extras

If `.claude/scout-log.jsonl` exists, run
`/usr/bin/python3 scripts/local_scout.py score #<issue> #<issue>` with the wave's issues,
not its PRs, and paste the output.

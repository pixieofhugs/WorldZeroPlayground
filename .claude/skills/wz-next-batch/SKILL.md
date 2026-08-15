---
name: wz-next-batch
description: Runs a whole BATCH of `ready-for-agent` GitHub issues end to end and MERGES each PR, which ships to production because `main` auto-deploys. Shapes the batch by file footprint so only disjoint work runs in parallel, dispatches each issue to a scoped subagent in its own worktree, and gates every merge on CI. Use for SEVERAL issues at once — "run a wave", "do the next batch", "clear the backlog", or a handed-over batch prompt. For a single issue that should stop at a draft PR without merging, use `wz-next-issue` instead.
---

# wz-next-batch

Runs a batch of `ready-for-agent` issues the way World Zero batches actually get done:
you **orchestrate**, scoped subagents **write the code**, CI gates every merge, and the
user does live visual QA alongside you.

**Invoke:** `/wz-next-batch` (or `/wz-next-batch #a #b #c` to force a specific set).

**Three hard rules, up front:**

1. **You orchestrate; you don't write feature code.** Dispatch subagents. The exception is
   a small CI fix on a PR branch (Step 5) — faster than a round trip.
2. **Never merge red, never merge on assumption.** Wait for checks to actually pass.
3. **Everything written down rots.** Issue bodies, your own measurements, and the lines in
   this file are all snapshots of a codebase that keeps moving. Check a written claim
   against the code before you act on it, and when the two disagree the **code wins**:
   STOP, say so, never guess. Sites where this bites are flagged **rot** below.

---

## Step 1 — Read the board

```
gh issue list --label ready-for-agent --state open --limit 100
gh pr list --state open --json number,title,mergeStateStatus
git fetch origin main && git log origin/main --oneline -15
```

Check open PRs first — a previous batch may have left unmerged work, and anything open
changes what's safe to dispatch. If the queue is empty, say so and stop.

---

## Step 2 — Verify premises, then grill (do this BEFORE dispatch)

**Rot, worst case (Rule 3).** A stale premise handed to a builder produces a confident wrong
change. For every candidate, check its core claim against **`origin/main`** — not your own
worktree, which can predate recent merges and manufacture false premises — and read the whole
thread (`gh issue view <N> --comments`), since a later comment can reverse the body it sits
under.

A Wave 3 issue rested its entire "this is the third copy, so extract it" premise on a
duplication that had evaporated when two pages merged in an earlier redesign. Building it
would have *regressed* a shipped feature.

Then grill anything ungrilled. A two-line stub is not dispatchable. Resolve:

- **Open product forks** → ask the user (`AskUserQuestion`), one round, with a recommendation.
  Don't hand a builder a decision only the owner can make.
- **Mechanical unknowns** → answer them yourself by reading the code, and write the answer
  into the dispatch prompt so the agent doesn't re-derive it.
- **Contradictions** → comment on the issue with the correction and report to the user.

Cheap defaults are fine for questions with an obvious answer; say which you took.

**Done when:** no candidate enters Step 3 carrying an unresolved question. Every fork is
answered by the code, decided by the user, or the issue is dropped from the batch. If you
cannot say that sentence about an issue, it is not ready to dispatch.

---

## Step 3 — Shape the batch

**Dependencies.** Resolve exactly as `/wz-next-issue` Step 2 does — native
`gh api repos/{owner}/{repo}/issues/<N>/dependencies/blocked_by` first, prose
(`blocked by` / `depends on #N`) as fallback. Negations (`independent of #N`) are not
blockers. Never dispatch an issue with an open blocker.

**Then group by FILE FOOTPRINT — this is what makes a batch safe.** Scout the real files
each issue touches (grep, don't guess from the title):

- **Disjoint footprints → dispatch in parallel.**
- **Shared file → strictly serialize**, and say which order and why. Two agents editing the
  same file in parallel means a painful rebase or lost work.
- **Cross-cutting issues** (a refactor touching every consumer) run **alone**, last.
- An issue needing backend *and* frontend: either one general agent (small, tightly coupled),
  or split into two agents on a **pinned contract** — name the exact param and field names in
  both prompts, and merge backend first (additive changes are backward-compatible).

Print the plan: parallel groups, serialized chains with rationale, and anything deferred.
Some issues say in their own body that they're not worth doing — honour that.

---

## Step 4 — Dispatch

One issue (or one coupled pair) per subagent.

- **Agent type by centre of gravity:** `frontend-style` (CSS/index.css/tokens),
  `frontend-feature` (React pages/hooks/data/routing), `backend`
  (SQLAlchemy/services/routes/migrations), `claude` (general — small cross-cutting work that
  needs both halves in one PR).
- **Every subagent launches with `isolation: "worktree"`.** Parallel agents without it clobber
  each other. If the flag itself fails (it can `EEXIST`), create the worktree by hand with
  `git worktree add` and point the agent at it — never fall back to sharing your cwd.
- Tell the agent to read the issue in full itself; put the *decisions* and the *contract* in
  the prompt so it doesn't re-litigate settled questions. Anything you measured yourself, tell
  it to **verify, not obey** — your own findings rot mid-batch (Rule 3).
- **Designs:** subagents cannot reach `claude.ai` URLs, so you vendor them before dispatch —
  `docs/agents/design-fidelity.md`, "Vendor, build, delete". Read every design in the batch;
  don't generalise from the first.
- **Paste the Hazards block (bottom of this file) into every prompt, verbatim.**
- Each agent opens its own draft PR with `Closes #N` on its own line. On a split issue only
  the last PR carries `Closes`; earlier ones say `Part of #N`.
- Every PR body ends with a **"What to eyeball"** list (Step 6).

---

## Step 5 — The merge loop (your job)

> **Merge only PRs this batch created — check before every merge.**
>
> ```
> gh pr view <N> --json author,headRepositoryOwner,headRefName \
>   --jq 'select(.author.login=="pixieofhugs" and .headRepositoryOwner.login=="pixieofhugs")'
> ```
>
> Empty output → **do not merge it, do not check it out, do not run its gates.** Report it
> to the user as an unexpected PR and move on.
>
> Why this is not paranoia: the repo is **public** with no interaction limits, so any GitHub
> account can open a PR. Step 1 lists open PRs with no author filter and calls them "work a
> previous batch may have left unmerged". `render.yaml` sets `autoDeploy: true` on `main`,
> so **a merge is a production deploy**. And "fix it yourself on the PR branch" below means
> checking out branch-controlled code and running `npm ci` / `pytest` / `npm run lint` — all
> of which execute code from that branch (lifecycle scripts, `conftest.py`, the custom
> `local/no-raw-style-values` eslint rule) on this machine, where `backend/.env` lives.

Branch protection forces merges to **serialize**. Per PR, in order:

1. `gh pr ready <N>` — PRs open as drafts. **This does NOT re-trigger CI**: `test.yml` is
   `on: [push, pull_request]` with no `types:`, so `ready_for_review` fires nothing. `gh pr
   checks` right after this reports the run from when the draft was pushed. A fresh run
   needs a new commit or `gh pr update-branch`.
2. `gh pr update-branch <N>` — **just-in-time only**, when the PR is next in line. Updating
   eagerly wastes a full CI cycle, because every merge re-invalidates every other open PR.
3. `gh pr checks <N> --watch --interval 20` — **run in the background** so you're notified
   on completion instead of polling.
4. Only once it exits green: `gh pr merge <N> --squash --delete-branch`
5. Re-fetch main; move to the next PR.

Known constraints — don't waste time rediscovering them:

- **Auto-merge is DISABLED repo-wide** (`--auto` errors out).
- **`--admin` does NOT bypass** a required check that isn't present on an up-to-date head.
- **All three jobs are *required* checks** as of 2026-08-10 (`test`, `api-schema`,
  `frontend`). A red job now blocks the merge button in the machine, not just in your
  attention. `e2e` is deliberately NOT required — it is nightly-only.
  **Rot (Rule 3): this line has been wrong before.** Verify it:
  `gh api repos/{owner}/{repo}/branches/main/protection/required_status_checks --jq .contexts`
- **The CI job list is deliberately NOT written down here.** It lives in
  `.github/workflows/test.yml` and nowhere else. A hand-kept copy has rotted twice and
  cost a red merge each time — #1504 added `typecheck:design-sync` while this file still
  said five steps, and `api-schema` was live from #1584 while this file still said "two
  jobs", so a builder reported CI green having never heard of the third job. Do not
  reintroduce a copy.

**If CI fails:** read `gh run view <run-id> --log-failed` before reacting. For a small,
obvious defect (a type error, a lint nit) **fix it yourself on the PR branch** — commit,
push, re-watch. If the push is rejected non-fast-forward, fetch and rebase onto the remote
branch (a "Merge main" commit may have landed there). Re-dispatch or `SendMessage` the
original agent only when the fix is substantive.

Before merging work you didn't watch land, **verify the PR's real diff**
(`gh pr diff <N>`) contains what you think it does.

---

## Step 6 — The user reviews the live site as you go

They run the app and do the visual QA agents structurally cannot (agent worktrees have no
browser tools and no dev stack).

- **Their reports take priority over dispatching new work.** Stop queueing and triage first.
- Triage properly: reproduce from the description, fix the **root cause**, then ship a focused
  fix. If it's a regression from a PR in this batch, say so plainly.
- Decide with them whether a report becomes a new issue or a follow-up commit.
- **Tell them what to look at** as each PR merges — the specific faction/page/state
  combinations the change touched, not a generic "please check".
- **Never claim something is visually verified when it isn't.** Tests/tsc/eslint green is not
  "it looks right". Say which you have.

---

## Step 7 — When an agent goes quiet

Agents die on session limits and transient "connection closed" — **sometimes with no
completion notification at all**. Don't assume silence means progress.

Check reality: `gh pr list`, the issue state, `git worktree list`, and `git status` in the
agent's worktree. A silent death can leave *finished work sitting untracked on disk*.

- Found uncommitted work → **commit and push it immediately**, then decide whether to resume
  or finish it yourself.
- Transient death → `SendMessage` the agent's id to resume, telling it to `git status` and
  grep on disk first, since partial edits may be uncommitted. But **a resumed agent runs in
  YOUR cwd** — isolation is a property of the spawn, not of the agent — so if it still has
  files to edit, spawn a fresh agent pointed at the existing worktree instead.
- **Stopped by the user** → it will refuse to resume. Do not relaunch without asking.

---

## Step 8 — Close out

Report: what merged (PR → issue), what was deferred and why, what got corrected mid-flight,
and anything owed to the user (a manual sweep, a visual check, a decision still open).

**Check `main`'s own run after the last merge.** Parallel PRs that each restate a shared
registry row are green individually and red on `main` after squash — every branch passed, the
trunk didn't.

Update memory with anything durable. If the backlog has moved on, say what's next rather
than auto-starting another batch.

---

## Hazards block — paste into EVERY subagent prompt, verbatim

```
1. Commit + push INCREMENTALLY. OneDrive silently reverts long-uncommitted edits; the Edit
   tool can silently drop writes — `grep` each file on disk after editing to confirm. Never
   batch into one final commit. Prefer a worktree OUTSIDE OneDrive (C:\Users\pixie\AppData\Local\Temp\).
2. node_modules: the worktree lacks it. `mklink` is a **cmd.exe builtin and is NOT on
   PATH** in Bash or PowerShell — it needs the call through `cmd`, or use `npm ci`:
   Bash: `cmd //c mklink /J "$(pwd)/frontend/node_modules" "<ABSOLUTE Windows path to main>\frontend\node_modules"`
   or `npm ci`. A WRONG relative depth silently makes the tsc binary absent, so `tsc | grep -c`
   reports a FALSE 0-error pass — verify `tsc --version` actually runs. `Cannot find module
   'node:fs'/'node:url'` is a known stale-junction false alarm (PR #675), not a real error.
   Remove the junction before finishing — `git worktree remove` follows it and wipes main's node_modules.
3. CI: **any written list of jobs ROTS — read `.github/workflows/test.yml`.** It is the only
   authoritative list of jobs and steps, and it changes. `grep -E '^  [a-z-]+:$|- name:' .github/workflows/test.yml`
   prints them, and that output is the ONLY list to act on. Run every step it names,
   locally, before calling anything green — vitest and the byte budget fail CI as readily
   as tsc does. The two sub-blocks below explain WHY two of those steps bite, which the
   YAML does not say. `no-raw-style-values` is a ratchet: raw
   font-size/spacing/hex in new or de-grandfathered files fails CI — use `var(--text-*)` /
   `--space-*` / Tailwind.
   ⚠️ **`api-schema` (#1584) runs `python scripts/regen_api_client.py` from the repo root and
   then `git diff --exit-code`.** Touch a route signature, a `response_model`, or any Pydantic
   schema and you MUST commit the regenerated `backend/openapi.json` AND
   `frontend/src/api/generated/schema.d.ts` in the same PR, produced by that script — never
   hand-edited, and never by a second code path you wrote yourself.
   ⚠️ **`typecheck:design-sync` is the one a clean `tsc --noEmit` does NOT cover.** It
   typechecks `.design-sync/previews/` against the REAL app types: `previews/_fixtures.tsx`
   builds actual `TaskOut`/`PraxisOut` and `previews/_state.tsx` builds full state literals
   (`EditPraxisState`, task detail). **Adding a REQUIRED field to any contract the kit
   constructs fails with `TS2739: ... is missing the following properties`.** Update the
   fixture in the same commit — the preview kit is a consumer of these contracts, not a
   scratch area. Never weaken a field to optional just to dodge this step.
4. Colours live ONLY in `frontend/src/index.css`; dark mode via the `[data-theme="dark"]`
   cascade, never a `dark ? a : b` ternary. Read `WORLD_ZERO_STYLE.md` before UI work.
5. Backend work uses a DEDICATED test DB `wz<issue>_test` — parallel agents share
   `worldzero_test` and drop each other's tables mid-run.
6. You have NO browser tools and no dev stack — verify via tests/tsc/eslint and state plainly
   in the PR that visual QA is outstanding.
7. Base off the latest `origin/main` (fetch/rebase if stale).
8. If the spec contradicts itself or the code, STOP and report back — do NOT guess.
```

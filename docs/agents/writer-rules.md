# Writer rules

Standing rules for any agent that writes code in this repo. `backend`, `frontend-feature`
and `frontend-style` read this at task start because their definitions say so; a `claude`
dispatch reads it because its prompt says so. This file is the only copy — `/builder-bot`
used to paste the first three blocks into every dispatch prompt, which paid for them once per
agent in the orchestrator's output and again on every turn it took afterwards.

## Lazy

Be lazy: efficient, never careless. Read the task and trace the real flow end to end FIRST —
laziness that skips comprehension ships a confident wrong fix. Then take the first rung that
holds: (1) does this need to exist at all? (2) does this repo already have a helper, hook,
CSS var, or archetype for it — look before you write; (3) stdlib / native platform feature;
(4) an already-installed dependency; (5) one line; (6) the minimum code that works.
- No unrequested abstractions. No interface with one implementation, no config for a value
  that never changes, no scaffolding "for later".
- Deletion over addition. Shortest working diff wins — but the smallest change in the wrong
  place is a second bug, not a lazy fix.
- A bug report names a symptom. Grep every caller and fix it once where they all route
  through, not per-symptom.
- Mark a deliberate simplification with a `ponytail:` comment naming the ceiling and the
  upgrade path.
- Never lazy about: input validation at trust boundaries, error handling, security, a11y
  basics, or anything the issue explicitly asks for.

## Red

Name the seam you're testing at before you write code, and state it in the PR body.
Write the failing test at that seam first — the loop goes red on the real defect, or you
don't understand the defect yet. Then make it green.
Run `tsc --noEmit` after each file you touch and the single relevant test file as you go;
run the full suite once at the end. Do not batch verification into one run at the finish.
Non-trivial logic leaves one runnable check behind. Trivial one-liners need no test —
YAGNI applies to tests too.

## Hazards

1. Commit + push INCREMENTALLY. A concurrent `/git-reaper` sweep has twice emptied a live
   worktree — uncommitted work in one is not safe. `grep` each file on disk after editing to
   confirm the write landed. Never batch into one final commit.
2. node_modules: the worktree lacks it. This machine is **Linux** — symlink it:
   `ln -s /home/pixie/Projects/WorldZeroPlayground/frontend/node_modules "$(pwd)/frontend/node_modules"`
   (absolute target, always — a WRONG relative depth silently makes the tsc binary absent, so
   `tsc | grep -c` reports a FALSE 0-error pass; verify `tsc --version` actually runs). `npm ci`
   also works and is slower. `Cannot find module 'node:fs'/'node:url'` is a known stale-link
   false alarm (PR #675), not a real error.
   **Remove the symlink before finishing** — `rm frontend/node_modules` (never `rm -r`, which
   would follow it into main's copy). `git worktree remove` also follows a link and wipes
   main's node_modules.
2b. `python3` on this machine is a **mise shim that rewrites PATH**, which makes `gh` resolve
   to a broken bootstrap shim at `~/.local/bin/gh` that HANGS FOREVER. Any repo script that
   shells out to `gh` (`scripts/gh_issue_comments.py`, the merge-guard hook) must be run as
   **`/usr/bin/python3`**, not `python3`/`python`. For backend work use the venv python at
   `/home/pixie/Projects/WorldZeroPlayground/backend/.venv/bin/python` — worktrees carry no venv.
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
6. **A helper script belongs in YOUR OWN worktree, never in the session scratchpad.** The
   scratchpad is the one directory parallel agents share, so a generic name like `run_tests.py`
   gets clobbered and you run another agent's script against the wrong worktree and the wrong
   test DB — silently, and green. Second-best, if a file genuinely must live there: prefix it
   with the issue number.
7. You have NO browser tools and no dev stack — verify via tests/tsc/eslint and state plainly
   in the PR that visual QA is outstanding.
8. Base off the latest `origin/main` (fetch/rebase if stale).
9. If the spec contradicts itself or the code, STOP and report back — do NOT guess.

## Report

Your final message lands in the dispatcher's context and is paid for again on every turn it
takes afterwards. Return the PR number and **at most six lines**: what changed, the check you
ran and its result, and anything that affects other work. Everything else — reasoning, the
file list, the "What to eyeball" list — belongs in the PR body, where it is read once. So does
anything your own definition asks you to report that will not fit: design decisions, things
you spotted for another agent. Put those under their own heading there and name it in a line.

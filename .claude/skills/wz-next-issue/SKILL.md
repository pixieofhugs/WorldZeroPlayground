---
name: wz-next-issue
description: Builds exactly ONE `ready-for-agent` GitHub issue and stops at a draft PR, never merging. Ranks unblocked candidates by dependency links, implements the winner in a git worktree, and comments on the issue and stops rather than guessing when it hits anything needing a human. Use for a SINGLE issue — "pick up the next issue", "what should I work on next", "take this issue and run with it". For several issues at once, or anything that must actually merge, use `wz-next-batch` instead.
---

# wz-next-issue

Picks the smartest `ready-for-agent` issue to do right now — respecting cross-issue
dependencies — then builds it autonomously and opens a draft PR. If it gets stuck,
it comments on the issue and stops for a human.

**Invoke:** `/wz-next-issue` (or `/wz-next-issue #42` to force a specific issue, skipping selection).

**Running a whole batch instead?** Use `/wz-next-batch` — it shapes a multi-issue batch,
dispatches each issue to a scoped subagent in its own worktree, and merges the PRs. This
skill is the single-issue path: it builds the work itself and deliberately stops at a draft PR.

**Hard rule, up front:** This skill **trusts the `ready-for-agent` label** — it never
re-triages. It picks up exactly where `/triage` stops. And it **never guesses** on an
ambiguity: when a human decision is needed, it stops and comments (Step 6) rather than
inventing an answer. This matters because a wrong autonomous guess on someone else's repo
is expensive to unwind; a comment costs nothing and keeps the human in the loop.

---

## Step 1 — Gather candidates

The repo is inferred from `git remote` (per `docs/agents/issue-tracker.md`):

```
gh issue list --label ready-for-agent --state open \
  --json number,title,body,labels,createdAt
```

Then, for each candidate, pull its **native** dependency + hierarchy links (these aren't in
the list JSON — fetch per issue). The repo uses GitHub's native issue-dependency and
sub-issue features as the source of truth:

```
gh api repos/{owner}/{repo}/issues/<N>/dependencies/blocked_by --jq '.[] | "\(.number) \(.state)"'
gh api repos/{owner}/{repo}/issues/<N>/sub_issues             --jq '.[] | "\(.number) \(.state)"'
```

(`dependencies/blocking` is the inverse — what this issue blocks — used for fan-out in Step 3.)

If the list is empty, say so and stop:

> No open `ready-for-agent` issues. Run `/triage` to get some ready, then come back.

If `/wz-next-issue #N` was invoked, fetch just `#N` and confirm it's open and labelled
`ready-for-agent`. If it isn't, say so and stop. Then jump to Step 2 to verify its
dependencies before going to Step 4.

---

## Step 2 — Resolve dependencies (native links first, then prose)

Check blockers in **two layers**. Native links are authoritative; prose is the fallback for
issues authored before the repo moved to native links.

**Layer 1 — native (authoritative).** From the Step 1 fetch:

- **`blocked_by`** — every issue listed here is a hard blocker. The candidate is **blocked**
  if *any* of them is `state: open`. (Design issues commonly block their build issue this
  way, e.g. a `ready-for-agent` build `blocked_by` a `needs-design` design.)
- **`sub_issues` parent** — a candidate that is itself a sub-issue inherits no automatic
  block, but if its body says the parent must land first, treat that as a blocker. Sub-issue
  *children* being open does **not** block the parent.

**Layer 2 — prose (fallback).** Also scan the candidate's title + body (read a
`## Dependencies` section first if present) for blocker references not captured natively:

- `blocked by #N`, `blocked on #N`, `BLOCKED` (often in the title — read the body to find which `#N`)
- `depends on #N`
- `after #N` / "follow-up to #N" (treat as a blocker if the body frames it as required)

**Negations are NOT blockers** — the bodies here use them deliberately: `independent of #N`,
`does not depend on #N`, `does NOT edit ... #N`, "related to #N", "see #N". A `#N` in any of
these is context, not a gate — do not set the candidate aside for it.

For every prose `#N` that *is* a blocker (and isn't already a native one), check its state:

```
gh issue view N --json state,title
```

A candidate is **eligible** only if **every blocker — native or prose — is `CLOSED`**. If any
is still `OPEN`, mark the candidate **blocked** and set it aside — report it, but never pick it.

Be conservative on prose: a bare `#N` mention that's clearly context is **not** a blocker.
Only treat it as blocking when the prose says the work can't proceed without it. If genuinely
unsure whether a reference blocks, treat it as blocking and note the ambiguity in the report.

---

## Step 3 — Rank & select

Skip this step if invoked as `/wz-next-issue #N` — just confirm `#N` is eligible (Step 2)
and proceed to Step 4. If `#N` is blocked, say which open blocker stops it and stop.

Among eligible candidates, rank with this stated heuristic (reason it out; there is no
hardcoded score):

1. **Priority by kind** — a `bug` outranks an `enhancement`, all else equal.
2. **Unblocks the most others** — an issue that other open issues name as their blocker
   has high fan-out; clearing it frees the most work. Read fan-out from the native
   `dependencies/blocking` list (Step 1) plus any prose blockers pointing at this issue.
3. **Tightest scope** — a crisp, well-bounded AGENT-BRIEF beats a vague one (lower risk
   of hitting the Step 6 escape hatch).
4. **Oldest `createdAt`** — tiebreaker.

Print the ranked shortlist, one line of rationale each, name the **winner**, and list any
**blocked** issues with the open blocker that stops them. Example:

> **Selected: #152** — bug, tight scope, unblocks #161. Working it now.
> Also eligible: #157 (enhancement, larger scope).
> Blocked: #161 (blocked by #160, still open).

---

## Step 4 — Isolate

Create a worktree + branch per the `CLAUDE.md` worktree convention. Slug = a few words
from the issue title, kebab-cased:

```
# OUTSIDE OneDrive: it silently reverts long-uncommitted edits, and
# wz-next-batch's Hazards block says the same. Keeping both inside
# .claude/worktrees/ is what made these two skills contradict.
git worktree add "$LOCALAPPDATA/Temp/wz<number>" -b claude/<number>-<slug>
```

Read the issue **in full**, including comments and the AGENT-BRIEF:

```
gh issue view <number> --comments
```

Stay strictly within the file scope the brief defines. Note its acceptance criteria — they
are the definition of done for Step 7.

---

## Step 5 — Implement

Work the brief inside the worktree. Reuse the existing skills rather than reinventing:

- `/tdd` for test-first work where it fits.
- `/review` on the diff before you call it done.
- Read what the `CLAUDE.md` routing table points you to for the touched area — don't
  reload docs you don't need.

Run the gates and make them pass:

- Backend: `pytest --cov=. --cov-fail-under=80` (from `/backend`)
- Frontend: **all six steps** (from `/frontend`). `npm test` alone is only `vitest run`
  — one of six — and is NOT the frontend gate:
  `npm run lint`, `npm run typecheck`, `npm run typecheck:design-sync`, `npm test`,
  `npm run build`, `npm run budget`
- API contract: if you touched a route signature, a `response_model` or any Pydantic
  schema, run `python scripts/regen_api_client.py` from the repo root and commit BOTH
  `backend/openapi.json` and `frontend/src/api/generated/schema.d.ts`. The `api-schema`
  job regenerates and runs `git diff --exit-code`, so a stale artifact is a red PR.

All three jobs (`test`, `frontend`, `api-schema`) are required checks on `main`. If this
list ever disagrees with `.github/workflows/test.yml`, **the workflow wins** — go read it:
`grep -E '^  [a-z-]+:$|- name:' .github/workflows/test.yml`

Commit on the branch with a clear message. Stay in scope — if the work wants to grow
beyond the brief, that's a Step 6 escalation, not a license to expand.

---

## Step 6 — Human-intervention escape hatch (autonomous, but safe)

This is the core safety behaviour. At **any** step, if you hit something you can't resolve
on your own, **stop** — do not guess, do not push, do not open a PR. Triggers include:

- The spec is ambiguous or self-contradictory, or two docs disagree.
- A design/product decision a human must make.
- Tests you cannot get green after a genuine attempt.
- A named blocker is actually still open (caught late).
- Scope balloons past the brief.

When you stop, do all of:

1. Comment on the issue, prefixed with the AI marker:

   ```
   gh issue comment <number> --body "$(cat <<'EOF'
   > *This was generated by AI during /wz-next-issue.*

   **Stopped — needs human input.**

   **What I was doing:** <one line>
   **What's blocking me:** <the specific ambiguity / failure / decision>
   **What I tried:** <brief>
   **What I need from you:** <the exact question or decision>
   **Branch left for inspection:** `claude/<number>-<slug>`
   EOF
   )"
   ```

2. Apply the matching triage label:
   - `gh issue edit <number> --add-label "needs-info"` — missing information.
   - `gh issue edit <number> --add-label "ready-for-human"` — needs a human to decide or implement.

3. Leave the worktree intact. Report the branch name and stop.

Never push or open a PR on an escalation.

---

## Step 7 — Finish (success path)

When the gates pass and the brief's acceptance criteria are met:

1. Push the branch:

   ```
   git push -u origin claude/<number>-<slug>
   ```

2. Open a **draft** PR linking the issue:

   ```
   gh pr create --draft \
     --title "<concise title>" \
     --body "Closes #<number>

   <what changed, in a few lines>

   Test results: <pytest / npm test summary>"
   ```

3. Report back: issue #, branch, PR URL, what was done, test results.

Stop there. Do not mark the PR ready, do not merge.

---

## Hard rules

- Never re-triage; trust the `ready-for-agent` label.
- Never work a blocked issue (a named blocker still open) — pick another or stop.
- Never silently guess on ambiguity — comment + escalate (Step 6).
- Stay within the issue's file scope; don't drift to adjacent problems.
- Never force-push, never mark a draft PR ready, never merge.
- One issue per run.

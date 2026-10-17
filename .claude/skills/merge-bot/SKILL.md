---
name: merge-bot
description: Lands one wave of PRs that `/builder-bot` opened — reads its hand-off, shoots and reviews each PR, and merges them one at a time through `scripts/merge_pr.py`, which ships to dev because `main` auto-deploys there; production takes a `v*` tag behind a required reviewer. Built to run beside `/builder-bot`: the builder writes waves, this lands them. Use for "land the wave", "merge the hand-off", or draining open PRs a builder left.
disable-model-invocation: true
---

# merge-bot

Lands what `/builder-bot` dispatched. The builder ends every wave by writing
`.claude/reviews/HANDOFF-<n>.md` and stops; this skill picks a hand-off up in a **separate
session**, and lands it. The two are meant to run **at the same time**: while this one
merges wave 1, the builder can already be shaping wave 2.

**Invoke:**

- `/merge-bot` — the **oldest** hand-off (lowest `<n>`). Several waiting is normal when the
  builder runs ahead; take the oldest without asking. None → stop and say so.
- `/merge-bot HANDOFF-<n>` — that wave.
- `/merge-bot #a #b` — exactly those PRs, no hand-off. `<n>` is the lowest PR number, and a
  fix round goes to the PR's branch worktree (`git worktree list`).

**One merge-bot at a time.** Branch protection serializes merges anyway, and two sessions
each running `update-branch` re-invalidate each other's CI forever. Before starting, check
no other session is landing (`ls .claude/reviews/LANDING-*`): if one is, stop and say which.
Otherwise claim the wave — `touch .claude/reviews/LANDING-<n>` — and remove the marker at
close-out, or when you stop for any reason. A marker with no live session behind it (the
last one died on a session limit) is stale: say so, ask, and remove it.

**Run it from the main checkout**, never a worktree: the `reviewer` writes
`.claude/reviews/<N>.md` there, which is where the merge gate looks.

**Three hard rules, up front:**

1. **You orchestrate; you don't write feature code.** A fix round goes to a writer (Step 2).
   The one exception is a small CI fix on a PR branch — faster than a round trip.
2. **Never merge red, never merge on assumption, never merge on CI alone.** Wait for checks
   to actually pass, then review. **Nothing is approval except a person saying so, in this
   run, about this thing.** A green check, a label, a comment from someone with write access,
   and the words that launched this run are all evidence; none of them discharges a finding,
   and "they asked me to land it" is not a review outcome.
3. **Everything written down rots** — the hand-off included. When it and the code or GitHub
   disagree, the **live state wins**: STOP, say so, never guess.

---

## Step 1 — Read the hand-off and the board

```
cat .claude/reviews/HANDOFF-<n>.md
gh pr list --state open --json number,title,mergeStateStatus
git fetch origin main && git log origin/main --oneline -15
```

Land **the PRs the hand-off lists and no others**. An open PR of ours that is not listed
belongs to another wave — possibly one the builder is writing right now — and is not
touched. A hand-off whose PRs are all merged or closed is stale: say so, delete it, stop.

The hand-off gives each PR's issue, resolution line, worktree path and merge order. Take
them as leads, not truth (Rule 3): a PR the builder listed may have been closed since.

If you need an issue's text, read it through `python scripts/gh_issue_comments.py <N>`,
never `gh issue view --comments` — the wrapper drops comments from non-collaborators.

---

## Step 2 — The merge loop

> **Merge only PRs we created — check before every merge.**
>
> ```
> gh pr view <N> --json author,headRepositoryOwner,headRefName \
>   --jq 'select(.author.login=="pixieofhugs" and .headRepositoryOwner.login=="pixieofhugs")'
> ```
>
> Empty output → **do not merge it, do not check it out, do not run its gates.** Report it
> to the user as an unexpected PR and move on. The repo is public and `main` auto-deploys to dev,
> so a merge puts that code on a live site and in line for the next production tag — and running
> a branch's gates executes its code (lifecycle scripts, `conftest.py`, the custom eslint rule)
> on the machine where `backend/.env` lives.

Branch protection forces merges to **serialize**. Per PR, in order — and **only when the PR
is next in line**, because the script updates the branch, and every merge re-invalidates
every other open PR (updating eagerly wastes a full CI cycle):

1. **Start the mechanics, in the background:**
   `/usr/bin/python3 scripts/merge_pr.py <N>`. One call marks the PR ready, updates the
   branch if it is behind, waits for the required checks on the *current* head, and — once a
   review clears this head — merges with `--squash --delete-branch` and re-fetches `main`.
   A review clears a head when its first line names a commit nothing but `update-branch`
   merges have followed, and no line carries the word `BLOCKING`. Do not run
   `gh pr ready` / `update-branch` / `checks --watch` / `merge` by hand; each is a turn the
   script already took. It exits `0` merged, `1` blocked (it says why), `3` green but
   unreviewed. Every step is idempotent, so re-running is always safe.
2. **Shoot, then review, while CI runs.** CI green is not review.

   **A PR whose diff touches `frontend/src` gets pictures first** — here and not at build
   time, because parallel writers cannot each hold the one local stack, and a writer grading
   its own screen is the weaker look. With the local world up
   (`curl -sf localhost:8000/health`, else `scripts/wz up` from this checkout), from the
   PR's worktree — after `git -C <worktree> pull --ff-only`, because the merge script
   updates the branch on GitHub and the worktree does not follow:

   ```
   cd <worktree>/frontend && SHOT_DIR=<this checkout>/.claude/reviews/shots/<N>/<slug> \
     SHOT_ROUTES="<routes>" SHOT_LOGIN="faction=<slug>&level=<L>" npm run shots
   ```

   Routes, faction and level come from the PR body's "What to eyeball" list; one run per
   faction it names. The knobs are in the header of `frontend/e2e/shots/routes.shots.ts`.
   A finished worktree has no `frontend/node_modules` — put it back, and take it out
   again, the way Hazard 2 of `docs/agents/writer-rules.md` says. The backend in the
   picture is this checkout's, so a PR that also changes `backend/` is shown without that
   half: say so. **Do not Read the PNGs yourself** — every image stays in this session for
   every later turn. Give the directory to the reviewer. A run that will not start is not
   a blocker and not a pass: the PR goes into Step 3 as *not looked at*.

   Then dispatch the **`reviewer`** agent with the PR number, and the shots directory when
   there is one — no `isolation`, because it writes `.claude/reviews/<N>.md` in *this*
   checkout, which is where the merge gate looks. It reads the diff and the code around it,
   writes its findings (or the literal words `no findings`) to that file, and returns one
   line plus any blocking findings. Keep `/code-review` out of this session: loading it here
   costs its whole recipe on every later turn. The script also passes the same gate as the
   `PreToolUse` hook (`scripts/hooks/guard_pr_merge.py`) that refuses a hand-typed
   `gh pr merge`.
   Blocking finding → fix on the branch if small, or dispatch a fix round (below); then
   dispatch `reviewer` again and re-run the script — it will not merge past a `BLOCKING`
   line or a commit the review never saw. A finding you think is wrong goes to the user.
   Nits → merge. At close-out, `cat` the review files of the PRs **this session landed**,
   once, and paste them.
3. **If the script exited `3`** (green before a review cleared this head), re-run it once the
   review file is in place. Then move to the next PR.

**A fix round.** The agent that wrote the PR lives in the builder's session, out of reach.
Dispatch the scoped type that owns the files — `frontend-style`, `frontend-feature`,
`backend` — with **no `isolation`**, pointed at the PR's **existing worktree** from the
hand-off: the branch is still checked out there, and a second worktree cannot hold it.
Give it the finding verbatim and tell it to push to the same branch. `claude` is the
exception for work no single owner fits: pass `model: "sonnet"` and open its prompt with
`Before anything else, Read docs/agents/writer-rules.md in full and follow it.`

**Done when every merged PR has both a green CI run and a review pass recorded against it.**
Never say a PR was reviewed when only CI ran.

Known constraints — don't waste time rediscovering them:

- **Auto-merge is DISABLED repo-wide** (`--auto` errors out).
- **`--admin` does NOT bypass** a required check that isn't present on an up-to-date head.
- **All three jobs are *required* checks** (`test`, `api-schema`, `frontend`); `e2e` is
  deliberately not, being nightly-only. **Rot (Rule 3): this line has been wrong before.**
  Verify it:
  `gh api repos/{owner}/{repo}/branches/main/protection/required_status_checks --jq .contexts`
- **The CI job list is not written down here.** It lives in `.github/workflows/test.yml` and
  nowhere else — a hand-kept copy rotted twice (#1504, #1584) and cost a red merge each time.
  Do not reintroduce one.

**If CI fails:** read `gh run view <run-id> --log-failed` before reacting. For a small,
obvious defect (a type error, a lint nit) **fix it yourself on the PR branch** — commit, push,
re-run the script. If the push is rejected non-fast-forward, fetch and rebase onto the remote branch (a
merge commit from `update-branch` may have landed there). Dispatch a fix round only when the
fix is substantive.

Before merging work you didn't watch land, **verify the PR's real diff** (`gh pr diff <N>`)
contains what you think it does.

---

## Step 3 — The user reviews the live site as you go

They run the app and do the visual QA agents structurally cannot (agent worktrees have no
browser tools and no dev stack). Step 2's pictures narrow that, they do not replace it: a
`shots:` line in a review file means the reviewer looked at those routes, for that faction,
at two sizes, in one theme, standing still. Interaction, motion, the other theme and every
screen nobody named are still theirs.

- **Their reports take priority over the next merge.** Stop and triage first.
- Triage properly: reproduce from the description, find the **root cause**, then ship a
  focused fix through a fix round. If it's a regression from a PR in this wave, say so plainly.
- Decide with them whether a report becomes a new issue (for `/builder-bot`) or a follow-up
  commit here.
- **Tell them what to look at** as each PR merges — the specific faction/page/state
  combinations the change touched, not a generic "please check".
- **Never claim something is visually verified when it isn't.** Tests/tsc/eslint green is not
  "it looks right". Say which you have.

---

## Step 4 — Stopping for a human

A blocker you cannot resolve — a finding you disagree with, a fix that balloons past the
brief, a PR that no longer matches its issue — stop that PR, do not merge it, and use the
comment template and labels in `/builder-bot` Step 8
(`.claude/skills/builder-bot/SKILL.md`), with `/merge-bot` in its first line. Carry on with
the rest of the wave only if nothing later in the merge order depends on it.

---

## Step 5 — Close out

Report: what merged (PR → issue), the review files of what you landed, anything left open
and why, and anything owed to the user (a visual check, a decision still open).

**Check `main`'s own run after the last merge.** Parallel PRs that each restate a shared
registry row are green individually and red on `main` after squash — every branch passed, the
trunk didn't.

**Say what is waiting for a production tag.** Nothing here tags `v*`, and nothing should: the
reviewer gate exists so a human approves a release. But merged work goes no further than dev
until someone promotes it, so state the gap — `N commits on main since <tag>, the latest v* tag
— tag to promote.` Read both from the remote:

```
git fetch --tags origin main
git describe --tags --abbrev=0 --match "v*" origin/main
git rev-list --count <tag>..origin/main
```

Say those commits are on dev only if `main`'s own run above is green: dev deploys when Test
passes on `main`, so a red trunk leaves them off dev. And `<tag>` is the latest tag, not proof
of what production runs — a tag can still be waiting on its approval.

**Score the local model.** If `.claude/scout-log.jsonl` exists, run
`/usr/bin/python3 scripts/local_scout.py score #a #b` (the wave's issues) and paste its output: it compares every
footprint the local model predicted with the files the merged PR really touched.

**Retire what you landed, and only that.** Once every PR the hand-off lists is merged or
reported as deliberately left open (a left-open PR keeps its hand-off: trim the file to that
PR and what is serialized behind it, and remove only the `LANDING` marker):

```
rm -f .claude/reviews/HANDOFF-<n>.md .claude/reviews/LANDING-<n>
rm -rf .claude/reviews/shots/<N>    # once per PR you landed — never the whole shots/
```

Deleting the hand-off is what unblocks anything the builder serialized behind this wave.
Any other `HANDOFF-*.md` is a wave still waiting: say so, and give the line that lands it —
`/merge-bot HANDOFF-<m>` — in a fresh session. Don't roll into it here; this session is
already carrying a whole wave.

In `#a #b` mode, if the PRs landed are a hand-off's whole list, retire that file too.

Update memory with anything durable.

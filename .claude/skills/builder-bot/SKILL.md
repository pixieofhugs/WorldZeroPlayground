---
name: builder-bot
description: Run a batch of ready-for-agent issues the lazy way — delete before you build, red before you fix, review before you merge.
disable-model-invocation: true
---

# builder-bot

`/wz-next-batch` with two gates it doesn't have: **lazy** — the cheapest change that works,
often none at all — and **red** — a failing test before the fix, a review before the merge.

**Invoke:** `/builder-bot` (or `/builder-bot #a #b #c` to force a set).

## Step 0 — Load the mechanics

Invoke the `wz-next-batch` skill. It owns the board read, dependency resolution, file-footprint
grouping, dispatch shape, the merge loop, and the Hazards block — and it stays the one place
those live. Everything below **adds to** it. Nothing below replaces it.

---

## Adds to "Verify premises, then grill" — rung zero, before you verify the premise

`wz-next-batch` Step 2 asks whether an issue's premise is still true. Ask first whether the
issue should exist. Three things keep turning up in this backlog:

- **Already shipped.** The behaviour landed in a later PR and nobody closed the issue.
- **Speculative.** It builds for a need nobody has yet. YAGNI — say so in one line.
- **Inverted.** The ask is an addition, but the codebase gets *better* by deleting instead.
  Check what the change would let you remove.

**Done when every candidate carries an explicit verdict — BUILD / DELETE / CLOSE / DEFER —
with a one-line reason, and the CLOSE and DEFER ones are commented on the issue before the
batch is shaped.** A candidate you merely didn't pick is not classified.

Cheap defaults are fine; say which you took. A verdict that reverses the issue's own framing
goes to the user, not straight to `gh issue close`.

---

## Adds to "Dispatch" — two more blocks into every dispatch prompt

Alongside the Hazards block, verbatim. Scoped subagents have no `Skill` tool — they cannot
reach ponytail or tdd themselves, so the rules travel in the prompt or not at all.

**Lazy block:**

```
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
```

**Red block:**

```
Name the seam you're testing at before you write code, and state it in the PR body.
Write the failing test at that seam first — the loop goes red on the real defect, or you
don't understand the defect yet. Then make it green.
Run `tsc --noEmit` after each file you touch and the single relevant test file as you go;
run the full suite once at the end. Do not batch verification into one run at the finish.
Non-trivial logic leaves one runnable check behind. Trivial one-liners need no test —
YAGNI applies to tests too.
```

---

## Adds to "The merge loop" — review is a merge gate

CI green is not review. Between `gh pr checks` going green and `gh pr merge`, run the
`review` skill against the PR's merge-base with `main`.

- Blocking finding → fix on the PR branch if it's small (Step 5 already allows this), or
  `SendMessage` the agent. Re-watch checks, re-review, then merge.
- Nits → merge, and note them in the close-out.
- Review flags over-engineering as a finding class here, not just correctness: an abstraction
  with one caller, a new dependency, a re-implementation of something already in the repo.

**Done when every merged PR has both a green CI run and a review pass recorded against it.**
Never say a PR was reviewed when only CI ran.

---

## Hard rules — additive to `wz-next-batch`'s

- Every candidate gets a rung-zero verdict before the batch is shaped.
- The lazy block and the red block go into every dispatch prompt, verbatim.
- Nothing merges on CI alone.
- The lazy gate never overrides an explicit ask. If the issue asks for the full version,
  build the full version — ship the lazy one and question it in the same breath instead of
  stalling on an answer you can default.

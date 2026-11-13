# World Zero — Agent System

Claude Code auto-discovers each `*.md` here as a dispatchable subagent (`subagent_type`).
The point of this directory is **scoped context**: each specialist loads only the docs
its role needs, instead of every agent inhaling the whole project.

## Specialists

- **`backend`** — owns `backend/`. Models, schemas, services, routes, migrations, tests.
- **`frontend-feature`** — owns `frontend/src/` except CSS. Pages, components, hooks, data wiring, routing.
- **`frontend-style`** — owns CSS, `index.css`, `utils/factions.ts`, card archetypes, the design system.
- **`reviewer`** — reads one PR and writes `.claude/reviews/<N>.md`, the file the merge gate
  requires. Edits no code. Pinned to Opus: it is the last reading before production.

- **`triage`** — researches one issue for `/planner-bot` and labels it. Read-only on code; it
  replaced a `general-purpose` dispatch that started three times heavier.

The three writers read `docs/agents/writer-rules.md` first — the Lazy, Red and Hazards rules
live there once, instead of being pasted into every dispatch.

The three writers run on Sonnet (`model:` in each file's frontmatter): they write to a spec the main
session already settled, and CI plus a review sit behind every PR. Raise one by editing its
frontmatter, or pass `model` on a single dispatch that needs more.

Each file's "Required reading" block is the scoping rule — respect it. `backend` never loads
the design guide; `frontend-style` never loads game-rules specs; and so on.

## Orchestration is the main session's job

There is no `planner` or `feature` subagent file, on purpose. Clarifying scope with Molly and
dispatching to specialists is what the **main Claude Code session** does directly — a subagent
can't hold an interactive conversation with the user, so a "planner subagent" would just be
ceremony. The main session reads `CLAUDE.md`, clarifies, then dispatches to one specialist
(single-domain) or several (a vertical slice that crosses backend + frontend).

If you later want those coordinator roles as real files anyway, add `planner.md` / `feature.md`
here — nothing stops it. We skipped them because they earned no keep.

## Dispatch shape

```
Molly → main session → { backend, frontend-feature, frontend-style } → reviewer
```

No cycles. Specialists don't call each other; if `frontend-feature` hits a design decision it
hands back to the main session, which dispatches `frontend-style`.

Each specialist gets its own git worktree; the **session scratchpad is the one directory they
share**, so brief it every time: *a helper script belongs in the agent's own worktree, never in
the session scratchpad.* A generic name like `run_tests.py` gets clobbered by a parallel agent
and the run goes green against the wrong worktree. Second-best, if a file genuinely must live in
the scratchpad: prefix it with the issue number.

## History

This replaced `docs/AGENTS_SETUP.md` (deleted) — a five-agent brief that was never built and
predated the current `CLAUDE.md` routing table. The routing table + these three specialists are
the working version of the same "scoped context per role" idea.

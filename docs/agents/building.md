# Build notes

What `/foreman:builder-bot` (Bot Bros) leaves to the repo. The skill is the wave; this is
World Zero's half of it.

## Writers

| Agent | Owns |
|---|---|
| `frontend-style` | CSS, `frontend/src/css/*.css`, tokens, `utils/factions.ts` |
| `frontend-feature` | React pages, hooks, data wiring, routing |
| `backend` | SQLAlchemy, services, routes, migrations |
| `claude` | the general agent: small cross-cutting work needing both halves in one PR. Pass `model: "sonnet"`, as the scoped writers already run |

Definitions in `.claude/agents/`. Writer rules: `docs/agents/writer-rules.md`. The three scoped
writers already load it; a `claude` prompt opens with the line the skill gives.

## Designs

Vendor them before dispatch: `docs/agents/design-fidelity.md`, "Vendor, build, delete".

## Footprint step

> **Experiment — footprints go to the local model first.** When `scout` is on `PATH`, ask
> it for the footprint of each surviving issue that has no fresh planner stamp — one issue
> per call, one call at a time (the local model answers one request at a time), in the
> background while you carry on:
>
> ```
> /usr/bin/python3 scripts/local_scout.py run footprint <N> "$(cat <<'TASK'
> <what the issue changes, in a sentence or two: the behaviour, and the names it uses — the model starts with no context>
> TASK
> )"
> ```
>
> The task goes through a **quoted** heredoc because issue text is untrusted: inside a plain
> double-quoted argument, a backticked name (`` `scripts/wz reset` ``) or a `$(…)` would run
> as a command before the script starts. Never put the task in double quotes directly.
>
> It prints one path per line and logs the call. The answer is a **lead**: confirm each path
> exists on `origin/main` and holds what the issue is about, add what it missed, and record
> what you found — `… local_scout.py verdict <id> ok`, or a wrong verdict with the note in the same quoted heredoc (so an apostrophe is safe):
>
> ```
> /usr/bin/python3 scripts/local_scout.py verdict <id> wrong "$(cat <<'NOTE'
> <what it got wrong>
> NOTE
> )"
> ```
>
> An empty
> answer or a "not found" proves nothing; scout that issue yourself.
>
> Exit `2` means the local model is not running. Scout yourself and say so once in the
> close-out. **Leave Strata alone** — it takes the GPU she games on, and starting it is hers.

Say in the hand-off when scout exited 2 and you scouted yourself.

# ADR-0051 — Duel acceptance bypasses the task-level gate

**Status:** Accepted
**Date:** 2026-07-20

**Relates to:** ADR-0011 (a duel is two linked praxes, cold symmetric challenge),
#292 (single task-level gate via `meets_task_level`), #811 (faction level-jump
allowance), #815 (this issue).

## Context

`meets_task_level` (`backend/services/praxis.py`) is the single named home for the
task-level gate (#292) — the "level half" that used to be inlined per call site.
Solo signup and collab signup both call it via `evaluate_signup`. A duel
*challenger* also calls it: `issue_duel_challenge` attaches to the challenger's
existing praxis, which was itself created through the same `create_praxis` →
`evaluate_signup` path, so the challenger is gated by `meets_task_level` too.

`respond_to_duel_challenge` — the opponent's *acceptance* of a duel — is
different. It never calls `meets_task_level`. Its only level check on the
opponent is a flat floor, `era.duel_level_required` (Era 1: level 2), compared
directly against the opponent's `CharacterStats.level`. `task.level_required`
plays no part in whether an opponent may accept.

Issue #815 originally read this as a bug: every other signup path enforces the
task-level gate, so duel acceptance looked like an oversight, and the issue
went on to ask about grandfathering, gating at issue time, and whether
accepting should consume the ADR-0011 faction level-jump allowance (#811).
The repository owner ruled (2026-07-19, issue comment) that the absence of a
task-level gate on duel acceptance is **intended**: a duel is meant to let an
opponent reach above their own level, so the acceptance path deliberately has
no task-level floor — `era.duel_level_required` is the only level check, by
design. That ruling moots the grandfathering/gating/level-jump questions raised
in #815: there is no gate to extend or consume in the first place.

Left unaddressed, this is still worth recording, because a later "let's
consolidate the level gates" pass (in the spirit of #292) could read the
absence of a `meets_task_level` call in `respond_to_duel_challenge` as a gap
and silently close it — re-adding a check the owner explicitly does not want.

## Decision

Duel acceptance does not call `meets_task_level` and never will, absent a new
ruling. `respond_to_duel_challenge` enforces exactly one level check on the
opponent — `opponent_stats.level >= era.duel_level_required` — and no
`task.level_required` comparison.

This narrows the #292 invariant ("a single task-level gate shared across
signup paths") to **solo signup, collab signup, and duel initiation** (the
challenger, via `create_praxis` → `evaluate_signup`). Duel *acceptance* is an
explicit, permanent exception to that invariant, not a mode #292 covers.

The #811 faction level-jump allowance (`level_reach` on `meets_task_level`)
therefore does not apply to duel acceptance either, and stays that way: there
is no task-level gate on this path for the allowance to extend.

## Consequences

- `backend/services/duel.py::respond_to_duel_challenge` keeps its
  `era.duel_level_required` check as the sole level gate on the opponent; an
  intent comment beside it points here so the check is not "completed" with a
  `meets_task_level` call by a future refactor.
- `backend/services/praxis.py::meets_task_level`'s docstring names its actual
  scope — solo signup, collab signup, duel initiation — and calls out duel
  acceptance as the deliberate exception, instead of claiming identical
  behaviour "across solo, collab and duel."
- An opponent may accept a duel challenge on a task well above their own
  level, as long as they clear the flat `era.duel_level_required` floor. This
  is intended, pinned by a test in `backend/tests/integration/test_duel_service.py`.
- Any future proposal to gate duel acceptance by `task.level_required` (or to
  extend the #811 allowance to it) must amend or supersede this ADR first.

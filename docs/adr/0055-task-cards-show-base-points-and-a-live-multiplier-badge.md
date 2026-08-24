# ADR-0055 — Task cards show base points + a live multiplier badge

**Status:** Accepted
**Date:** 2026-07-27

**Relates to:** #1020 (epic), #1022, #1023
**Distinct from:** ADR-0053 (Retire Merit) — that retired the post-vote, duel-inclusive
praxis `display_multiplier`. This ADR is about a different, still-live mechanism: the
pre-submission per-faction task multiplier.

## Context

The v2 faction task-card redesign (design project `0711d3a7-0074-4a60-8907-270f44168261`)
needed to decide what "points" a card shows. Investigating surfaced a stale assumption:
the per-faction task multiplier (`own_task_modifier`/`other_task_modifier`, resolved by
`compute_faction_multiplier` on the backend and `computeDisplayPoints` in
`utils/points.ts`) reads as dead code because `era_1.py` neutralizes every faction's
modifier to 1.0 — but it is live infrastructure, not retired.

Today, `displayPoints` passed into `TaskCard` is already the *product* (`base ×
modifier`) computed by the caller. The v2 designs want to show base points and the
multiplier as separate, legible pieces — partly for clarity, partly so a future era
that ships a non-1.0 modifier doesn't require touching every card again.

## Decision

Task cards show **base points plus a `×multiplier` badge**, computed and rendered
separately rather than pre-multiplied.

- `CardProps` (`components/taskCard/TaskCard.tsx`) changes from `{ task, displayPoints, onSignup }`
  to `{ task, basePoints, multiplier, inProgressCount, onSignup }`. `basePoints` is
  `task.point_value`.
- A new `displayMultiplierFor(task)` helper sits beside `displayPointsFor` in
  `utils/points.ts` and returns the **raw** `own_task_modifier`/`other_task_modifier`
  factor for the viewer — never a derived `effective / base` ratio (that reconstruction
  was the ADR-0053 dead-arithmetic trap).
- The multiplier badge renders **only when the factor ≠ 1.0**. At `era_1` every faction
  resolves to 1.0, so the badge is invisible today across every card — this ships with
  zero visible change until a future era's `EraConfig` sets a non-1.0 modifier, at which
  point every card lights up automatically with no further rebuild.
- No backend work: the multiplier mechanism itself is unchanged, existing infrastructure.
  F1 (#1021) separately adds `in_progress_count` to `TaskOut` for the same redesign's
  "{n} in progress" element — an unrelated but co-shipped read.

## Consequences

- Cards become forward-compatible with era-tuned multipliers by construction, instead of
  requiring a rebuild the day one first goes non-1.0.
- Every `<TaskCard>` call site (`Tasks.tsx`, `Home.tsx`, and `DefaultTasks.tsx` once
  unified per ADR-0056) and every currently-registered faction skin must move to the new
  prop shape in the same change (F2, #1022) — a mechanical, non-visual pass across all 8
  existing skins is required even though only the na/Default card is visually rebuilt in
  F2; the other 8 get their full redesign in C1 (#1023).
- `displayPointsFor` (the pre-multiplied helper) stops being threaded into cards; it may
  still be used wherever a single combined number is wanted.

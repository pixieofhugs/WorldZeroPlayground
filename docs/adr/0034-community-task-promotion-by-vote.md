# ADR-0034 — Community task promotion by vote (the level-5 unlock)

**Status:** Accepted
**Date:** 2026-07-14

> **⚠ Status (2026-07-17 audit): NOT BUILT.** No backend implementation exists —
> no `TaskPromotionVote` model, no promotion-threshold config, and level 5
> (`voyager`) carries no `promote_tasks` ability. Accepted but unimplemented; do
> not treat as live behaviour. (CONTEXT.md's "Task promotion" section is being
> corrected to match.)

**Relates to:** #455 (this feature); the level-privileges table in `SPEC-game-rules.md`
(L5: "Vote to promote level-0 tasks"); ADR-0016 (per-faction surfaces share one data
contract); ADR-0031 (backend emits keys, frontend catalog resolves)

## Context

A proposed task lands `pending` (`services/task.py::propose_task`, gated at
`era.level_to_propose_task` = L3) and only an **admin** can flip it to `active`
(`routers/admin.py::approve_task`). Approval is therefore a single-gatekeeper
bottleneck. The level table has long promised a L5 unlock — "Vote to promote
level-0 tasks" — but it was never built (the L5 `voyager` `LevelProfile` is
whimsy-only, and `test_level_5_has_no_hard_gate_sense_only` asserts exactly that).

"Level-0 task" and "promote" were undefined. This ADR pins them.

## Decision

**"Promote" = the community collectively approves a `pending` task into the live
`active` pool.** It is an *additional* path to `active`, not a replacement: admin
approve/retire stay untouched as the override / safety valve.

- **Vote shape — approval count, not stars.** Each eligible account casts one binary
  "promote this" vote. No 1–5 value, no downvote/veto: dissenters abstain, and a task
  that never reaches threshold just sits (an admin can still approve or retire it).
  New join model `TaskPromotionVote(task_id, voter_character_id, voter_account_id,
  created_at)`, `UNIQUE(task_id, voter_account_id)`. This is a **separate** vote from
  the praxis star-`Vote`; the two never share a table or a budget.

- **Who may vote — level `era.level_to_promote_task` (= 5) and up.** New grounded gate
  constant. Account-level anti-self, mirroring praxis votes (`voter_account_id`): the
  **proposer's account cannot vote for its own task**, and one vote counts **per
  account** (alts can't stack a task to threshold). Free — a promotion vote does **not**
  draw down the praxis star-vote budget; the two systems stay decoupled.

- **Scope — any `pending` task, standard *or* metatask.** "Level-0" in the spec is
  descriptive (proposed tasks default to `level_required = 0`), not a gate: a task's own
  `level_required` is irrelevant to whether it can be promoted. This deliberately lets
  the L5+ crowd promote pending *metatasks* too (which only L6+ can propose) — an
  intentional widening, accepted.

- **Threshold — proportional to the eligible pool, with a floor.**
  `threshold = max(task_promotion_vote_floor, ceil(task_promotion_vote_ratio × eligible_accounts))`
  where `eligible_accounts` = distinct **accounts with at least one level-≥5 character in
  the current era** (same currency as the vote unit). Era-1 values:
  `task_promotion_vote_ratio = 0.25`, `task_promotion_vote_floor = 3`. Evaluated **live at
  each vote-cast**: when a task's distinct-account vote count reaches the current
  threshold it **auto-flips** `pending → active`. One-way; no un-promotion (admin retire
  is the reverse). In a nascent era with < 3 eligible accounts the floor makes community
  promotion simply unavailable — admin approval (coexistence) covers it.

- **Proposer edits are removed.** A pending task is now **immutable to its proposer**:
  the `PUT /tasks/{id}` route and `services/task.py::update_task` are deleted (the
  frontend never called them). This closes the bait-and-switch — accumulate votes on a
  benign task, then rewrite it before it flips — without any vote-reset machinery. Admins
  retain full edit/retire power.

**Data contract (ADR-0016).** `TaskOut` gains `promote_vote_count: int`,
`promote_threshold: int`, `viewer_has_promoted: bool` (meaningful only while `pending`).
The threshold denominator is global, so a pending-task **list** computes eligible-accounts
**once per request**, not per card (no N+1). A new `can_promote_task` capability flag joins
the `/auth/me` viewer flags next to `can_see_pending_tasks`.

**Surfaces.** The promote control (button + `count / threshold` progress) is a shared atom
rendered in the footer of all eight faction task-card archetypes **and** on `TaskDetail`,
shown only when `status == pending` and the viewer `can_promote_task` (disabled on the
viewer's own task). A player-facing **pending-tasks browse** (a filter on the Tasks list,
gated to eligible promoters) gives those cards somewhere to live — the frontend currently
surfaces pending tasks to admins only.

**Level wiring (ADR-0031).** L5 `voyager` gains a grounded `ability` unlock
(`promote_tasks`); `level_to_promote_task` joins `GATE_ATTRS`;
`test_level_5_has_no_hard_gate_sense_only` is replaced; `progression.json` gets the
`unlocks.promote_tasks.{name,desc}` copy.

## Consequences

- The admin approval queue stops being the only path to `active`; admins shift toward
  exception-handling (spam, fast-track, retire) rather than routine approval.
- The threshold is a moving target as the L5+ population grows — accepted; it is only ever
  read at vote-cast time, so no background job re-evaluates stale pending tasks.
- Proposers lose the (frontend-unused) ability to edit a pending task; a typo means
  re-propose or ask an admin.
- Promotion emitting an activity-feed event is **out of scope** for #455 (can be added
  later as a read-time projection per ADR-0023).

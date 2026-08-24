# ADR-0008: Sign-up eligibility is one game-logic predicate

**Status:** Accepted
**Date:** 2026-06-24

## Context

The Sign-up affordance appeared on tasks a character could not actually submit
to — wrong level, metatask faction mismatch, bank full, already working the task
as a collaborator. Clicking through then failed server-side, violating the
CLAUDE.md rule "hide unusable controls; don't show them disabled" (issue #156).

The root was a **split truth**. `TaskOut` already carried three viewer-relative
flags, but the Sign-up button gated on only one of them:

- `can_submit_praxis` — the *duplicate-authorship* rule only
  (`can_submit_praxis_for_task`, praxis.py), with the Analog Double Dipper
  carve-out. The button at `Home.tsx`, `Tasks.tsx`, and `useTaskDetail.ts` read
  this and nothing else.
- `eligible_for_current_user` — level + metatask-faction
  (`is_task_eligible_for_character`), used only to filter metatasks in
  editPraxis; the button ignored it.
- `allowed_modes` — solo/collab/duel by level.

Meanwhile the actual sign-up guard, `_check_create_preconditions`
(praxis.py:388), enforced a *different* set: level, dup-authorship, bank cap
(`era.max_task_signups`), and mode-level. And a fourth asymmetry: `list_tasks`
(task.py:230) hides a task once the character has **any** `PraxisMember` row
(membership), but `create_praxis` only blocked tasks the character **authored**.
So a task you joined as a collaborator was hidden from your list yet still
showed a working Sign-up button if you reached it directly — a real double-dip
path.

The flag did not mirror enforcement, in several independent ways.

## Decision

There is **one game-logic predicate** for "can this character sign up for this
task," and it is the single source for both the UI flag and the create guard.

- The game-logic layer (`backend/services/`) owns the decision. The API does not
  assemble it; the frontend does not assemble it. They read one boolean.
- **Governing invariant:** the Sign-up flag is true **iff `create_praxis` would
  accept**. The button hides exactly when sign-up would be rejected — no false
  positives (button that 4xxs), no false negatives (hidden button that would
  have worked).
- The predicate ANDs the gates that already gate sign-up, **using existing rules
  only**:
  1. **Authenticated** — anonymous viewers ⇒ false.
  2. **Level** — `stats.level >= task.level_required`.
  3. **Metatask faction** — a metatask requires
     `character.faction_slug == task.metatask_faction_slug`
     (`is_task_eligible_for_character`). This is the *only* faction rule today;
     standard tasks are faction-open. Generalising faction gating is deferred —
     see issue "architect faction rules logic".
  4. **Not already an active member** — keyed on `PraxisMember` membership, not
     authorship, so a joined collaborator is blocked too. The Analog Double
     Dipper carve-out is preserved (Analog bypasses this gate).
  5. **Sign-up bank** — `in_progress_count < era.max_task_signups`.
- The membership test is lifted into one shared predicate
  (`is_active_member_of_task`) consumed by **all three** call sites: the
  `list_tasks` exclusion filter, the `create_praxis` guard, and the flag. One
  query, one rule.
- `_check_create_preconditions` keeps raising gate-specific `HTTPException`s
  (so the error messages stay precise) but is refactored to evaluate the **same
  sub-predicates** the flag ANDs, so enforcement and flag cannot drift.
- Membership/eligibility keys on praxis **status**, per ADR-0007 — the
  `is_withdrawn` column is being dropped; "active" means a non-deleted praxis
  whose status is in-progress or submitted.

The consolidated boolean surfaces as a single new `TaskOut` field
(`can_sign_up`). The existing granular flags (`eligible_for_current_user`,
`allowed_modes`) stay for their other uses (metatask filtering, mode picker).

## Consequences

- `Home.tsx`, `Tasks.tsx`, and `useTaskDetail.ts` gate the Sign-up button on the
  one `can_sign_up` flag; they stop reading `can_submit_praxis` for this purpose.
- `create_praxis` now rejects a character who is already an active member of the
  task (was: only if they authored a praxis for it), closing the double-dip.
- `can_submit_praxis_for_task` stays the narrow dup-authorship rule that
  `create_praxis` single-sources; it is **not** overloaded into a god-predicate.
- Integration tests cover each gate (anonymous, level, metatask-faction,
  membership incl. joined-collab, bank cap, Analog carve-out). PR #122's
  abandoned `test_can_submit_praxis.py` is revived and extended.

## Alternatives considered

- **Overload `can_submit_praxis_for_task` into a fat flag.** Rejected: it is the
  dup-authorship rule that `create_praxis` references at the one-praxis-per-task
  gate; widening it muddies that single-source and overloads the name.
- **Compose the existing flags on the frontend** (`can_submit_praxis &&
  eligible_for_current_user`). Rejected: that is the frontend thinking, and it
  still misses bank-cap and membership, which live in neither flag. Layering
  principle: game logic decides, API and UI stay dumb.
- **Add standard-task faction locking now.** Rejected: no such rule exists or is
  spec'd; inventing it is a gameplay change, not a UI-truthfulness fix. Deferred
  to its own issue (the faction-rules seam).

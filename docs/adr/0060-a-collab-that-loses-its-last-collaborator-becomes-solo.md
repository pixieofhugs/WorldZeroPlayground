# ADR-0060 — A collab that loses its last collaborator becomes solo

**Status:** Accepted
**Date:** 2026-07-28

**Relates to:** #1071 (epic), #1072 (ADR-0059, the sibling behaviour change)
**Pairs with:** ADR-0013 (collaborations are co-owned), ADR-0047 (praxis card
shows computed total, not Merit)

## Context

`leave_praxis` (`backend/services/praxis.py`) removes a member and calls
`on_member_leave`, which guards on `remaining and …`
(`backend/services/collab_consensus.py`). If the *last* member leaves,
`remaining` is empty and nothing happens: a praxis survives with zero
members, editable by nobody (`_require_member` fails for everyone) and
deletable only by its original creator.

`leave_praxis` has **no status guard** — a member may leave an `in_progress`,
`pending`, or `submitted` collab.

A one-member "collab" is not a collaboration. It also still scores as one:
`collab_own_modifier` / `collab_other_modifier` are a live pair of
`EraConfig` knobs distinct from the solo `own_task_modifier` /
`other_task_modifier`, and `era_1` already ships one faction at
`collab_own_modifier=1.1`.

## Decision

**When a collab drops to exactly one member, it converts to a solo praxis
owned by the survivor — at any status.**

- The conversion reuses the existing `collab → solo` mutations in
  `change_praxis_type` (`backend/services/praxis.py`), documented as an
  intentional takeover: `created_by_id` is reassigned to the actor, remaining
  members and pending invites are dropped, content is kept.
- Reassigning `created_by_id` is what makes the survivor's exit work:
  `delete_praxis` is creator-only, so without it a survivor who did not start
  the praxis could not drop it.
- The empty-collab state becomes unreachable: the last member's exit is
  **drop**, not leave.
- **This applies to `submitted` praxes too**, deliberately. If everyone
  leaves you, you should not keep a collaboration bonus for work you now hold
  alone. This is narrower than `change_praxis_type`, which refuses
  non-editing statuses (422) — that guard protects a *voluntary* takeover;
  this conversion is a consequence, not a choice.

## Consequences

- A published collab can change scoring model after the fact, losing its
  collab modifier and gaining the solo one. Accepted: that is the point of
  the rule.
- ADR-0047's display follows automatically — a solo praxis shows the full
  `(base + meta) × faction_mult + votes` stamp rather than collapsing to
  Merit.
- Stats for the converted praxis must be recalculated when the conversion
  happens at `submitted`.

## Alternatives rejected

- **Convert only while editing.** Consistent with `change_praxis_type`'s
  existing status guard, but leaves a deserted published collab holding a
  bonus it no longer earns.
- **Block the last member from leaving.** Reintroduces a special case for a
  state nobody wants to be in.
- **Leave the orphan.** Accumulates rows that hold a task signup and can
  never be touched.

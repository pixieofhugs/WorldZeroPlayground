# ADR-0029 — `faction_permits` is the single faction-rules seam

**Status:** Accepted
**Date:** 2026-07-03
**Relates to:** #171 (this seam), #292 (generalizes the same "bundled sub-rule" smell to level/vote/flag/sign-up axes)

## Context

The only faction-gating rule the game has today is: a **metatask** requires the
character's faction to match `task.metatask_faction_slug` (with /Albescent able
to act on any faction's metatask). Standard tasks are faction-open;
`primary_faction_slug` is pure categorisation.

That one rule was implemented **twice**, inconsistently:

- `is_task_eligible_for_character` (the UI-affordance flag) checked
  `character.faction_slug == task.metatask_faction_slug` with **no** Albescent
  carve-out — so the flag said Albescent was ineligible for other factions'
  metatasks even though apply-time let them through.
- `_check_metatask_eligibility` (apply-time) had the Albescent carve-out.

We anticipate real faction rules later (faction-locked tasks, faction-specific
gates on sign-up/voting/vision). We do not want them scattered. We want one
named home every decision routes through to ask *"is there a faction rule that
changes this?"* — so a new rule is a one-function edit.

## Decision

Introduce **one** predicate as the designated home for all per-character
faction gating:

```
services.faction_service.faction_permits(character, task, era) -> bool
```

- Standard task → `True` (faction-open).
- Metatask → `True` for /Albescent (charter: any faction's metatask), else
  `character.faction_slug == task.metatask_faction_slug` (a metatask with no
  faction denies everyone but Albescent).

Both former call sites now consult it, which **reconciles** the divergence: the
UI flag `is_task_eligible_for_character` now also honours the Albescent
carve-out, matching apply-time reality. Apply-time keeps its Albescent
short-circuit (Albescent also bypasses the *level* gate — a separate axis), so
`faction_permits` there is only reached by non-Albescent and reduces to the
slug match — no behaviour change at apply time.

**Axes deliberately left out of the predicate:**

- **Level gates** and the **task-bank cap** are separate axes and stay put.
  #292 tracks giving the level axis its own named home the same way.
- **Listing visibility** (hidden/deprecated factions excluded from task lists)
  is a faction-*status* filter, not a per-`(character, task)` permit, so it
  cannot share `faction_permits`' signature. It moves next to the seam as
  `faction_service.hidden_faction_slugs(session)` so faction-rule knowledge
  still has one module home.

**Axis of variation not yet baked in:** the predicate takes `(character, task,
era)`. If a future rule must vary by *action* (sign-up vs. vote vs. flag vs.
vision), add an `action` parameter then — not before a real rule needs it, and
not a second parallel predicate.

## Consequences

- One place to add the next faction rule; all callers inherit it.
- One behaviour correction: the Albescent UI-eligibility flag for cross-faction
  metatasks flips `False → True`, consistent with what apply-time already did.
- The same "a meaningful sub-rule buried inside a broader predicate that ANDs
  unrelated axes together" smell recurs for level/vote/flag/sign-up. Extracting
  those named homes is deferred to #292; this ADR only establishes the pattern
  and the faction seam.

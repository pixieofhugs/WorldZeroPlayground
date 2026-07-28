# ADR-0056 — Task cards (and task detail) collapse to one responsive component per faction

**Status:** Proposed — under evaluation, not settled law
**Date:** 2026-07-27 (amended 2026-07-27 to cover task detail)
**Relates to:** #1020 (epic), #1022, #1023; #1028 (epic), #1029
**Tension with:** ADR-0035 (distinct mobile screens; a responsive squeeze of one
component was rejected at the time)

## Context

Mobile task cards currently live on a separate `mobileTaskCard` manifest surface — a
dedicated dispatcher (`mobileArchetypes/mobileTaskCard.tsx`) and 9 bespoke mobile files
(`DefaultMobileTaskCard` + 8 factions), distinct from the desktop `taskCard` surface's 9
files. ADR-0035 established that split deliberately.

The v2 task-card designs are authored as a single responsive component per faction
(`theme`/`platform` props switching internally), which reopens the question. The
owner's framing: "won't know if one experience is good across both until I test" — this
is explicitly an experiment to evaluate, not a considered reversal of ADR-0035.

## Decision

Rewire the mobile task-browse list (`DefaultTasks.tsx`) onto the shared `<TaskCard>`
component (using `useFormFactor()` internally for the desktop/mobile size set and each
design's conditional ornament), **as a reversible experiment**.

- The `mobileTaskCard` surface, its dispatcher, `DefaultMobileTaskCard`, and all 9
  mobile card files **stay in place but dormant** — not deleted. Reverting is flipping
  the one `DefaultTasks.tsx` call site back to the old dispatcher.
- Deletion of the dormant mobile surface is a separate, deferred cleanup, gated on the
  owner's hands-on verdict after living with the unified cards — not part of this change.
- This ADR does not overturn ADR-0035's reasoning; it authorizes one concrete trial of
  the alternative ADR-0035 rejected, kept cheap to back out of.

## Consequences

- Until the owner accepts or rejects this experiment, the repo carries two parallel
  task-card implementations per faction (18 files: 9 desktop + 9 dormant mobile) —
  expected and intentional during the evaluation window, not drift to clean up
  prematurely.
- If accepted: a follow-up (not yet filed) retires the dormant `mobileTaskCard` surface
  and its 9 files.
- If rejected: `DefaultTasks.tsx`'s call site flips back to `mobileTaskCard`'s
  dispatcher, and the unified component's mobile-sizing branch goes unused on mobile
  going forward.
- Status stays **Proposed** until that verdict — a marker for future readers that the
  mobile-unification half of task-cards-v2 is provisional, unlike ADR-0055's
  multiplier-display decision, which is settled.

## Amendment (2026-07-27) — task detail collapses the same way

The v2 **task-detail** designs (#1028, project `0711d3a7-0074-4a60-8907-270f44168261`)
are authored the same way: one responsive component per faction with a `platform` prop.
Task detail joins this experiment rather than getting its own ADR — same posture, same
one-line revert, and if the owner rejects the unified cards, both surfaces flip back
together.

- The mobile task-detail path is `TaskDetail.tsx`'s `formFactor === "mobile"` branch
  (which dispatches through the `mobileTaskDetail` surface) exactly as the card path is
  `DefaultTasks.tsx`'s call site. Rewire that branch to the shared desktop archetype and
  the revert is putting the branch back.
- `pages/taskDetail/mobileArchetypes/*` and the `mobileTaskDetail` rows on every faction
  manifest **stay registered but dormant** — not deleted, for the same reason and on the
  same deferred-cleanup terms as the card surface.
- One verdict covers both. There is no separate ADR for the task-detail collapse; if the
  cards experiment is rejected, this branch is restored alongside `DefaultTasks.tsx`'s.

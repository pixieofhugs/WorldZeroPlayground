# ADR-0058 — Task detail collapses to one responsive component per faction

**Status:** Accepted
**Date:** 2026-07-28

**Relates to:** #1028 (epic), #1030, #1031–#1038, #1039
**Supersedes ADR-0035 for task detail** — ADR-0035 stands for every other
mobile surface; only the task-detail surface is unified here.
**Parallel to:** ADR-0056 (the same collapse, for task cards — also Accepted)

## Context

Task detail today has two implementations per faction: a desktop archetype under
`pages/taskDetail/archetypes/` and a separate mobile one under
`pages/taskDetail/mobileArchetypes/`, dispatched by a `formFactor === "mobile"` branch
in `pages/TaskDetail.tsx` through the `mobileTaskDetail` manifest surface. ADR-0035
established that split deliberately.

The v2 task-detail designs (#1028, project `0711d3a7-0074-4a60-8907-270f44168261`) are
each authored as **one** component with a `platform` prop switching sizes and dropping
ornament internally — the same shape as the v2 card designs. That reopens the same
question ADR-0056 asked for cards.

**Why this is a separate ADR rather than an amendment to ADR-0056.** The task-detail
collapse was originally specified (in #1029) as an amendment to ADR-0056, on the grounds
that one verdict should cover both surfaces. ADR-0056 was then **accepted** on 2026-07-28
with text that closes it to exactly that: the licence it grants "is scoped to task cards
and does not generalise", it names task detail among the surfaces that keep their distinct
mobile archetypes, and it requires that "unifying another surface needs its own experiment
and its own ADR". Amending an accepted, scoped ADR to cover a surface it explicitly
excludes would contradict it. So task detail gets its own record, and its own verdict.

That ADR-0056 was accepted on its merits is evidence *for* trying the same thing here —
after hands-on mobile QA the owner found the unified card was the better phone experience,
not merely an acceptable squeeze. It is not proof: a task card is a small tile, a task
detail is a full page with an action panel, a brief, a praxis gallery and a comment
thread. The page is where a responsive squeeze is most likely to show.

## Decision

Drop the `formFactor === "mobile"` branch in `pages/TaskDetail.tsx` and always dispatch
through the `taskDetail` manifest surface. Each archetype calls `useFormFactor()`
internally for its own size set and conditional ornament. One responsive component per
faction; no mobile twin.

This was originally adopted (2026-07-28, with #1030) as a **reversible experiment**, on the
same terms ADR-0056 used while it was Proposed:

- `pages/taskDetail/mobileArchetypes/*` and the `mobileTaskDetail` rows on every faction
  manifest **stay registered but dormant** — not deleted. They must keep compiling, so
  the i18n key sweep in #1039 has to treat them as live consumers.
- Reverting is restoring the one branch in `TaskDetail.tsx`. That is the whole revert.
- Until a verdict, the repo carries two parallel task-detail implementations per faction.
  That is expected during the evaluation window, not drift to clean up prematurely.

## Verdict (2026-07-28)

**Accepted.** After hands-on mobile QA of the eight merged skins the owner ruled:
*"yup. this works for mobile."* The unified responsive task detail stands.

This verdict is the task-detail one, taken on its own evidence. ADR-0056's acceptance
was evidence for trying the collapse here, never a substitute for testing it — and the
doubt in Context above was real, because a task detail is a full page with an action
panel, a brief, a praxis gallery and a comment thread rather than a tile. It squeezed
onto a phone anyway.

Two things the collapse carried that the mobile twins never had, and which the verdict
therefore ratifies: the shared anatomy of ADR-0057 (one section order, one set of neutral
strings, resolved by slug) reaches the phone by construction rather than by a second
author remembering to copy it; and a change to the task-detail contract is now one file
per faction, so the two implementations can no longer disagree about what a task detail
is.

**The dormant files survive this acceptance — deliberately, and unlike ADR-0056.** #1044
deleted the `mobileTaskCard` surface in the same breath as accepting ADR-0056 because
that cleanup was already scoped into its epic. Here the retirement is a separate change
with its own fallout (see below), so #1039 **files** it rather than performing it: the
eight `pages/taskDetail/mobileArchetypes/*TaskDetail.tsx`, the `mobileTaskDetail` manifest
field, its `SURFACE_KEYS` entry and the seven faction registrations all stay in the tree
until that issue lands.

## Consequences

- Task detail is one responsive component per faction. Adding or changing a faction's
  task detail is one file under `pages/taskDetail/archetypes/`, not two.
- ADR-0035 still governs every other mobile surface — praxis detail, edit-praxis, field
  desk, faction page and the rest keep their distinct mobile archetypes and their
  `mobile*` manifest surfaces. This licence is scoped to task detail and does not
  generalise, for the same reason ADR-0056's did not; unifying another surface needs its
  own experiment and its own ADR.
- The revert path is still in the tree but is no longer a revert path. Restoring
  `TaskDetail.tsx`'s `formFactor === "mobile"` branch would now be **drift, not a
  rollback**. The dormant files were pending deletion, not a live option; #1068 carried it out.
- **The dormant files are still live consumers of the i18n catalog.** #1039's sweep cut
  114 zero-reference keys from `tasks.json` and kept 226; **178 of those survivors are
  held alive by the dormant mobile archetypes alone.** Retiring the surface therefore
  orphans them in one stroke, and the retirement issue re-runs the same per-key script.
- **Retirement follow-up: #1068.** It is not a copy of #1044 — one piece of the dormant
  tree is genuinely shared. `pages/taskDetail/mobileArchetypes/shared.tsx` exports
  `MobileStickyBar`, imported by eight **live** mobile faction pages under
  `pages/factionDetail/mobileArchetypes/`, so it must be relocated rather than deleted
  with its neighbours.

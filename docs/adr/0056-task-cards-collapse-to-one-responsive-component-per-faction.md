# ADR-0056 — Task cards collapse to one responsive component per faction

**Status:** Accepted
**Date:** 2026-07-28

**Relates to:** #1020 (epic), #1022, #1023
**Supersedes ADR-0035 for task cards** — ADR-0035 stands for every other mobile
surface; only the task-card surface is unified here.

## Context

Mobile task cards used to live on a separate `mobileTaskCard` manifest surface — a
dedicated dispatcher (`mobileArchetypes/mobileTaskCard.tsx`) and 9 bespoke mobile files
(`DefaultMobileTaskCard` + 8 factions), distinct from the desktop `taskCard` surface's 9
files. ADR-0035 established that split deliberately: it held that a phone deserves its
own screen rather than a responsive squeeze of a desktop component, and it rejected
unification at the time.

The v2 task-card designs are authored as a single responsive component per faction
(`theme`/`platform` props switching internally), which reopened the question. The
owner's framing: "won't know if one experience is good across both until I test" — this
was explicitly an experiment to evaluate, not a considered reversal of ADR-0035.

## Decision

Rewire the mobile task-browse list (`DefaultTasks.tsx`) onto the shared `<TaskCard>`
component, using `useFormFactor()` internally for the desktop/mobile size set and each
design's conditional ornament. One responsive component per faction; no mobile twin.

This was originally adopted (2026-07-27) as a **reversible experiment**, with the
`mobileTaskCard` surface and its 9 files left in the tree, dormant, so that reverting
would be flipping the one `DefaultTasks.tsx` call site back to the old dispatcher.

## Verdict (2026-07-28)

**Accepted.** After hands-on mobile QA the owner ruled: the new cards are better on
mobile, and the old ones should go entirely. The unified responsive card wins on its
merits — it is not merely acceptable on a phone, it is the better phone experience — and
it carries capabilities the mobile-only cards never had (the inline signup CTA gated on
`can_submit_praxis`, the in-progress count, the multiplier badge of ADR-0055).

Because the experiment succeeded, the `mobileTaskCard` surface was retired: the
dispatcher, all 9 mobile card files, their shared helper, the surface's manifest field
and its `SURFACE_KEYS` entry, and every faction's `mobileTaskCard` registration are
deleted. There is no revert path left in the tree, which is the point — this is now
settled law, not a trial.

## Consequences

- Task cards are one responsive component per faction. Adding or changing a faction's
  task card is one file under `components/taskCard/`, not two.
- The `mobileTaskCard` surface no longer exists. A faction cannot register against it,
  and `SURFACE_KEYS` no longer advertises a surface nothing dispatches.
- ADR-0035's reasoning still governs every OTHER mobile surface — task *detail*, praxis
  detail, edit-praxis, field desk, faction page and the rest keep their distinct mobile
  archetypes and their `mobile*` manifest surfaces. The unification licence granted here
  is scoped to task cards and does not generalise; unifying another surface needs its
  own experiment and its own ADR.
- The evaluation window is closed. The repo no longer carries two parallel task-card
  implementations per faction; a second one reappearing is drift, not an experiment.
- ADR-0055's multiplier-display decision was always settled; both halves of
  task-cards-v2 are now settled law.

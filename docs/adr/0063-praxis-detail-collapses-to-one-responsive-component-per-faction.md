# ADR-0063 — Praxis detail collapses to one responsive component per faction

**Status:** Accepted
**Date:** 2026-07-28

**Relates to:** #1085 (epic), #1125 (this ADR's issue), #1088 (the collapse + the
Unaffiliated rebuild), #1089 (the retirement)
**Parallel to:** ADR-0056 (task cards), ADR-0058 (task detail) — the same
collapse, a third surface

## Context

Praxis detail split hard by form factor: seven desktop archetypes (six
per-faction plus Default) and eight mobile ones (six per-faction, Wow's
mobile-only skin, and Default's own mobile twin), dispatched through two
manifest surfaces (`praxisDetail`, `mobilePraxisDetail`) by a
`formFactor === 'mobile'` branch in `PraxisDetail.tsx`.

The repo had already made this call twice, in the same week:

- **ADR-0056** — task cards collapse to one responsive component per faction.
- **ADR-0058** — task detail does the same: *"Drop the `formFactor === 'mobile'`
  branch… Each archetype calls `useFormFactor()` internally for its own size
  set and conditional ornament. One responsive component per faction; no
  mobile twin."*

The praxis-detail v2 designs made the cost concrete: eight faction designs
were committed (epic #1085, project `bebdf7c7-6a54-42ea-b3b4-6d908a506f84`).
Keeping the split would have meant sixteen archetypes maintained against
eight designs; collapsing meant eight and eight.

The designs also settled the shape question the split was protecting. Every
one of them is the same page at two widths — a three-region grid on desktop
that stacks to one column on mobile, with score and duel moving above the
proof. None is structurally a different page on a phone.

## Decision

**One responsive praxis-detail component per faction. No mobile twin.**

- `PraxisDetail.tsx` no longer branches on `formFactor === 'mobile'`; it
  always dispatches through the `praxisDetail` manifest surface (#1088).
- Each archetype calls `useFormFactor()` internally for its own size set and
  conditional ornament — the same shape ADR-0056 and ADR-0058 established for
  task cards and task detail.
- **Unlike those two, the collapse was not adopted as a reversible
  experiment.** #1089 retired `pages/praxisDetail/mobileArchetypes/*` and the
  `mobilePraxisDetail` manifest surface outright — the field, its
  `SURFACE_KEYS` entry, and every faction registration — in the same wave as
  the collapse itself, alongside the fourteen praxis-detail archetypes (six
  desktop, eight mobile) and their `detail.<faction>.*` copy blocks. There is
  no dormant revert path left in the tree; git history is the only way back.
- The difference from ADR-0056/0058's terms is deliberate, not an oversight.
  Those two surfaces were unproven collapses evaluated against designs that
  did not yet exist for every faction, so their mobile twins stayed
  registered-but-dormant — a verdict against the collapse had somewhere to
  fall back to. Here, all eight praxis-detail designs were already committed
  before a single faction archetype was rebuilt: the mobile skins were
  **superseded by a committed design**, not held open pending one. Keeping
  fourteen files compiling — and countable as live i18n consumers, the trap
  ADR-0058 documented for task detail's own dormant tree — would have bought
  a revert path against a question the designs had already settled.

## Consequences

- Future faction praxis-detail work is 7 designs and 7 components, not 14 and
  14.
- The duel rail's own split (`*DuelRail` / `*MobileDuelRail`) is retired
  separately, in the same epic — see ADR-0064.
- `praxisDetail` remains a registered manifest surface with, as of this
  record, **zero faction registrations** — every slug falls through to
  `DefaultPraxisDetail`, and the seven other factions re-register it one at a
  time as their own designs land (#1117–#1123, #1140). That is override-only
  working as documented (#782), not a gap — the same partial-registration
  doctrine ADR-0046/0048 rely on. `mobilePraxisDetail`, by contrast, is
  retired outright: there is no partial-registration story for a surface that
  no longer exists, and no future issue should try to re-register it.

## Alternative rejected

**Keep the split.** The mobile archetypes were the thinner files (157–266
lines against the desktop archetypes' 268–466), so the split was already
buying less than it cost, and none of the eight designs draws a phone page
that is structurally different from its desktop counterpart — every one is
the same three-region layout collapsing to a single stacked column.

**Hold the mobile archetypes dormant, on ADR-0056/0058's terms.** Considered
and rejected for the same reason the collapse itself was not run as an
experiment: the committed designs left nothing open to revert to. Keeping
fourteen files compiling to protect a decision that eight finished designs
had already made would have been pure carrying cost, paid by the i18n sweep
and the style ratchet for no live option on the other end.

# ADR-0059 — Submitting a collab or duel part holds the composer

**Status:** Amended by ADR-0062
**Date:** 2026-07-28

**Relates to:** #1071 (epic), #1073 (ADR-0060, the sibling behaviour change),
#591 (the `CollabSuccess` hold this generalises), #646 (moved author controls
off the public roster and into the composer footer), #590 (`pullBack`)

## Context

`publish()` (`frontend/src/pages/editPraxis/useEditPraxis.ts`) ends with
`navigate(`/praxes/${idParam}`)` for every case except one: the cast that
closes a multi-member collab's consensus gate holds the composer for the
`CollabSuccess` beat (#591), gated by `deriveCollabGate`.

So for every *other* multi-party cast — a collab part filed while co-authors
are still weaving, a duel side sealed before the rival answers — the player is
redirected to the public read view. That view can show roster state (it
mounts `CollabRoster` via `CollabRosterBlock` in
`frontend/src/pages/praxisDetail/shared.tsx`), but it offers no authoring
exit: no way to re-open your own part, no drop/leave scoped to you.

## Decision

**Submitting a part of a multi-party praxis holds the composer.** It
re-renders as a waiting surface rather than navigating away.

- Applies to **collab** and **duel**. **Solo keeps the existing redirect** —
  there is nobody to wait for.
- The praxis detail page remains the public read view, unchanged. It keeps
  its roster and its duel rails.
  *(Superseded in part, 2026-07-28: ADR-0062 made detail published-only, so
  the roster clause no longer holds. `CollabRosterBlock` was gated to
  `in_progress` / `pending` — the two statuses that now redirect here — and
  #1089 deleted it. This ADR's argument is unaffected: the waiting surface is
  the roster's only home, which is what it argued for. The duel rails stand
  until #1090.)*
- The waiting surface offers exactly one exit appropriate to the viewer, and
  an authoring re-entry.
- Re-entry is **not** a raw PUT. On a collab, any praxis PUT hard-resets
  every member's `has_submitted` (ADR-0012 — "an edit means we're not done"),
  so "edit my write-up" routes through `pullBack()`, which re-opens only the
  caller's membership (#590).

## Consequences

- `useEditPraxis` grows a phase; `EditPraxis.tsx` dispatches to the waiting
  surface instead of the archetype.
- Two surfaces render roster state. That is already true and already solved
  — both mount the same `CollabRoster`.
- The `CollabSuccess` hold (#591) becomes the special case of a general rule
  rather than a one-off.

## Alternative rejected

**The detail page owns the moment.** Cheaper — the roster and the 12 duel
rails are already there. Rejected because it puts author-only controls on a
public read page, which is precisely what #646 moved off the roster and back
into the composer footer, and because "edit mine" would become a bounce
between two routes.

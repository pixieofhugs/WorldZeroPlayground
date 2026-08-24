# ADR-0048 — Albescent unfreezes one surface at a time, as designs land

**Status:** Accepted, amended
**Date:** 2026-07-19
**Amends:** **ADR-0046** (Albescent is frozen: new surfaces fall through to NA)
**Amended by:** **ADR-0083** (Albescent is one ornament vocabulary over na) —
the premise below stands unchanged, but the *per-surface mode* is closed: there
is now one design, and a surface adopts it rather than commissioning its own.
**Relates to:** ADR-0027 (Albescent is a secret society), ADR-0039 (the NA/default
identity is the rainbow), ADR-0047 (the praxis-card score stamp).

## Context

ADR-0046 froze Albescent — every dispatched surface falls through to the NA/Default
skin — because "Albescent's visual direction is under reconsideration," and skins
carry a short half-life when a look is about to change.

That freeze was a *hold pending a direction*, not a permanent identity. The Faction
Praxis Cards redesign now supplies a direction for one surface: an Albescent praxis
card that is **near-identical to Unaffiliated (NA), with a slow rainbow drift over the
card** — a quiet shimmer. Because NA is now the rainbow "spectrum" card (ADR-0039,
and the redesign's new Default), Albescent already inherits the spectrum look by
fallthrough; the drift is the only bespoke delta.

The drift is on-theme for ADR-0027: a card that reads as plain unaffiliated at a
glance but shimmers for those who know is **hiding in plain sight**. Albescent's
design language, going forward, is "**an NA-lookalike with deliberate secret tells**"
— the drift is the first such tell.

## Decision

Albescent unfreezes **per surface, as a design for that surface lands** — it is no
longer frozen wholesale.

- **Praxis card (this redesign):** build Albescent's bespoke variant = the NA/Default
  spectrum card **plus a slow rainbow drift**. This is the first unfreeze.
- **Every other Albescent surface stays frozen** (falls through to NA per ADR-0046)
  until its own design lands. ADR-0046's fallthrough remains the default; this ADR
  just carves out surfaces one at a time.

## Consequences

- ADR-0046's mechanism (partial registry, designed fallthrough) is intact; "frozen"
  now means "frozen **until designed**," released surface-by-surface rather than all
  at once.
- Albescent gains exactly one registry row (the praxis-card manifest surface). A
  builder must render it as **NA + drift**, not a from-scratch skin — the secret-society
  tell depends on the NA resemblance.
- Future Albescent surfaces follow this ADR: land a design, unfreeze that one surface,
  keep the rest on NA.

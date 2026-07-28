# ADR-0061 — Praxis detail is one shared page; every faction dresses it

**Status:** Accepted
**Date:** 2026-07-28
**Relates to:** #1085 (epic), #1087 (ADR-0062, the sibling behaviour change)
**Extends:** ADR-0057 (task detail pages carry no faction voice) — same doctrine,
a second surface
**Tension with:** ADR-0016 (per-faction surfaces share one data contract;
archetypes own only presentation) — gains a second per-surface exception

## Context

Praxis detail today ships bespoke skins for the `CORE_SIX` factions (coven,
snide, ephemerists, singularity, everymen, ua) plus a mobile-only bespoke skin
for wow; together with the shared Default (na / Unaffiliated) skin that is
seven factions already carrying their own praxis-detail vocabulary.
Albescent is frozen as a wrapper over Default (ADR-0046/0048), not a skin of
its own, so it does not add an eighth.

Each of those seven invented its own words for identical slots. In
`frontend/src/locales/en/praxis.json` the body-content heading alone is six
near-synonym keys naming one slot — `theAccount` (default, ephemerists) /
`theWork` (everymen) / `whatIDid` (coven) / `theConfession` (snide) /
`processLog` (singularity) / `theProcess` (ua) — and the media/evidence
heading repeats the pattern: `evidence` (ephemerists, snide) / `proofOfWork`
(everymen) / `keepsakes` (coven) / `artifacts` (singularity) / `thePlate`
(ua). Twelve near-synonym keys for two slots that read identically on every
skin.

The Unaffiliated redesign (project `bebdf7c7-6a54-42ea-b3b4-6d908a506f84`) is
the first of these seven to rebuild; the other six are committed to its
layout and API contract (epic #1085).

## Decision

**Praxis detail is one shared page. A faction skin brings dress and no
copy.**

- A single neutral `detail.*` block; every archetype reads the same keys.
  Where a design's word differs from the domain noun in `CONTEXT.md`, the
  domain noun wins.
- The layout is the contract: main column + aside + comments region,
  collapsing to one stacked column on mobile.
- **The neutral rule covers the page's own slots and stops at the speaker's
  voice.** Comment rows dispatch on `comment.author.faction_slug`, not the
  page's — a Snide player's comment reads Snide on a Coven praxis.
  `comments.<faction>.*` and the seven `*Comment` skins are **out of scope**
  and must not be swept later by inference from this ADR.

## Consequences

- A praxis page reads identically across all nine factions and differs only
  in dress.
- The per-faction `detail.<faction>.*` blocks are deleted as each archetype
  goes.
- A future faction skin cannot introduce copy on this surface, only dress.
- Extends ADR-0057's doctrine to a second surface. ADR-0016's
  presentation/voice boundary now carries two per-surface exceptions.

## Alternative rejected

**Voice returns with each design.** Argued seriously at grill: a praxis is
somebody's account of a thing they did, and "The Confession" over a Snide
write-up does more work than a task page's labels ever did. Rejected because
the seven designs are already locked to one layout and one contract —
leaving copy free re-grows the catalog being deleted, and the nine
task-detail designs proved that per-design "neutral" wording fragments even
when nobody intends voice.

# ADR-0057 — Task detail pages carry no faction voice

**Status:** Accepted
**Date:** 2026-07-27

**Relates to:** #1028 (epic: faction task details v2), #1029
**Tension with:** ADR-0016 (per-faction surfaces share one data contract; archetypes own
only presentation) — which drew the line at *data* and left copy to the archetype. This
ADR moves the copy of one surface across that line too.

## Context

The 7 shipped task-detail archetypes each invented their own vocabulary for the same
slots. In `frontend/src/locales/en/tasks.json` today:

- `snide.caseFile` — "S.N.I.D.E. Case File · job no. {{number}}"
- `snide.accomplices` — "accomplices on file"
- `coven.spellsHeading` — "spells cast so far · {{count}}"
- `ephemerists.credenceHeading` — "The Credence"
- `ua.salonWallHeading` — "Sealed work"
- `singularity.consensusHeading` — "// consensus_signal"
- `everymen.verdictHeading` — "The Hall's Verdict"

Eight near-synonym sets for a page whose slots are identical everywhere.

The v2 designs (project `0711d3a7-0074-4a60-8907-270f44168261`) deliberately do the
opposite. Every one of the 9 files carries the same header comment, and Snide's says it
outright:

> `// Dress is faction-specific, copy is NOT (task pages carry no faction-specific language).`

But the designs then disagree with *each other* about what the neutral wording is —
"Task Description" vs "The task", "19 completed praxis" vs "21 submissions",
"Discussion" vs "Comments". Building all nine verbatim would re-fragment the copy into
nine near-synonym sets: the same catalog size, the same drift, minus the character that
at least justified it.

## Decision

**One shared neutral copy set on task detail.** A single `detail.*` block in
`tasks.json`; every archetype reads the same keys.

- Where a design's word differs from the domain noun in `CONTEXT.md`, **the domain noun
  wins** — praxis, score, sign up. Dress is the design's authority; copy is not.
- Faction voice remains law on every *other* surface. Praxis cards, faction pages, duel
  skins, collab composers and comment voices are untouched by this ADR.
- A faction skin on this surface may introduce any amount of dress — frame, ornament,
  type, motion — and no copy.

## Consequences

- A task page reads identically across all 9 factions and differs only in dress.
- The ~8 faction-specific task-detail vocabularies above get deleted as each skin lands.
- A future faction skin for task detail cannot introduce copy, only dress; the neutral
  key set is the contract it inherits.
- ADR-0016's boundary now has a per-surface exception: on task detail, archetypes own
  *presentation only*, not presentation-plus-voice. Other surfaces keep the old line.

## Alternative rejected

**Keep each design's own neutral-ish wording per faction.** Every archetype would still
carry its own keys, just blander ones — the same fragmentation and the same catalog
size, with none of the flavour that made the fragmentation worth paying for.

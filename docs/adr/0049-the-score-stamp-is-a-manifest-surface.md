# ADR-0049 — The score stamp is a manifest surface, not a themed component

**Status:** Accepted
**Date:** 2026-07-20

**Narrows:** **ADR-0047** (its row-selection rules survive intact; only the
"one presentation" implication is withdrawn)
**Relates to:** ADR-0039 (`Default*` fall-through), ADR-0050 (WOW/Coven identity),
`docs/agents/design-fidelity.md`

## Context

The Faction Praxis Cards design specifies **two** objects in a card's right
column, not one:

- a **score box** — a bordered pill holding `base 12`, a coloured `×0.80` chip,
  and an italic `+ 4 from votes`; broadly the same *shape* on every faction; and
- a **total mark** — the faction's own signature device holding the total over a
  `POINTS` label. UA's is the **ensō**. Everymen's is a 102px rubber-stamp
  roundel with `★ VERIFIED ★ ON THE RECORD` arced on a `textPath` under
  `mix-blend-mode: multiply`. Ephemerists' is a **rubric**. Snide's is an Anton
  numeral with `text-shadow: 2px 2px 0` in hot zine pink. Unaffiliated's is the
  total **background-clipped to the rainbow**.

Issue #821 collapsed both into one phrase — "faction-styled score stamp" — and
the implementation followed: a single `PraxisScoreStamp` called unconditionally
by all nine archetypes, themed by four colour props, in a shape borrowed from
Singularity (the one faction whose designed score box happened to be
row-shaped).

The result was the largest single source of drift in the redesign. The ensō, the
roundel, the rubric, the pink-shadowed total and the rainbow-clipped total were
all simply absent — not approximated, absent. `enso-detailed.svg` and
`lotus.svg` shipped in the design bundle and neither string appeared anywhere in
`frontend/`.

The house rule already covering this case is in `CLAUDE.md`: *"Each faction has
its own card archetype; don't unify."* The stamp was the exception, and the
exception was wrong.

## Decision

**`scoreStamp` becomes a registered faction surface**, dispatched by slug through
`FACTION_MANIFESTS` exactly like `praxisCard`, `vote` and the other 27.

The split between shared and bespoke is drawn at **logic vs. presentation**:

- **Shared, unchanged:** `scoreBreakdown(praxis)` — the pure function that
  decides *which rows exist* under ADR-0047 (mult hidden at `×1.0` or collab,
  meta hidden at `≤ 0`, base hidden when it would restate the total — added
  2026-07-29 by #1131 — votes always, total to one decimal). One function, one
  test, nine consumers. This is the invariant and it stays exactly where it is.
  The **total mark never drops out**: it is the faction's device, so it is the
  one thing a row rule may make redundant rather than remove.
- **Bespoke, per faction:** everything about *what those rows look like* — the
  numerals' face and size, the chip, the rule, the rotation, the blend mode, and
  above all the **total mark**, which is frequently not a box at all.

`Default*` fall-through applies as everywhere else (ADR-0039): a slug with no
registered `scoreStamp` renders the neutral default. `na`/unaffiliated has no
manifest and keeps that behaviour.

**Faction marks live in `components/factionMarks/`, and the requirement is that a
mark is tintable from a token** — never that its colour is baked in. An `<img
src="…svg">` cannot read CSS custom properties, so the naive "just ship the SVG"
route would reintroduce hardcoded hex and break dark mode. Two implementations
satisfy the requirement; pick per mark:

- **Inline React SVG** — for small and/or multi-colour marks. Every `fill` and
  `stroke` reads a var. `lotus.svg` (9 KB, radial-gradient fills) goes here.
- **`public/` asset + CSS `mask-image`**, tinted by `background-color:
  var(--token)` — for large single-colour marks. `enso-detailed.svg` is **705 KB**
  across 284 paths with exactly two fill values; inlining it would put three
  quarters of a megabyte into the main JS bundle. As a mask it stays out of the
  bundle, caches separately, and is still coloured entirely by a token.

Either way `factionMarks/` is the single module that owns marks, so consumers have
one import site and do not care which mechanism is underneath.

## Alternatives rejected

- **Slot composition** — one `PraxisScoreStamp` taking `renderTotal` /
  `renderChip` / `renderRule` slots. Rejected: the shell would have to be
  permissive enough to host both a four-row pill and a 102px arced-text roundel
  with a blend mode, at which point it constrains nothing and only adds a hop.
- **A wider theme descriptor** — one component, a per-faction record of font,
  rotation, chip shape, rule style, shadow. Rejected for the same reason, plus it
  encodes "the ways a stamp may differ" as a closed set, and the design's answer
  is that they differ *completely*.

## Consequences

- Nine small presentation files instead of one shared one, with no deduplication
  between them. Accepted deliberately; it is the same trade the faction card
  archetypes already make.
- ADR-0047 is **not** superseded. Its conditional-row rules are the shared half
  of this decision and one `scoreBreakdown` test keeps all nine honest.
- `PraxisScoreStrip` (the invented mobile `BASE ∣ MULT ∣ VOTES ∣ TOT` strip) is
  no longer the mobile presentation by default; a faction's stamp is
  size-agnostic and mobile reuses it, per the design's mobile guidance.
- Adding a faction still costs one manifest line. Adding a *mark* costs one file
  in `factionMarks/`.

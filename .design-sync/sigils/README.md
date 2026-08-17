# Sigil Studies v2 — vendored design

Source: `claude.ai/design/p/115c0ba0-e153-42c4-b8d7-84f112047736`, file
`Sigil Studies v2.dc.html`. Vendored per `docs/agents/design-fidelity.md`
("Vendor, build, delete") because **subagents cannot reach `claude.ai` design
URLs from a worktree**, and prose cannot carry geometry.

**The last PR of this epic deletes this directory.**

## What the design says

Its own headline: **"Six marks redrawn, three left alone."** Factions run in the
order of the unaffiliated spectrum. Each mark is shown at **84, 34 and 15px** —
and the design says outright that *the last is the size that decides it*.

### Redrawn (6)

| faction | the design's own words |
|---|---|
| Everymen | two cogs in mesh |
| Warriors of Whimsy | the googly crown, in plum |
| S.N.I.D.E. | the A, brushed and broken out |
| Ephemerists | the kite, brushed and gilt |
| Cozy Coven | the witch hat |
| Albescent | the labyrinth · no palette of its own |

### Kept as they are (3) — DO NOT TOUCH

| faction | mark |
|---|---|
| University of Asthmatics | the painted ensō |
| Singularity | the prompt caret |
| Unaffiliated (`na` / `default`) | the whole spectrum |

## How to read the file

Each faction row has **two bands**, each showing all three sizes (84, 34, 15):

1. **Before** — three `<x-import component-from-global-scope="WZ.FactionSigil" slug="…">` tags.
   That renders **the shipped app's own component**, pulled live from the kit
   bundle. It is the current state, for comparison. **There is nothing to port
   from this band.**
2. **After** — the new mark. **This is the thing to port.**

### The after band is NOT one shape — it is two, and this matters

| faction | after-band form | `<path>` per size | viewBox |
|---|---|---|---|
| Everymen | inline `<svg>` | 1 | `0 0 100 100` |
| Warriors of Whimsy | inline `<svg>` | 1 | `0 0 100 100` |
| Cozy Coven | inline `<svg>` | 1 | `0 0 100 100` |
| **S.N.I.D.E.** | inline `<svg>` | **4**, inside `<g transform="rotate(-22 50 50)">` | **`-8 -8 116 116`** |
| **Ephemerists** | inline `<svg>` | **6** | `0 0 100 100` |
| **Albescent** | `<div>` + `clip-path: path(…)` | — (no SVG at all) | — |

Two traps in that table:

- **S.N.I.D.E. and Ephemerists are multi-path marks.** Porting one path per mark
  drops most of the drawing, and it still typechecks and still renders
  *something*.
- **S.N.I.D.E.'s viewBox is `-8 -8 116 116`**, not `0 0 100 100`. The mark bleeds
  outside the box on purpose. Do not normalise it.
- **Albescent has no `<svg>` at all.** A `grep "<svg"` finds 15 tags across the
  five SVG factions and misses Albescent entirely, which reads as "that faction
  is not in the design". It is — as a clip-path.

Every after-band `<svg>` carries `fill="currentColor"`, which is exactly the
`{ slug, size, color }` contract the existing sigils use (ADR-0040, #659).

### The 84px variant is the canonical mark

All three sizes carry the same geometry; only `width`/`height` differ. The design
project's `scraps/marks.json` holds the same paths in machine-readable form, and
the 84px variants in this file were verified byte-identical to it at vendoring
time. So read the 84px one and scale by attribute — do not diff the three.

### WOW's "plum" already has tokens

`--faction-wow-plum-surface`, `--faction-wow-plum-edge` and `--faction-wow-on-plum`
are all declared in `index.css` on `origin/main`. Nothing to mint; read them
before choosing a paint.

## Roster check (ADR-0050 — annotate, don't assume)

Verified against `origin/main` at vendoring time:

- `frontend/src/components/sigil/` holds `Coven`, `Default`, `Ephemerists`,
  `Everymen`, `Singularity`, `Snide`, `Ua`, `Wow`.
- **There is no `AlbescentSigil.tsx`.** #1891 / PR #1926 deleted it earlier the
  same day, by owner ruling, so every `albescent` mount resolves to
  `DefaultSigil`. The design's Albescent labyrinth therefore **reverses a ruling
  that shipped hours before it** — that is an owner decision and is NOT part of
  the build until it is ruled on.
- `factionSigilRing()` in `FactionSigil.tsx` still returns a blue hoop for
  `albescent` on `CredentialCard`. #1926 flagged it as unresolved; it interacts
  with the Albescent question above.
- `MobilePlayers.tsx` / `Sidebar.tsx` carry a `NEUTRAL_SIGIL_SLUGS` set (#1892)
  that names `albescent` so it draws `DefaultSigil` on the position-sampled
  rainbow. Same interaction.

## Fidelity rule

**The design value is the default. Any deviation names itself** — in a code
comment saying which house rule overrode which design value, and in the PR body's
deviation list. House rules (tokens, the content-text floor, touch targets,
contrast) win only where they genuinely conflict, never silently.

Note the standing carve-out that applies here: **ornament text and ornament
geometry are exempt from the content-text floor** (#623/#627). A sigil is a mark.

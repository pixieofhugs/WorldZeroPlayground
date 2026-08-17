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

## How to read the file — this is the part that will trip you up

Each faction row has **two bands**:

1. **Before** — an `<x-import component-from-global-scope="WZ.FactionSigil" slug="…">`.
   That renders **the shipped app's own component**, not a drawing. It is the
   current state, pulled live from the kit bundle. There is nothing to port here.
2. **After** — the new mark, drawn as a `<div>` with `clip-path: path('…')` and a
   paint (`background`). **This is the thing to port.**

So a `grep` for `<svg` finds only 15 tags and misses Albescent entirely — its new
mark is a clip-path, not an SVG. Do not conclude a faction is missing because it
has no `<svg>`.

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

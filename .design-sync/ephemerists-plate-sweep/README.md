# Ephemerists — the Valley plate's full vocabulary (for the codex sweep)

Vendored for the Ephemerists coherence sweep. **Delete this folder in that
issue's last PR** (`docs/agents/design-fidelity.md`).

The sweep dresses surfaces that have **no design of their own** — avatar, faction
hero and body, duel seal confirms, profile body, field desk, faction cards. This
file is where their vocabulary comes from: it is the only Valley-plate document
that draws lists, avatars, panels, rules and buttons at page scale.

## Source

claude.ai design project `0711d3a7-0074-4a60-8907-270f44168261`, file
`ephemerists-task-detail.jsx` — verbatim, production-intent React
(`React.createElement`, no JSX transform, `module.exports` at the foot).

## What is NOT here, and why

The sibling `ephemerists-deco-egypt-task-card.jsx` is **already ported**:
`components/cards/ephemeristsPlate.tsx` carries its token names, its `GLYPHS`
library (byte-for-byte) and its `WingedDisc` / `Cornice` / `FlutedRule` /
`GlyphRegister` / `Sign` / `Octagon` marks, and `components/cards/EphemeristsTaskCard.tsx`
is the card itself. Read those rather than re-vendoring the card.

## What this file has that the repo does not

- **Roster rows** — octagon-clipped initial avatars, tally strokes for level,
  Ally/Rival chips, the `+N more` foot. The shipped `EphemeristsTaskDetail.tsx`
  deliberately dropped the roster (all nine task-detail designs did), so this is
  the only drawing of an Ephemerists **list of players** anywhere. The profile
  body, faction body and field desk all need one.
- **The gravity-well panel** — a lattice bent toward a mass behind body copy,
  masked to a corner. The plate's answer to "a block of prose on a panel".
- **The alchemical squared-circle medallion** — ring, ticks, inscribed square,
  triangle, inner disc. A second numeral holder beside the stepped octagon.
- **Comment rows, ledger rows, sort tabs, and the two CTA band treatments**
  (dark band with gold ink in light, brass band with dark ink in dark).

## The one rule for reading it

**The colours in `TOKENS` are raw hex. Do not copy them.** Every one is already
declared as `--faction-ephemerists-plate-*` in `index.css`, light and dark. Where
a token deliberately differs from the hex here, the **token wins** and the reason
is written at its declaration — `-brass` is a rule colour that measures 2.97:1,
so captions drawn in `brass` here take `-caption` in code. Same for any ink this
file sets on a gradient.

Geometry, ornament, rhythm and layout: take them from this file.

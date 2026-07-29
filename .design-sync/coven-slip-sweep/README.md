# Cozy Coven — the candlelit vocabulary (for the `coven.exe` sweep)

Vendored for the Cozy Coven coherence sweep. **Delete this folder in that
issue's last PR** (`docs/agents/design-fidelity.md`).

The sweep dresses surfaces that have **no design of their own** — avatar, faction
hero and body, duel seal confirms, metatask seal, praxis card and stamp, profile
body, field desk, faction cards. This file is where their vocabulary comes from.

## Source

claude.ai design project `0711d3a7-0074-4a60-8907-270f44168261`, file
`coven-task-detail.jsx` — verbatim, production-intent React
(`React.createElement`, no JSX transform, `module.exports` at the foot).

## What is NOT here, and why

`coven-task-card.jsx` is already ported — `components/cards/CovenTaskCard.tsx` is
the slip itself. Unlike the Ephemerists, Coven has **no shared kit module**: the
marks live inside `CovenTaskCard.tsx` and `pages/taskDetail/archetypes/CovenTaskDetail.tsx`.
That is exactly why this file is worth having open — it is the whole vocabulary
in one compact place instead of spread across two large components.

## What to lift

- **The braid** — a repeating thread rule built as an inline data-URI SVG
  (`threadUrl`), gold bead at the join. Heads every section. Shipped as
  `.cvn-braid`; the generator here shows how the strand is drawn.
- **The candle haze** — four blurred radial blooms, drifting, plus scattered
  gold sparks and the slow-turning pentagram wheel. `mixBlendMode: screen` in
  dark, normal in light. This is the page ground for any full-surface dress.
- **The ward** — points inside a glowing pentagram: aura gradient, flicker,
  inner disc gradient, five sparks at fixed anchors.
- **The sigil mark** at three sizes (30 header, 34 empty-media, 24 mobile bar) —
  the stand-in wherever a Coven surface needs a mark rather than a photo.
- **Avatars** — a 2px gradient ring around a card-coloured disc. **Two kin
  treatments:** pink→deep for Coven, lavender→violet for `guest`. The sweep's
  list surfaces need both.
- **Comment rows, submission cards, sort-tab pills, and the two button states**
  (pink gradient for act, gold gradient for done).

## Two things to know before you read it

1. **The colours in `TOKENS` are raw hex. Do not copy them.** They are declared
   as `--faction-coven-slip-*` and the ward family in `index.css`, light and
   dark. Three were **deliberately walked down for AA** and the walked-down
   value wins: `soft` #b8517f → #973660, `label` #b06a92 → #83466a, and the CTA
   band's stops (#ec4f92/#c9327a → #d13a80/#b02a69). The reasons are written at
   the declarations. Geometry and ornament from this file; colour from tokens.
2. **There is no roster here.** The file says so in its own header — task detail
   pages carry no in-progress roster, the header count is enough. So for the
   sweep's list surfaces (profile body, faction body, field desk) the pattern to
   reuse is the **submission card and the comment row**, not a roster row.

## Copy

The design's words are placeholder. Coven's own detail vocabulary was retired
wholesale by #1031 (ADR-0057) — the shipped surfaces read the shared neutral
`detail.*` keys. Take nothing but dress from this file.

# Handoff: World Zero — Level-up pop-up

## Overview
A **"Field Stamp"** level-up pop-up: a stamped field-journal certificate that
fires when a Character crosses a `level_thresholds` boundary. It announces the
new **rank** and the **abilities + curious senses** unlocked at that level. The
WZ signature — per-letter cycling rainbow underline on the rank, a wax-seal
`LVL/n` stamp, the six-segment rainbow rule.

Design half of **issue #244** ("Design: level-up messages").

## About the design file
`LevelUpPopup.jsx` is a **design reference** — a faithful, self-contained React
render of the intended look, not the finished feature. It reads `var(--…)`
tokens that already exist in `frontend/src/index.css` (all eight are present),
so it sits naturally alongside the existing inline-styled components
(`EverymenVote`, the feed modals). The build task wires it to the real level
data and the real level-up detection. See **Build notes** below and the build
issue for the full spec.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, layout. All values come
from WZ tokens already in the codebase.

## Props
| Prop | Type | Notes |
|---|---|---|
| `level` | number | The level just reached (drives the seal `LVL/n`). |
| `rank` | string | Rank title for that level (rainbow-underlined headline). |
| `abilities` | `{ kind, name, desc }[]` | `kind` is `"ability"` (rules-backed, ■) or `"sense"` (whimsy, ✦). |
| `onContinue` | () => void | Fired by Continue button **and** backdrop click. |
| `continueLabel` | string | Default `"Continue"`. |
| `sealRing` | `"rainbow" \| "ink"` | Default `"rainbow"`. |
| `dimBackdrop` | boolean | Default `true` (self-contained fixed overlay, z-index 1000). |

## Design tokens (all already in `frontend/src/index.css`)
- Rainbow: `--underline-1 … --underline-6` (amber, magenta, indigo, teal/cyan, green, red/orange).
- Ink/paper/text: `--color-text-primary`, `--color-bg-page`, `--color-text-secondary`, `--color-text-tertiary`, `--color-border-strong`.
- Type: `--font-display` (Lora italic), `--font-body` (Courier Prime). Both already loaded in `index.html` — no font loading needed.

## The data the popup shows does not exist yet
There are **no rank titles** and **no per-level ability/sense copy** in the
codebase today — levels are pure integers 0–8. The build authors this as era
config (`level_profiles` on `EraConfig`, values in `era_1.py`) and serves it
through the existing `/game-config` endpoint. The grounded `ability` entries
**must track the real capability gates** (`era_1.py`): duels at level **2**,
propose-task at **3**, etc. — not the illustrative example data at the bottom of
the JSX (which shows duels at 7 / faction-chapters at 12 and is *wrong* against
this codebase). `sense` entries are free whimsy.

## Build notes (carried from the design grilling)
- Convert to `.tsx`; type the props as above.
- **Strip the literal hex fallbacks** — `var(--underline-1)` not
  `var(--underline-1, #fbbf24)`. CLAUDE.md bans hardcoded hex; every token is
  confirmed present.
- Detection lives in a `<LevelUpWatcher/>` mounted once in `Layout`: compares
  server level to a per-character-id `localStorage` last-seen, **seeds silently
  on first observation**, **queues one popup per level crossed** on an increase
  (eager-commit the new last-seen), keyed by character id so roster switches
  don't fire.
- A11y: Escape advances/closes, autofocus Continue. No focus trap.
- **Out of scope:** stacking/ordering with the invitation-letter pop-ups (#243,
  not built yet) — coordinate when that lands; era-reset re-announcement.

## Assets
None. The wax seal and rainbow rule are pure CSS/inline; no image assets, no new
fonts.

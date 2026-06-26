# Handoff: World Zero — Activity Feed cards

## Overview
A single, **mixed** activity feed for World Zero. The defining idea: this is **not one feed per faction** — it is **one chronological stream** in which each faction posts a card rendered in *its own physical archetype*, with **factionless / system cards** woven in between. The card archetype IS the faction's identity, exactly like the existing `FactionTaskCard` and `FactionCommentBox`.

This bundle delivers the feed already converted to **React** so it drops into a React codebase with minimal friction.

## About the Design Files
These files are a **design reference** — a faithful React conversion of an HTML prototype showing the intended look and behavior, not a finished feature. The task is to **wire these card components into your codebase's real activity/event model and feed infrastructure**, using your established data-fetching, routing, and list-virtualization patterns. The components themselves are written to match World Zero's existing component conventions (per-faction archetype switch, inline styles reading `var(--…)` tokens), so they should sit naturally alongside `FactionTaskCard` / `FactionCommentBox`.

If your codebase already has the World Zero token CSS wired (it mirrors `frontend/src/index.css`), you can delete the bundled `tokens/` copy and rely on yours.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and layout. Recreate pixel-for-pixel; all values come from the World Zero tokens already in the codebase.

## Files
| File | What it is |
|---|---|
| `ActivityFeed.jsx` | Feed container — header + maps items, routing each row to the right card by `item.faction` (null ⇒ factionless). Owns the terminal-cursor `@keyframes`. |
| `FactionActivityCard.jsx` | The 7 faction archetypes + a `faction` switch. The deliverable's core. |
| `FactionlessActivityCard.jsx` | The 3 neutral/system card kinds (`announcement`, `join`, `duel`). |
| `sampleFeed.js` | The exact sample data behind the reference, documenting every field each card needs. |
| `tokens/` | Copies of `colors.css`, `typography.css`, `fonts.css` from the design system (mirror of `frontend/src/index.css`). Use yours if you have them. |
| `visual-reference.html` | Self-contained render of the full sample feed — open in any browser to see the target. |

## How to use

```jsx
import { ActivityFeed } from "./ActivityFeed.jsx";
import { sampleFeed } from "./sampleFeed.js";

// tokens must be loaded once, globally (see Design Tokens below)
<ActivityFeed items={sampleFeed} theme="light" />   // or theme="dark"
```

The components have **no dependency beyond React**. They render `var(--…)` custom properties, so the only requirement is that the World Zero token CSS is present on the page.

## Routing logic (ActivityFeed.jsx)
- `item.faction` truthy → `<FactionActivityCard item={item} />`, which switches on the faction slug.
- `item.faction` null/undefined → `<FactionlessActivityCard item={item} />`, which switches on `item.kind`.
- Slug aliases are resolved inside `FactionActivityCard` (`gestalt→wow`, `journeymen→ephemerists`, `aged_out→ua`).

## The cards

### Faction cards (one archetype each)
| Faction | slug | Archetype | Sample activity | Notable fields |
|---|---|---|---|---|
| Singularity | `singularity` | Terminal printout (**always dark**) — scanlines, sprocket holes, blinking cursor | intercepted a signal | `handle`, `action`, `object`, `points`, `level`, `motto` |
| The Everymen | `everymen` | Union dispatch slip — red notched spine, Bebas headline, rubber-stamp badge | completed a task | `actor`, `initial`, `action`, `badge`, `task{title,points,level}`, `motto` |
| Warriors of Whimsy | `wow` | whimsy.exe window — pink titlebar, dotted desktop, Caveat, heart | leveled up | `actor`, `initial`, `action`, `headline`, `hearts`, `level`, `motto` |
| UA | `ua` | Gilt salon (**always light**) — gold frame, parchment, Playfair italic | submitted to the Salon | `actor`, `initial`, `action`, `work`, `critique`, `points` |
| S.N.I.D.E. | `snide` | Ransom slip (**always dark**) — tape, acid masthead, cut-out ransom words | accepted an assignment | `actor`, `initial`, `dispatch`, `action`, `ransomWords[]`, `points`, `level`, `motto` |
| The Ephemerists | `ephemerists` | The discordant map — vellum, crossing coordinate grids, glowing node | sealed a praxis | `actor`, `initial`, `action`, `title`, `titleAccent`, `grade`, `pvncta`, `motto` |
| Albescent | `albescent` | Vellum correspondence (**always light**) — surveyor's mark, Cormorant italic | bore witness | `actor`, `initial`, `action`, `quote` — **deliberately logs no points** |

### Factionless cards (neutral app chrome)
| kind | What it is | Notable fields |
|---|---|---|
| `announcement` | World Zero dispatch banner (dark, admin tokens) | `eyebrow`, `tag`, `time`, `title` |
| `join` | A new player joined — global badge | `actor`, `initial`, `action`, `badge`, `time`, `note`, `cta` |
| `duel` | A duel challenge — duel badge + Accept/Decline | `actor`, `initial`, `action`, `badge`, `time`, `contestTitle`, `contestNote` |

> The Accept/Decline controls on the duel card are static `<span>`s in the reference — wire them to your real handlers (and add hover/focus states) when implementing.

## Layout
- Outer: full-height page, `var(--color-bg-page)`, `42px 18px 80px` padding.
- Inner column: `max-width: 600px`, centered.
- Header: centered eyebrow (9px, `.32em` tracking, uppercase, `--color-text-tertiary`) → title "The Feed" (`var(--font-display)`, italic, 36px, `--color-text-primary`) → 10px subtitle → 34px hairline.
- Cards stack vertically; each card owns its own `marginBottom` (18px; the S.N.I.D.E. slip uses 24px to clear its tape/rotation). Faction cards have intentionally different widths-of-content, textures and (for S.N.I.D.E.) a slight rotation — this is the "field-journal ephemera" feel, not a strict grid.

## Avatars
Every card uses a CSS-gradient **monogram** circle/square (a single `initial` letter), faction-skinned (UA gold sepia ring, WoW pink rounded square, S.N.I.D.E. grayscale square, etc.). The reference uses no photo assets. Swap in your real avatar `<img>` if you have them — keep the per-faction ring/filter treatment (it mirrors `FactionCommentBox`'s `AVATAR_SKIN`).

## Theme behavior
- `theme="dark"` sets `data-theme="dark"` on the feed wrapper; neutral chrome + theme-aware factions (everymen, wow, ephemerists) flip through the cascade.
- **Always-light:** `ua`, `albescent` (pin their own light surface — they never dim).
- **Always-dark:** `singularity`, `snide` (pin their own dark surface in both themes).

## Design Tokens
The components read these custom properties — all defined in `tokens/colors.css`, `tokens/typography.css`, `tokens/fonts.css` (mirror of `frontend/src/index.css`). Representative values (light mode):

**Neutral / shared chrome**
- `--color-bg-page` `#f7f4ee` · `--color-bg-surface` `rgba(255,255,255,.72)` · `--color-bg-surface-alt` `#f0ede6`
- `--color-text-primary` `#1a1209` · `--color-text-secondary` `#6b6050` · `--color-text-tertiary` `#9b8e7d`
- `--color-border` `rgba(0,0,0,.07)` · `--color-border-strong` `rgba(0,0,0,.15)` · `--color-accent-primary` `#be185d`
- Feed badges: `--badge-global` `#6b6a7a` · `--badge-duel` `#dc2626` · `--badge-admin-bg` `#1a1209` · `--badge-admin-text` `#f7f4ee`

**Faction extension palettes** (each faction card draws on one)
- UA `--ua-gilt` (frame gradient), `--ua-paper` `#fdf6ea`, `--ua-ink` `#3d2410`, `--ua-orange` `#c2541f`, `--ua-gold`, `--ua-sub`, `--ua-line-soft`
- WoW `--gestalt-card-bg`, `--gestalt-ink` `#a83a6e`, `--gestalt-pink` `#ec5f99`, `--gestalt-pink-deep`, `--gestalt-pink-lt`, `--gestalt-title-from/to`, `--gestalt-win-border`, `--gestalt-border-soft`
- S.N.I.D.E. `--snide-ink` `#14110b`, `--snide-acid` `#b6ff2e`, `--snide-pink` `#ff2d8b`, `--snide-paper`, `--snide-tape`
- Ephemerists `--eph-vellum` `#e9dcbf`, `--eph-ink` `#2a1d12`, `--eph-gold`, `--eph-rubric` `#9c3622`, `--eph-lapis` `#1d4f6e`, `--eph-muted`
- Singularity (literals, always dark): bg `#050f08`, text `#4ade80`, blue `#2563eb`/`#60a5fa`
- Everymen `--everymen-paper` `#ece1c6`, `--everymen-ink` `#221a12`, `--everymen-red` `#c1272d`, `--everymen-gold`, `--everymen-cream`, `--everymen-muted`
- Albescent `--al-surface` `#fff`, `--al-text` `#1c1c1a`, `--al-ink`, `--al-text-muted`, `--al-border`, `--al-shadow`

**Type** (`--font-*`, all in `typography.css`)
- `--font-body` Courier Prime (mono — all UI/body/labels) · `--font-display` Lora italic (titles) · `--font-accent` Bebas Neue
- Per-faction display faces: `--font-faction-gilt` Playfair Display (UA), `--font-faction-script` Caveat (WoW), `--font-faction-anton` Anton + `--font-faction-black` Archivo Black + `--font-faction-typewriter` Special Elite + `--font-faction-marker` Permanent Marker (S.N.I.D.E.), `--font-faction-engraved` Cinzel + `--font-faction-codex` EB Garamond + `--font-faction-codex-script` Cormorant Garamond (Ephemerists), `--font-faction-terminal` Share Tech Mono (Singularity), `--font-faction-poster` Bebas Neue (Everymen), `--font-faction-vellum` Cormorant Garamond (Albescent)
- Scale is deliberately tiny — 6–14px working range; 24–36px reserved for headlines/titles. Don't "fix" the small sizes; it's the field-journal aesthetic.

## Assets
No image assets. Avatars are CSS gradients; all sigils/marks (compass, cog, surveyor's mark, ephemerist ellipse, sparkle, heart) are tiny inline SVGs inside the components. Fonts load via the `<link>`s in `tokens/fonts.css` (Google Fonts).

## Notes for implementation
- `motto` strings are flavor microcopy baked into several cards — keep or drop per product voice.
- The S.N.I.D.E. ransom title takes an array of `ransomWords`; each word gets a rotating cut-out style. Keep it to ~2–4 short words.
- Consider extracting the shared `Monogram` into one module if you keep both card files (each currently has its own small copy).
- `data-screen-label` / comment-anchor attributes from the prototype were not carried into the React — add your own test ids as needed.

# Handoff: Faction Vote Stamps (World Zero praxis cards)

## Overview
World Zero praxis cards display a completed task's **score** in a corner stamp
(base points · faction multiplier · votes · total) and let a viewer **rate the
proof 1–5** with a faction-specific vote widget. This bundle covers the whole
roster: eight factions, each rendering the same template contract in its own
visual voice, in both light and dark modes.

The interactive core — the **vote widgets** — is delivered here as ready-to-use
React components. The surrounding card chrome is delivered as a pixel reference
(the HTML prototype) plus a documented spec below.

## About the design files
The files here are **design references created in HTML/React** — a prototype of
the intended look and behavior, not drop-in production code. The task is to
**recreate these designs in your target codebase** using its own patterns,
router, i18n, and design tokens. The World Zero app already ships a component
library (`worldzero-frontend`, `window.WZ.*`) with faction skins; prefer wiring
these widgets into that system rather than pasting prototype markup verbatim.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, animation timings, and
interactions. Recreate pixel-for-pixel. Exact values are in the JSX and in
*Design Tokens* below.

## What's in this bundle
| File | What it is |
|------|-----------|
| `FactionVoteWidgets.jsx` | 8 React components — the interactive vote widgets. **Production-intent.** |
| `animations.css` | All `@keyframes` (required by the widgets) + card-chrome effect classes. |
| `Faction Praxis Cards.dc.html` | The full visual prototype — every faction card, light + dark. **Reference only.** |
| `Singularity Mobile Card.dc.html` | Mobile (390px) port of one faction card, proving the integration pattern. **Reference only.** |
| `image-slot.js` | Drop-target web component used by the prototypes for the media/avatar slots. |
| `lotus.svg`, `enso-detailed.svg` | Decorative marks used by the UA card. |
| `screenshots/` | (if included) rendered reference images. |

> **Design-system dependency.** The prototypes load the World Zero Frontend Kit
> (`worldzero-frontend`, `window.WZ.*`) for page chrome and faction skins. That
> bundle is **not** copied here — it already lives in the target app. Wire the
> vote widgets and card spec into those existing components; don't recreate the
> kit from the prototype markup.

## The vote widgets — `FactionVoteWidgets.jsx`
Eight uncontrolled React components. Hover previews a rank; click locks it in;
click again to clear. State (hovered/selected, and an animation tick for the
randomized widgets) is internal.

```jsx
import { UAVote, SnideVote, SingularityVote, EverymenVote,
         EphemeristsVote, WowVote, UnaffiliatedVote, AlbescentVote }
  from './FactionVoteWidgets';
import './animations.css';

<UnaffiliatedVote dark={theme === 'dark'} value={4} onChange={(rank) => save(rank)} />
```

**Props** (all optional): `value` (0–5 seed), `onChange(rank)`, and `dark`
(dark-band caption palette — read by `EverymenVote`, `EphemeristsVote`,
`AlbescentVote`, `UnaffiliatedVote`; the others render identically in both).

**UAVote requires CSS vars** on an ancestor (the card sets them): `--ua`
(`#DD5A1E`), `--ua-deep` (`#B8471A`), `--bg` (the card background, e.g.
`#F7E7D2` light / a dark tone in the dark band — the mandala cores are punched
out to this color).

**Fonts** the captions/widgets assume are loaded (Google Fonts):
Permanent Marker, Share Tech Mono, Bebas Neue, Caveat, Cinzel, EB Garamond,
Cormorant Garamond, Courier Prime.

### Widget-by-widget
| Component | Faction | Metaphor | Rank labels (1→5) |
|-----------|---------|----------|-------------------|
| `UAVote` | UA (University of Asthmatics) | Mandala that blooms fuller/warmer per rank; word reading below (faint→radiant). | faint · forming · true · alive · radiant |
| `SnideVote` | Snide | Amp/EQ meter; segments light acid→amber→pink; rank 5 "party" pulse. | Meh · Not Bad · Rad · Sick · Anarchy |
| `SingularityVote` | Singularity | Terminal decode strip; unreached tiers scramble katakana, reached tiers resolve to density glyphs. | Noise · Weak · Signal · Clear · Verified |
| `EverymenVote` | Everymen | Gearworks; reached gears rotate + glow, rank 5 throws sparks. | Fair · Solid · Good · Excellent · Legendary |
| `EphemeristsVote` | Ephemerists | Constellation; stars light and a dashed gold line connects them, rank 5 twinkles. | apocryphal · disputed · plausible · corroborated · canonical |
| `WowVote` | Wow / Cozy Coven | Witchy moon phases on a night plate; rank 5 moon gets a face + sparkles. | sweet · lovely · wonderful · magical · iconic |
| `UnaffiliatedVote` | Unaffiliated | Growing dots that reveal a shared rainbow spectrum; gentle rise bob. | so-so · decent · good · great · brilliant |
| `AlbescentVote` | Albescent | Ferrofluid: same rainbow spectrum but the dots morph between polygon lobe counts (round→3→4→5→6) on a timer. | so-so · decent · good · great · brilliant |

> The "Cozy Coven balloon" variant (googly balloons that group-bounce at rank 5)
> exists in the prototype as a card-chrome alternative to `WowVote`; its effect
> classes are in `animations.css` (`.wow-gballoon*`, `.wow-gcheer`). The approved
> Wow widget is the moon-phase `WowVote`.

## The card — template contract
Every faction card is the **same skeleton**, reskinned. Recreate this layout;
pull the per-faction colors/fonts from the prototype and *Design Tokens*.

- **Frame**: ~394px wide, rounded (`~7px`), 2px faction border, soft drop
  shadow, `position:relative; overflow:hidden`. Padding ~22px.
- **Header row** (`flex`, `space-between`, `align-items:flex-start`, `gap:14`):
  - **Left column** (`flex:1`): eyebrow (praxis № · state, uppercase, tracked) →
    **title** (large display face) → "for:" line → italic description →
    **byline block**: 30px circular avatar + `<b>name</b> · level · solo · date`.
  - **Right column** (`flex-column`, centered): **score box** then **total stamp**.
- **Score box**: bordered pill, `base` label + `12` numeral + `×0.80` chip on
  one no-wrap row, then italic `+ 4 from votes` beneath.
- **Total stamp**: the faction's signature mark holding `13.6` over a **`POINTS`**
  label (the earlier `✦` glyph was retired everywhere except Wow, whose ✦ is
  decorative). UA uses the **ensō** (`enso-detailed.svg`); other factions use
  their own device (Everymen = rubber-stamp roundel, Ephemerists = rubric, etc.).
- **Media slot**: full-width preview rectangle (~132px tall) under the header,
  1px border, rounded — a drop target for the proof image.
- **Vote row**: the faction's widget from `FactionVoteWidgets.jsx`, bottom-left.

Constant sample figures across every card: **12** base **×0.80** multiplier
**+4** votes **= 13.6** total.

### Everymen — diverged broadsheet variant
Everymen no longer uses the shared score-box/stamp pair; it was rebuilt as a
union broadsheet and is the reference for how far a faction may restyle the
contract while keeping the same data:
- **Masthead**: full-width red bar (`#c1272d` light / `#e2433f` dark), centered
  `⚙ THE EVERYMEN ⚙` in Bebas Neue, kept low-height so it doesn't dominate.
- **Ground**: lined-paper background with a red vertical margin rule down the left.
- **Tally stamp** (replaces the score box): a bordered, slightly tilted
  (`rotate(1.3deg)`) rectangular stamp with `mix-blend-mode:multiply`, a dashed
  rule header, and `BASE / MULT / VOTES` rows with dashed fill-in fields holding
  the numerals in Bebas Neue.
- **Points roundel** (replaces the total mark): a circular rubber stamp with
  arced `★ VERIFIED ★ ON THE RECORD` text (Special Elite) around `13.6` + `POINTS`.

### Mobile
`Singularity Mobile Card.dc.html` demonstrates the intended mobile approach:
take the **WZ kit's mobile page skin** (the faction's full-screen surface) for
the layout and status-bar chrome, and drop the **same vote widget** from
`FactionVoteWidgets.jsx` in unchanged. The widgets are size-agnostic — no mobile
redesign is needed. Frame is 390px wide. Repeat this per faction using its own
WZ mobile skin + its own widget.

## Interactions & behavior
- **Hover** a rank → preview highlight up to that rank + caption text swaps to
  that tier's label.
- **Click** a rank → lock (adds a "picked" outline/scale + the `· tag` suffix in
  the caption). **Click the same rank again** → clear back to idle.
- **Mouse leave** the widget → drop the hover preview (selection persists).
- **Always-on animation**: Singularity scramble and Albescent morph run on a
  120ms interval; UA rank-5 mandala, Everymen gears, and rank-5 sparkle/twinkle
  effects loop via CSS. Respect `prefers-reduced-motion` in production.

## State management
Per widget: `selected` (0–5), `hovered` (0–5); `active = hovered || selected`
drives all rendering. Singularity & Albescent also hold an interval `tick`.
In the prototype these are local; wire `value`/`onChange` to your vote mutation
(the real app persists a rating per viewer per praxis).

## Design tokens
**Score constants:** base `12`, multiplier `×0.80`, votes `+4`, total `13.6`.

**Rank word/color ramp (UA):** `['','faint','forming','true','alive','radiant']`
· colors `['','#A69C8C','#C0894F','#D2762F','#DD5A1E','#B5361A']`.

**Faction palettes (from the prototype):**
- **UA** — `--ua #DD5A1E`, `--ua-deep #B8471A`, bg `#F7E7D2`, border `#B8471A`,
  muted `#8B7C67`; fonts Cormorant/EB Garamond.
- **Snide** — acid `#b6ff2e`, amber `#f0c400`, pink `#ff2d8b`, ink `#14110b`;
  fonts Anton / Permanent Marker.
- **Singularity** — green `#4ade80`, cyan `#60a5fa`, terminal `#070603`;
  Share Tech Mono.
- **Everymen** — red `#c1272d`, heat ramp `#6e747e→#9c7d4a→#c8842a→#eb5f14→#ffcf6e`,
  edge `#c9b58f`; Bebas Neue.
- **Ephemerists** — gold `#d4ab55`, rubric `#9c3622`, lapis `#122b3d`; Cinzel /
  EB Garamond.
- **Wow / Coven** — plum `#7A4A9E`, pink `#ec5f99`, moon gold `#f4d98a`; Caveat /
  MedievalSharp.
- **Unaffiliated / Albescent** — spectrum
  `linear-gradient(90deg,#c1272d,#c2541f 17%,#ca8a04 33%,#16a34a 50%,#1d6e72 67%,#2563eb 83%,#be185d)`;
  Bebas Neue. Albescent adds faint gold sparkle + a looping rainbow shimmer over
  the whole card (`.alb-rainbow`, `.alb-spark`).

**Radii:** card `7px`, score box `6px`, media slot `4px`.

## Assets
- `enso-detailed.svg`, `lotus.svg` — UA card marks (included).
- Media/avatar slots are user-supplied images (drop targets in the prototype).
- No raster brand assets; everything else is CSS/SVG.

## Files to reference
- `Faction Praxis Cards.dc.html` — the authoritative visual spec for all card
  chrome. Open it in a browser to see every faction, light and dark, live.
- `Singularity Mobile Card.dc.html` — the mobile integration pattern (WZ skin + widget).
- `FactionVoteWidgets.jsx` + `animations.css` — the widgets to integrate.

# World Zero — Design System

The visual language of World Zero, a real-world quest game. Everything renders like printed field-journal ephemera: tiny type (8–14px working range), warm paper, hand-made textures, and a hard split between **shared app chrome** (neutral nav / sidebars / watercolor) and **faction-affiliated surfaces** that each wear a completely different physical archetype.

## The seven factions

The roster is a tight rainbow spine — plus Albescent, an unranked secret society that sits outside it. The card archetype IS the faction identity.

| Faction | Slug | Hue | Archetype | Display face |
|---|---|---|---|---|
| UA | `ua` | burnt amber + gold | **gilt salon** (art academy) | Playfair Display |
| Warriors of Whimsy | `wow` | magenta | **whimsy.exe** desktop window (pink computer-witch) | Caveat |
| S.N.I.D.E. | `snide` | green | **ransom dispatch** (photocopier ink, cut-out letters, acid + hot pink) | Anton |
| The Ephemerists | `ephemerists` | teal | **the discordant map** (illuminated codex, vellum + lapis + gold) | Cinzel |
| Singularity | `singularity` | blue | terminal printout (always dark) | Share Tech Mono |
| The Everymen | `everymen` | red | **union / victory poster** | Bebas Neue |
| Albescent | `albescent` | none (ink) | **vellum correspondence** (sacred secret society, always light) | Cormorant Garamond |

History: Analog and UA Masters were retired; the **Journeymen were rebranded as the Ephemerists** (the slug changed `journeymen` → `ephemerists`, with `journeymen` kept as a legacy alias); the **Everymen** were added to claim the rainbow's missing red; **Albescent** was added as an always-light faction outside the rainbow (it used to alias `ua`); **UA was repainted from the purple sticky note into the gilt salon** — burnt amber + antique gold on parchment, now promoted into the global tokens (always-light: it never dims).

## Structure

- **`styles.css`** — the single entry point consumers link. An `@import` manifest pulling in `tokens/*.css`.
- **`tokens/`** — `colors.css` (faction primaries/tints/borders, per-faction extension palettes + the `--faction-<slug>-card-*` contract, light + dark), `fonts.css`, `typography.css`, `spacing.css`, `patterns.css`. Light mode on `:root`, dark under `[data-theme="dark"]` — every component reads `var(--…)` so theme switches through the cascade.
- **`components/`** — `FactionTaskCard` (the signature component — one tag, seven task-card archetypes), `FactionPraxisCard` (its companion — one filed-praxis card per faction, each reframing the 1–5 vote), `FactionVoteStamps` (the 1–5 stamp rating, faction-aware: pass `faction` to reframe the rungs), `FactionCommentBox` (one thread post per faction — gilt salon, whimsy.exe window, ransom slip, vellum marginalia, terminal line, union entry, the register — with auto-styled @mentions), `FactionPennant` (faction filter banner), `Button`, `LevelPill`, `PageTitle`, `FilterStamp`, `LevelNodes`, `WatercolorBackground`, plus the `factions.js` registry (`FACTIONS`, `FACTION_ORDER`, `factionCssVar`). The faction-specific components are grouped under **Faction Components** on the Design System tab.
- **`guidelines/`** — Design System tab cards (palettes, type, spacing, brand).
- **`templates/`** — full multi-page faction kits consuming projects can copy: `everymen/`, `snide/`, `ephemerists/`, `wow/` (Warriors of Whimsy), `singularity/`, `albescent/`. Each has a `<Faction>.dc.html` entry and a `ds-base.js` that loads this DS.

## Using a faction's colors

Prefer the CSS variables (dark mode resolves automatically):

```jsx
import { factionCssVar } from "./components/core/factions.js";
background: factionCssVar("snide", "card-bg");   // → var(--faction-snide-card-bg)
color:      factionCssVar("ephemerists", "card-accent");
```

Each redesigned faction also exposes a named extension palette for richer surfaces: `--ua-*` (orange / gold / ink / sub / paper / wall / line, plus the `--ua-gilt` frame gradient), `--gestalt-*` (Warriors of Whimsy keeps this historical prefix), `--snide-*` (acid / ink / paper / pink / tape / wall), `--eph-*` (gold / rubric / lapis / verdigris / vellum / parchment), `--everymen-*` (cream / gold / olive / ink / red / paper / field). These flip in dark where it matters (UA stays always-light).

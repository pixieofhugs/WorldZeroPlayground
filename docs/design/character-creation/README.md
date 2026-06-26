# Handoff: Character Creation Flow (World Zero)

## Overview
This package documents the **entry path into character creation** for World Zero, a real-world quest game whose UI is styled as printed field-journal ephemera. It covers the main "lives" screen where a player chooses or creates a character, the gate that controls when a *new* character can be made, and the two character-creation screen variants the gate leads into.

The core question this design answers: **where on the main screen does a player click to create a new character, and when is that allowed?**

The flow is:

```
FieldDesk (main screen)
   └─ "Begin a new self" dossier card  ──►  Character Creation screen
        (only clickable once the era's level gate is cleared)
```

## About the Design Files
The files in `designs/` are **design references created in HTML** — prototypes that show intended look and behavior. They are **not production code to copy directly**. They are authored as "Design Components" (`.dc.html`) that run in a bespoke preview runtime (`support.js`); that runtime is **not** part of the target app.

Your task is to **recreate these designs in the target codebase's existing environment** (this product is a React/TypeScript web app — see notes below) using its established components, routing, and state patterns. If no environment exists yet, choose the most appropriate framework and implement there.

The design system used here mirrors the real app's tokens — the HTML references `frontend/src/index.css` equivalents (CSS custom properties) and `utils/factions.ts`. **Use the app's existing token/faction modules rather than re-deriving values.** The hex values below are provided only so you can verify a faithful match.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, copy, and interaction states are all intentional and should be reproduced faithfully using the codebase's existing libraries and faction/token system. The only deliberately non-production element is the **"Preview your level" stepper** that appeared on the (discarded) roster mock — it does not appear in the final flow below and should be ignored.

---

## Screens / Views

### 1. FieldDesk — the main screen ("Whose shoes today?")
**File:** `designs/FieldDesk.dc.html` · **Canvas:** 1280 × 820

**Purpose:** The account home. One World Zero account carries multiple "lives" (characters). The player lands here to step back into an existing life **or** begin a new one. This screen is where the click-in for character creation lives.

**Layout:**
- Full-bleed warm-paper background (`--color-bg-page` `#f7f4ee`) with a 5px radial dot texture (`radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px); background-size:5px 5px`).
- Three soft, blurred watercolor blobs bleed in from the corners (singularity blue top-left, UA amber top-right, gestalt pink bottom-center) at 8–12% opacity, `filter:blur(14–16px)`, `pointer-events:none`.
- **Top bar** (`padding:16px 40px 0`, flex space-between): left = wordmark "World Zero" (`--font-display`, italic 700, 20px) + "field journal" eyebrow (8px, `letter-spacing:0.32em`, uppercase, `--color-text-tertiary`). Right = account pill (`--color-bg-surface`, `border-radius:999px`): "@fieldhand · **3 lives in play**" + a 24px circular avatar chip.
- **Heading** (centered, `margin-top:14px`): "Whose shoes today?" (`--font-display`, italic 700, 44px) + a hand-drawn rainbow underline SVG (`--underline-2` `#be185d`) + subtitle eyebrow "Three lives carried on one account — step back into one, or begin another" (9px, `letter-spacing:0.18em`, uppercase, `--color-text-secondary`).
- **The desk** (`margin-top:42px`, flex, centered, `align-items:flex-end`, `gap:34px`): a row of four cards — three existing-life credentials + one "new self" dossier. Each card has a slight rotation (`-2.2deg`, `1.6deg`, `-1.4deg`, `1.2deg`) and a hover lift (`translateY(-12px)` + drop-shadow), `transition:180ms ease`.
- **Footer hint** (absolute bottom, centered): "click a life to step in · hover to lift · your last carried life loads first" (8px, `letter-spacing:0.16em`, uppercase, tertiary).

**The four desk cards (left → right):**
1. **UA credential — "Beatrix Vellum"** · gilt-salon archetype. Gold foil frame (`--ua-gilt` gradient), parchment sheet (`--ua-paper` `#fdf6ea`), oval portrait with a level badge (14), Playfair Display italic name, "lvl 14 · 2,310 pts", CTA button "Don the robes ▸" (`--ua-orange` `#c2541f` bg).
2. **Singularity credential — "GHOST_0x09"** · terminal-printout archetype. Always-dark (`#050f08`), phosphor green (`#4ade80`) Share Tech Mono, CRT scanline overlay, corner ticks, sprocket strips, wireframe SVG portrait, "LVL 09 / PTS 1,884", CTA "[ resume session ]" with a blinking cursor (`@keyframes fd-blink`).
3. **Warriors of Whimsy credential — "Pim Honeythistle"** · whimsy.exe archetype. Pink desktop window (`you.exe` title bar with 3 traffic-light dots), Caveat script name, rounded-square portrait, sparkle SVGs, "✦ lvl 6 / ♥ 940", CTA "✦ wake her up".
4. **▶ "Begin a new self" dossier — THE CHARACTER-CREATION ENTRY POINT** (see below).

---

### THE CLICK-IN: "Begin a new self" dossier card
This is the answer to "where do you click to create a character." It is the **rightmost card** on the FieldDesk, styled as a blank manila folder/dossier (deliberately quieter than the finished-credential cards so it reads as "empty / add").

**Layout & components:**
- Wrapper rotated `1.2deg` with the same hover-lift as the other cards.
- A small **folder tab** (`78×18`, dashed border, `border-radius:6px 6px 0 0`) sits on the top-left edge.
- The card body is an **`<a>` link** (the whole card is clickable) — `href` → the character creation screen. Styling: `background:var(--color-bg-surface-alt)` (`#f0ede6`), `border:1.5px dashed var(--color-border-strong)`, `padding:26px 18px 20px`, `min-height:330px`, centered flex column, `text-decoration:none; color:inherit`.
- **Plus medallion:** 64×64 circle, `border:2px dashed var(--color-border-strong)`, a thin "+" glyph (34px, weight 300, `--color-text-secondary`).
- **Title:** "Begin a new self" (`--font-display`, italic 700, 23px, `--color-text-primary`).
- **Body copy:** "A fresh life across the seven factions. You'll choose a path once you arrive." (9px, line-height 1.7, secondary, `max-width:170px`).
- **Gate status line** (this reflects the unlock — see Gate below): `border-top:1px solid var(--color-border-strong)`, 7.5px uppercase `letter-spacing:0.14em`, color `--color-success` (`#14532d`). Current copy when unlocked: **"✓ Era II gate · Lvl 4 cleared — slot open"**.
- **CTA button:** "+ New character ▸" — `--color-text-primary` bg, `--color-bg-page` text, 9px uppercase, `padding:9px 18px`, `border-radius:4px`.

**Interaction:** Clicking anywhere on the dossier navigates to the character-creation screen. In the prototype it links to `Character Creation - Second.dc.html`.

---

### The Level Gate (the rule behind the entry point)
A new character can only be created once the player's **first life** reaches a **hard level threshold**, and **that threshold is set by the current game era** (it is not a fixed constant — it is an era property, e.g. Era II → Lvl 4). The prototype uses **Era II — The Long Thaw · gate Lvl 4**.

This produces (at least) two states for the "Begin a new self" dossier that the implementation must support:

- **Locked** (player below the era's gate level): card is dimmed/non-interactive, shows a padlock instead of the "+", and a status line like *"Reach Lvl 4 to begin a new life — set by Era II"* with a progress indication of how many levels remain. (The discarded `Your Lives` roster mock illustrated this locked treatment: dashed grey card, 54px padlock circle, a tri-color progress bar `linear-gradient(90deg,#c2541f,#16a34a,#2563eb)`, and an "X levels to go" line.)
- **Unlocked** (gate cleared): the active state documented above — clickable link, "+" medallion, green "slot open" status, "Now open" emphasis.

> **Implementation note:** read the gate level from the **current era** config, not a hardcoded number. Compare it against the player's highest/first life level. Drive the dossier's locked/unlocked rendering off that comparison.

---

### 2. Character Creation — faction-picking variant ("A second life")
**File:** `designs/Character Creation - Second.dc.html` · **Canvas:** 1280 × 820 · **This is the screen the FieldDesk dossier currently links to.**

**Purpose:** Create a new character that is **already affiliated** — the player names the character, writes a short bio, uploads a portrait, and **chooses one of six factions**, with a live credential preview that re-skins to the chosen faction.

**Layout:** Two columns inside `padding:26px 56px 0`, `gap:52px`, `height:calc(100% - 56px)`.
- **Left (600px) — the form:**
  - Eyebrow "A second life · World Zero" + title "Who are you becoming?" (`--font-display` italic 700, 38px) + rainbow underline SVG.
  - **Step indicator:** two segments with top borders — "✓ Step 1 — Name & likeness" (dimmed, done) and "Step 2 — Choose your faction" (active).
  - **Name + bio row:** "Chosen name" text input (Playfair-italic 24px, underline-only border, `maxlength=22`, live `@handle` slug below) + "About — shown on your profile" textarea (`maxlength=160`, surface bg, rounded).
  - **Faction picker:** 2-column grid of six selectable chips, each with the faction's dot color, display name in that faction's display font, and archetype label. Selecting one applies a colored selection ring (`box-shadow: 0 0 0 2px <faction-color>, 0 5px 12px rgba(0,0,0,0.14)`). The six: **The Everymen** (Union Poster), **UA** (Gilt Salon), **S.N.I.D.E.** (Ransom Dispatch), **The Ephemerists** (Discordant Map), **Singularity** (Terminal), **Warriors of Whimsy** (Whimsy.exe).
  - **Actions:** primary "Create & step out ▸" (dark bg) + "Cancel" text button + right-aligned note "starts at Lvl 1 · 0 pts".
- **Right — live credential preview:** A faction-skinned ID card (rotated `-1.4deg`, with a faux paperclip). It re-themes on faction change via CSS custom properties `--fc-bg / --fc-text / --fc-accent / --fc-muted / --fc-font` set from the `--faction-<slug>-card-*` contract (see Design Tokens). Contains: a circular portrait drop-zone (image upload), the live name in the faction's display font, the live bio (clamped 2 lines), a faction pill, "lvl 1", "0 pts", and the faction's tagline. Card transitions `background`/`border-color` over `220ms`.

**State:** `name` (string, ≤22), `bio` (string, ≤160), `fac` (one of the six faction slugs), uploaded portrait image. Derived: display name (fallback "Wanderer"), `@handle` slug, and the faction config (name / archetype / tagline / card color vars).

### 2b. Character Creation — factionless variant ("A new life")
**File:** `designs/Character Creation.dc.html` · **Canvas:** 1280 × 820 · *(alternative direction — not currently linked from the desk)*

Same two-column shell, but the player begins **unaffiliated**: no faction picker, a dashed "No faction at creation" callout explaining that faction is chosen later in the field, and an "UNAFFILIATED" stamp + empty faction slot on the preview credential (which uses a neutral conic-gradient portrait ring rather than a single faction color). Keep this on hand in case product wants creation to defer faction choice; the wired flow uses the faction-picking variant (2) above.

---

## Interactions & Behavior
- **FieldDesk cards:** hover lifts the card (`translateY(-12px)` + drop-shadow, `transition:transform/filter 180ms ease`), preserving each card's base rotation. Existing-life cards' CTAs resume that character; the dossier card navigates to creation.
- **Dossier gate:** locked vs unlocked rendering is driven by `playerLevel >= currentEra.creationGateLevel`. Locked = non-navigable + padlock + progress; unlocked = navigable link + "slot open".
- **Creation — faction select:** clicking a faction chip sets selection state, draws the selection ring, and live-re-skins the entire preview credential (colors + display font + tagline) with a 220ms transition.
- **Creation — live fields:** name and bio inputs update the preview in real time; name also generates the `@handle` slug (`lowercase`, strip non-alphanumerics, slice 14). Empty name falls back to "Wanderer".
- **Portrait:** circular drop-zone accepting drag-drop or click-to-upload (prototype uses an `image-slot` web component; replace with the app's existing avatar uploader).
- **Submit:** "Create & step out ▸" creates the character at **Lvl 1 · 0 pts** and (per the desk metaphor) returns the player into that new life.

## State Management
- **Account level:** list of the account's lives; each life has `{ name, faction, level, points, portrait, lastActive }`.
- **Era:** current era object exposing the **creation gate level** (the number the dossier checks against). Source of truth for the gate — do not hardcode `4`.
- **Creation form:** `name` (≤22), `bio` (≤160), `faction` (slug | none), `portrait` (image). Derived: display name, handle slug, faction theme tokens.
- **Navigation:** FieldDesk → Creation route; Creation → back to FieldDesk on submit/cancel.

## Design Tokens
All values are CSS custom properties from the World Zero design system (`tokens/colors.css`, `tokens/typography.css`). **Pull these from the app's existing token + `factions` modules.**

**Core palette (light):**
- `--color-bg-page` `#f7f4ee` · `--color-bg-surface` `rgba(255,255,255,0.72)` · `--color-bg-surface-alt` `#f0ede6`
- `--color-text-primary` `#1a1209` · `--color-text-secondary` `#6b6050` · `--color-text-tertiary` `#9b8e7d`
- `--color-border-strong` `rgba(0,0,0,0.15)`
- `--color-success` `#14532d` (gate-cleared status) · `--color-danger` `#dc2626` · `--color-warning` `#b45309`

**Faction primary colors (rainbow spine):**
- UA `--faction-ua` `#c2541f` · WoW `--faction-gestalt` `#be185d` · S.N.I.D.E. `--faction-snide` `#16a34a` · Ephemerists `--faction-ephemerists` `#1d6e72` · Singularity `--faction-singularity` `#2563eb` · Everymen `--faction-everymen` `#c1272d` · Albescent `--faction-albescent` `#1c1c1a`
- Each also has `-light` (tint bg) and `-border` variants.

**Faction "card contract" (used by the live credential preview — `--faction-<slug>-card-{bg,text,accent,muted,font}`):** e.g. `ua-card-bg` = parchment `#fdf6ea`, `ua-card-accent` `#c2541f`; `singularity-card-bg` `#050f08`, `-text`/`-accent` `#4ade80`, `-muted` `#60a5fa`; `snide-card-bg` `#14110b` (always-dark), `-accent` acid `#b6ff2e`; etc. See `tokens/colors.css` for the full set and dark-mode resolutions.

**Typography:**
- `--font-display` `"Lora", Georgia, serif` — wordmark, page & screen titles (used italic).
- `--font-body` `"Courier Prime", "Courier New", monospace` — ALL body text, UI, labels, eyebrows.
- Per-faction display faces: UA `"Playfair Display"` · WoW `"Caveat"` · S.N.I.D.E. `"Anton"` · Ephemerists `"Cinzel"` · Singularity `"Share Tech Mono"` · Everymen `"Bebas Neue"` · Albescent `"Cormorant Garamond"`. (Loaded from Google Fonts in `tokens/fonts.css`.)
- Working type scale is small: eyebrows 7–9px (uppercase, wide letter-spacing 0.1–0.32em), body 8–11px, screen titles 38–44px.

**Texture/shape conventions:** warm paper bg + 5px radial-dot grain; hand-drawn rainbow underline SVGs under titles; slight card rotations + hover lift; faux paperclips/folder tabs; faction credentials each render as a distinct physical artifact (foil card, terminal printout, desktop window).

**Dark mode:** the token file ships `[data-theme="dark"]` overrides for everything; reading via `var(--…)` makes theme switching automatic.

## Assets
- **Fonts:** Google Fonts, imported in `designs/_ds/.../tokens/fonts.css` (Lora, Courier Prime, Playfair Display, Caveat, Anton, Cinzel, EB/Cormorant Garamond, Share Tech Mono, Bebas Neue, etc.).
- **Icons:** all inline SVG (camera, lock, clock, plus, arrows, sparkles, wireframe face) — no icon font or raster assets.
- **Portraits:** user-uploaded via the portrait drop-zone (no shipped images). The prototype's `image-slot.js` is a stand-in — use the app's avatar/upload component.
- **Watercolor / textures:** CSS gradients only (no image files).

## Files
In `designs/`:
- `FieldDesk.dc.html` — **main screen + the character-creation entry point (the "Begin a new self" dossier).**
- `Character Creation - Second.dc.html` — **wired creation screen** (faction-picking variant).
- `Character Creation.dc.html` — alternative factionless creation screen (not currently linked).
- `_ds/world-zero-design-system-…/` — the design-system tokens/components the mocks reference (color, type, spacing, patterns). Map these to the app's real token modules.
- `support.js`, `image-slot.js` — **prototype runtime only; do not port.** `support.js` is the Design-Component renderer; `image-slot.js` is the placeholder upload widget.

To view a mock: open any `.dc.html` in `designs/` in a browser. The faction-picking creation screen is what the desk's dossier opens.

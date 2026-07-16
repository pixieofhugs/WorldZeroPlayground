# World Zero — Frontend Style Guide

**Design system reference.** This document describes _intent and constraints_ — not implementation. For exact values, see `index.css` (CSS variables) and `factions.ts` (faction config). The code is the source of truth for colors, sizes, and spacing.

---

## 0. Philosophy

World Zero is a whimsical real-world game. The UI should feel like a **handmade artifact** — paper textures, ink, collage, field journals, newspaper clippings — not a SaaS dashboard. Every faction has its own visual language expressed through its card archetype. The overall aesthetic is "eccentric design student meets community ARG": colorful, slightly chaotic, but always readable.

**The one rule:** weird is good. Standard is bad. When in doubt, ask: would an eccentric design student be proud of this or embarrassed by it?

---

## 1. UX Principles

These are non-negotiable and take precedence over any visual specification.

1. **Responsive over pixel-perfect.** Define reasonable defaults (min/max widths, fluid spacing). Only pin exact dimensions when the design genuinely requires it. Cards, panels, and grids should adapt to available space.

2. **Set defaults, override selectively.** Typography, spacing, colors, borders — set them once at the theme level. Override individual elements only when they need to differ. If you find yourself repeating a value across components, it belongs in the CSS variable system.

3. **Single source of truth for style.** Colors, typography, and spacing live in CSS custom properties (`index.css`). Components reference variables — never hardcode hex values or pixel sizes. Dark mode works automatically through the cascade. Faction colors live in both `index.css` (for CSS cascade) and `factions.ts` (for JS access). These two files must stay in sync.

4. **If you can't use it, you can't see it.** Buttons, menu items, and actions that the user lacks permission for (level gate, role, status) should not render at all. Don't show disabled controls — hide them. This is already the pattern in the codebase; maintain it.

   **Validation belongs in business logic, not UX.** Gate rules (level thresholds, faction rules, anti-self checks, one-per-task rules) live in backend services. The backend is authoritative.
   - API responses include explicit `can_X` flags (`can_flag`, `can_submit_praxis`, `can_create_additional_character`, `allowed_modes`, `eligible_for_current_user`, etc.) computed server-side.
   - The frontend consumes those flags and hides controls accordingly. Do not re-implement the rule in a component.
   - No hardcoded rule thresholds in the frontend. If you're writing `level >= 4` in a component, the backend should be returning a flag instead.
   - Disabled state (`<button disabled>`) is only for in-flight async and form validity — never for rule-based denial.

5. **Every button does something.** Don't render an interactive control unless it has a handler that does real work on press. No placeholder buttons, no "coming soon" stubs, no controls that render but no-op. If the feature isn't built yet, the control isn't on the page yet. This is stricter than #4: #4 hides controls the user _can't_ use; this rule says even the _author_ can't leave a dead control behind.

6. **Faction identity cascades from the card archetype.** Anything associated with a faction (profile headers, praxis bylines, proposal wrappers, feed items) should reuse the faction's card aesthetic. Change the card archetype once and every faction-branded element updates. Don't create parallel styling for each context.

7. **The code is the spec.** This document describes design _intent_. When this document and the code disagree, update whichever is wrong. Don't let them drift.

---

## 2. Tech Stack (Frontend)

- **Framework:** React (functional components + hooks only)
- **Styling:** Tailwind utilities + CSS custom properties. Inline styles are acceptable for truly dynamic values (rotations, faction-specific backgrounds) but repeated patterns should be CSS classes.
- **Fonts:** Google Fonts (see Typography section)
- **Icons:** CSS shapes, SVG, or typographic characters — no icon libraries
- **Animations:** CSS transitions only; keep subtle
- **Theme:** Light and dark mode via CSS custom properties on `:root` and `[data-theme="dark"]`

---

## 3. Color System

All color values are CSS custom properties defined in `index.css`. See that file for the complete list.

**Key groups:**

- **Page:** `--color-bg-page`, `--color-bg-surface`, `--color-bg-surface-alt`
- **Text:** `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`
- **Borders:** `--color-border`, `--color-border-strong`
- **Factions:** `--faction-{slug}` (primary), `--faction-{slug}-light` (tint), `--faction-{slug}-border`
- **Faction cards:** `--faction-{slug}-card-bg`, `--faction-{slug}-card-text`, `--faction-{slug}-card-accent`, `--faction-{slug}-card-font`
- **Functional:** `--color-success`, `--color-danger`, `--color-warning` (each with `-light` and `-border` variants)
- **Votes:** `--vote-1` through `--vote-5` (orange → yellow → green → blue → magenta, increasing intensity)

**Dark mode** is handled by `[data-theme="dark"]` overrides in `index.css`. Components should use `var(--faction-analog-card-bg)` — never `dark ? '#1e1a10' : '#fffef5'`.

**Rule:** If you're about to hardcode a hex value in a component, stop. Add it as a CSS variable first.

---

## 4. Typography

All fonts loaded from Google Fonts.

| Role           | Font            | Usage                                     |
| -------------- | --------------- | ----------------------------------------- |
| Display / Logo | `Lora` (italic) | Wordmark, page titles, praxis titles      |
| Body / UI      | `Courier Prime` | All body text, labels, nav links, filters |
| Accent display | `Bebas Neue`    | Reserved for special uses                 |

**Per-faction headline fonts** — each faction card uses its own display font for the headline/title, exposed via `--faction-{slug}-card-font`:

| Faction     | Headline font      | CSS var                           |
| ----------- | ------------------ | --------------------------------- |
| UA          | `IM Fell English`  | `--faction-ua-card-font`          |
| Everymen    | `Special Elite`    | `--faction-everymen-card-font`    |
| Warriors of Whimsy | `Caveat`    | `--faction-wow-card-font`         |
| S.N.I.D.E.  | `Permanent Marker` (+ a punk set: Anton / Bebas Neue / Archivo Black / Special Elite, via `--faction-snide-font-*`) | `--faction-snide-card-font`       |
| Ephemerists | `Cinzel`           | `--faction-ephemerists-card-font` |
| Singularity | `Share Tech Mono`  | `--faction-singularity-card-font` |
| UA Masters  | `UnifrakturCook`   | `--faction-ua-masters-card-font`  |

Use `factionCssVar(slug, 'card-font')` in components. Never hardcode the font family string directly.

**Type scale** is defined as CSS variables (`--text-xs` through `--text-4xl`). Use the variable names, not raw pixel values.

**Content-text floor:** real content — titles, scores, body copy — uses `--text-2xl` (18px) or larger. The smaller tokens (`--text-xs`–`--text-xl`, 8–14px) are reserved for labels, eyebrows, and badges only. Don't render readable content below `--text-2xl`.

**Eyebrow / label text:** Courier Prime, `--text-sm` (9px), uppercase, letter-spacing 0.15em, `var(--color-text-tertiary)`. Use the `.eyebrow` class.

**Spacing scale** is defined as CSS variables `--space-xs` (4px), `--space-sm` (8px), `--space-md` (12px), `--space-lg` (16px), `--space-xl` (24px), `--space-2xl` (32px) — same shape as `--radius-*`. Use these token names for `padding` / `margin` / `gap`, never raw pixel values. The scale is global and theme-independent; faction identity comes from font, colour, and ornament, never from a bespoke size or spacing.

Both rules (type scale + spacing scale) are enforced by the `no-raw-style-values` ESLint rule, with existing violations grandfathered into a shrinking exemption list (`frontend/.eslint-legacy-raw-styles.txt`).

---

## 5. Layout

Every logged-in page follows this shell:

```
Nav (sticky, frosted glass)
Watercolor Background (absolute, behind content)
Body: Main Content (flex: 1) + Sidebar (256px)
```

The sidebar contains: character card, active tasks panel, recent activity panel, propose-a-task button. Some pages add contextual panels (e.g., faction standings on Players, pending requests on Updates).

**Exceptions:** Submit Proof and Propose Task forms drop the sidebar for a single-column writing layout.

---

## 6. Faction Card Archetypes

**Core principle:** Each faction's tasks use a completely different card archetype. The card type IS the faction identity. All cards display: task name, faction name, point value, level requirement (via `LevelPill`).

Cards are arranged in a `flex-wrap` container with varied heights and slight rotations. This is intentional — they are NOT on a strict grid.

| Faction     | Card type          | Primary color     | Key visual metaphor                                 | Headline font    |
| ----------- | ------------------ | ----------------- | --------------------------------------------------- | ---------------- |
| UA          | Sticky note        | `#7c3aed` purple  | Push pin, clipped corner, faded lavender            | IM Fell English  |
| Everymen    | Field journal page | `#ca8a04` yellow  | Red margin rule, horizontal lines, torn bottom edge | Special Elite    |
| Warriors of Whimsy | Paper collage | `#be185d` magenta | 3 layered scraps, scotch tape strip               | Caveat           |
| S.N.I.D.E.  | Ransom dispatch    | `#6fae00` acid green | Photocopier-ink demand note, cut-out ransom letters, halftone + scotch tape; intentionally the loudest, largest card | Permanent Marker (+ punk set) |
| Ephemerists | Discordant map     | `#1d6e72` lapis   | Three irreconcilable coordinate grids, one word in the lapis, House-of-Leaves apparatus on aged vellum | Cinzel           |
| Singularity | Terminal printout  | `#2563eb` blue    | Always dark, green text, sprocket holes, scanlines  | Share Tech Mono  |
| UA Masters  | Gazette article    | `#c2410c` orange  | Corner-snipped edges, proper masthead, two columns  | UnifrakturCook   |

**Faction card colors** (backgrounds, text, accents) are defined as CSS variables: `--faction-{slug}-card-bg`, `--faction-{slug}-card-text`, `--faction-{slug}-card-accent`. Dark mode variants are automatic via the cascade.

**Singularity** is always dark in both themes — no light variant needed.

**Reuse pattern:** The faction card aesthetic should be used as a wrapper for any faction-branded context: profile headers, praxis bylines, proposal form wrappers, podium cards. The card component handles the visual treatment; the parent provides the content.

---

## 7. Components

### Nav Bar

- Frosted glass: `var(--color-nav-bg)` with backdrop blur
- Wordmark: Lora italic with rainbow gradient underline
- Links: Courier Prime, `--text-base`, uppercase

### Page Title

- Lora italic, `--text-4xl`
- Per-letter colored underline bars cycling through `--underline-1` to `--underline-6`

### Filter Controls

Three visually distinct types — NOT standard `<select>` or checkbox elements:

- **Status:** Rectangular rubber stamps (no border-radius)
- **Faction:** Diagonal banner/pennant tabs using faction colors. Pennants render at full saturation always. Inactive: `opacity 0.85`. Active: `opacity 1`. No desaturate filter.
- **Level:** Connected circle nodes

### Sidebar Cards

Frosted surface: `var(--color-bg-surface)`, backdrop blur, `var(--color-border)`

### Watercolor Background

Full-bleed SVG with blurred ellipses in four corners. Opacity controlled by `--wc-opacity-*` variables so dark mode dims automatically.

---

## 8. Dark Mode

Controlled by `data-theme="dark"` attribute on `<html>`. All colors reference CSS variables so the switch is automatic.

- Store preference in `localStorage` key `wz-theme`
- Default to system preference via `prefers-color-scheme`
- Body transition: 150ms on background-color and color

**Implementation rule:** Do NOT use `const dark = theme === 'dark'` to pick colors. Use CSS variables. The only place `useTheme()` should drive color decisions is for truly structural differences (e.g., Singularity card is always dark regardless of theme).

---

## 9. Page Summaries

Brief design intent for each page. For implementation details, read the component code.

- **Tasks:** Flex-wrap card grid with faction filter pennants, status stamps, and level nodes. Cards flow naturally with varied sizes.
- **Task Detail:** Faction card archetype expanded to full width as hero block. Sign-up block with mode selector (Solo/Collab/Duel) as stamp buttons. Meta tasks section. Praxis gallery below.
- **Praxis Submission:** Faction-framed byline block. Media gallery with thumbnail strip. Lora prose body with drop-cap in faction color. Vote stamps (1-5, word labels) replace star ratings. Voter tile grid.
- **Player Profile:** Faction-framed header. Level track (horizontal, 9 levels). Praxis grid. Friends/Foes panels with score deltas.
- **Players (Leaderboard):** Top 3 podium in faction-framed cards. Your rank strip. Frosted table with faction color edge accents. Faction standings sidebar panel.
- **Updates Feed:** Stamp-style filter pills. Feed items with 4px left-edge accent by type. Foe taunts as physical notes (aged paper, tape, torn edge). Era announcements as full-width dark cards.
- **Submit Proof:** No sidebar — single centered column. Faction-framed task context header. Rich text editor. Media upload grid. Meta task checkboxes.
- **Propose Task:** No sidebar — two-column (form + tips). Faction selector determines card wrapper aesthetic. Live task preview strip.

---

## 10. What NOT To Do

- **No uniform card shapes** — every faction is a different archetype; this is load-bearing
- **No standard card grid** — task cards are flex-wrap with intentional chaos
- **No sans-serif for body text** — Courier Prime is the base UI font
- **No solid color backgrounds on the page** — the watercolor SVG is always present
- **No hardcoded hex values in components** — always use CSS custom properties
- **No dark mode via ternaries** — use CSS variables so the cascade handles it
- **No dark mode by inverting colors** — each card has a specifically designed dark variant in the CSS variables
- **No disabled buttons for permission gates** — hide controls users can't use
- **No dead buttons** — every interactive control must have a working handler; no placeholders, no stubs, no `onClick={() => {}}`
- **No parallel faction styling** — reuse the card archetype everywhere, don't recreate it
- **Do not regularize card sizes** — varied widths and rotations are intentional
- **Do not use emoji as icons** — use CSS or SVG

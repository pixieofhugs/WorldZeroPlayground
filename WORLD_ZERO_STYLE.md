# World Zero — Frontend Style Guide
**For Claude Code / handoff use**
*Generated from design iteration sessions. This doc is the source of truth for all visual decisions.*

---

## 0. Philosophy

World Zero is a whimsical real-world game. The UI should feel like a **handmade artifact** — paper textures, ink, collage, field journals, newspaper clippings — not a SaaS dashboard. Every faction has its own visual language expressed through its card archetype. The overall aesthetic is "eccentric design student meets community ARG": colorful, slightly chaotic, but always readable.

**The one rule:** weird is good. Standard is bad. When in doubt, ask: would an eccentric design student be proud of this or embarrassed by it?

---

## 1. Tech Stack (Frontend)

- **Framework:** React (functional components + hooks only)
- **Styling:** CSS Modules or Tailwind — no inline styles in production components
- **Fonts:** loaded via Google Fonts (see Section 3)
- **Icons:** none — use CSS shapes, SVG, or typographic characters
- **Animations:** CSS transitions only (no heavy libraries); keep subtle
- **Theme:** supports light and dark mode via CSS custom properties on `:root` and `[data-theme="dark"]`

---

## 2. Color System

### 2.1 Base Palette

All colors defined as CSS custom properties. Components reference variables only — never hardcode hex values.

```css
:root {
  /* Background layers */
  --color-bg-page:        #F7F4EE;   /* warm off-white paper */
  --color-bg-surface:     rgba(255, 255, 255, 0.72);  /* frosted card surfaces */
  --color-bg-surface-alt: #F0EDE6;   /* stat cells, secondary surfaces */

  /* Text */
  --color-text-primary:   #1a1209;   /* near-black ink */
  --color-text-secondary: #6b6050;   /* muted ink */
  --color-text-tertiary:  #9b8e7d;   /* labels, eyebrows */

  /* Borders */
  --color-border:         rgba(0, 0, 0, 0.07);
  --color-border-strong:  rgba(0, 0, 0, 0.15);

  /* Accent — used sparingly for interactive states */
  --color-accent-primary: #be185d;   /* pink/rose — logo dot, highlights */
}

[data-theme="dark"] {
  --color-bg-page:        #13121a;   /* deep dark */
  --color-bg-surface:     rgba(255, 255, 255, 0.04);
  --color-bg-surface-alt: rgba(255, 255, 255, 0.06);

  --color-text-primary:   #f0e6d0;   /* warm cream */
  --color-text-secondary: #7a7060;
  --color-text-tertiary:  #4a4860;

  --color-border:         rgba(255, 255, 255, 0.07);
  --color-border-strong:  rgba(255, 255, 255, 0.15);

  --color-accent-primary: #be185d;
}
```

### 2.2 Faction Colors

Each faction has a canonical color used for: card accents, filter tabs, task dot indicators in sidebar, and level pill backgrounds.

| Faction       | Light mode hex | Dark mode hex  | Usage notes                        |
|---------------|---------------|----------------|-----------------------------------|
| UA            | `#6b6a7a`     | `#a78bfa`      | Muted — they have no identity yet |
| Analog        | `#15803d`     | `#15803d`      | Forest green                      |
| Gestalt       | `#14532d`     | `#4ade80`      | Deep green light / bright green dark |
| S.N.I.D.E.   | `#8a6a20`     | `#c49a3a`      | Aged gold / newspaper gold        |
| Journeymen    | `#c49a3a`     | `#c49a3a`      | Warm leather gold                 |
| Singularity   | `#7c3aed`     | `#4ade80`      | Purple light / terminal green dark |
| UA Masters    | `#555555`     | `#c49a3a`      | Neutral / aged gold               |

### 2.3 Watercolor Splash Colors

The page background uses SVG watercolor splashes in the four corners. These are the color families per corner — they stay consistent across all pages.

| Corner       | Light mode colors             | Dark mode colors (deep, low opacity) |
|--------------|-------------------------------|---------------------------------------|
| Top-left     | Blue, indigo, violet          | `#4f46e5`, `#7c3aed`, `#be185d`      |
| Top-right    | Orange, amber, lime green     | `#b45309`, `#d97706`, `#16a34a`      |
| Bottom-left  | Rose, pink, orange            | `#9f1239`, `#7c3aed`                 |
| Bottom-right | Teal, cyan, sky blue          | `#0f766e`, `#0e7490`                 |

**Implementation:** SVG `<ellipse>` elements with `feGaussianBlur` (stdDeviation 26–30) and `feTurbulence` + `feDisplacementMap` for paint-bleed distortion. Opacity 0.28–0.38 in light mode, 0.11–0.18 in dark mode. See `WatercolorBackground.jsx` component.

### 2.4 Page Title Underline Colors

The page title treatment (see Section 5.2) uses colored underline bars. The four colors cycle and must always appear in this order:

1. `#fbbf24` — amber
2. `#be185d` — rose
3. `#4f46e5` — indigo
4. `#0e7490` — teal
5. `#16a34a` — green  *(for longer titles with 5+ letters)*
6. `#f97316` — orange *(for longer titles)*

---

## 3. Typography

All fonts loaded from Google Fonts. Add to `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,500;0,600;1,400;1,500&family=Courier+Prime:wght@400;700&family=Special+Elite&family=Share+Tech+Mono&family=Bebas+Neue&display=swap" rel="stylesheet">
```

### Font Roles

| Role | Font | Weight | Style | Usage |
|------|------|--------|-------|-------|
| Display / Logo | `'Lora', serif` | 500 | italic | Wordmark, page titles base |
| Body / UI | `'Courier Prime', monospace` | 400, 700 | normal | All body text, labels, nav links, filters |
| Faction: Analog, SNIDE, UA Masters | `'Special Elite', serif` | 400 | normal | Card body text for these three factions |
| Faction: Singularity | `'Share Tech Mono', monospace` | 400 | normal | All Singularity card text |
| Accent display | `'Bebas Neue', sans-serif` | 400 | normal | Reserved for special uses only |

### Type Scale

```css
--text-xs:   8px;
--text-sm:   9px;
--text-base: 10px;
--text-md:   11px;
--text-lg:   12px;
--text-xl:   14px;
--text-2xl:  18px;
--text-3xl:  28px;
--text-4xl:  34px;
```

### Eyebrow / Label Text

All section labels, filter labels, metadata:
- Font: `Courier Prime`
- Size: `9px`
- Transform: `uppercase`
- Tracking: `0.15em–0.2em`
- Color: `var(--color-text-tertiary)`

---

## 4. Layout

### 4.1 Page Shell

Every logged-in page follows this shell:

```
┌─────────────────────────────────────────────────┐
│  NAV (sticky, frosted glass)                    │
├─────────────────────────────────────────────────┤
│  WATERCOLOR BACKGROUND (absolute, z-index 0)    │
│  ┌─────────────────────────────────────────┐    │
│  │  BODY (z-index 5, padding 1.25rem 1.5rem)│   │
│  │  ┌─────────────────┐  ┌──────────────┐  │   │
│  │  │  MAIN CONTENT   │  │   SIDEBAR    │  │   │
│  │  │  (flex: 1)      │  │   (256px)    │  │   │
│  │  └─────────────────┘  └──────────────┘  │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

```css
.page-layout {
  display: grid;
  grid-template-columns: 1fr 256px;
  gap: 1.1rem;
  align-items: start;
}
```

The sidebar is **always visible on all logged-in pages.** It contains (in order): character card, active tasks panel, recent activity panel, propose-a-task button.

### 4.2 Sidebar — Always-On Panels

**Character Card:**
- Player avatar orb (40px circle, faction gradient)
- Display name in Lora italic
- Faction + level in faction color, uppercase 9px
- 3-column stat grid: Score, Votes, Era

**Active Tasks Panel:**
- Label: "Your active tasks"
- List of task items: faction color left-border (3px), task name, meta (faction · level · date)
- Badge pill: Solo / Collab / Duel ⚔ in faction color
- Progress bar: `X / 20 slots` with indigo fill

**Recent Activity Panel:**
- 3 most recent events
- Player names in their faction color + bold
- Timestamps in `var(--color-text-tertiary)`
- Separated by 1px dashed border

**Propose a Task Button:**
- Full width
- Light: `background: #1a1209; color: #F7F4EE`
- Dark: `background: #f0e6d0; color: #13121a`
- Font: Courier Prime 9px uppercase, letter-spacing 0.12em

---

## 5. Components

### 5.1 Navigation Bar

```
[World Zero wordmark] [Nav links] ............ [username] [avatar]
```

**Wordmark:**
- Font: `Lora`, italic, 19px
- Color: `var(--color-text-primary)`
- Has a rainbow gradient underline (2px) spanning the full word width
- Gradient: `linear-gradient(90deg, #4f46e5, #be185d, #f97316, #16a34a)`
- No pink dot (removed from final design)

**Nav links:**
- Font: Courier Prime, 10px, uppercase, tracking 0.12em
- Color: `var(--color-text-secondary)`
- Active state: `var(--color-text-primary)` + 1.5px solid underline in same color
- Links: Home · Tasks · Praxis · Players · Factions · Updates · Admin (if admin)

**Nav bar itself:**
- Light: `background: rgba(247, 244, 238, 0.88); backdrop-filter: blur(6px)`
- Dark: `background: rgba(19, 18, 26, 0.92); backdrop-filter: blur(8px)`
- Border-bottom: `var(--color-border)`
- Sticky, `z-index: 10`

### 5.2 Page Title Treatment

Every page has a title using **Lora italic with colored underline bars under each letter.** This is the locked treatment (Option F from design iteration).

**Rules:**
- Font: `Lora`, italic, 34px
- Color: `var(--color-text-primary)`
- Each letter gets a `border-bottom` of 4px in one of the cycling faction colors (see Section 2.4)
- Only consonants and key letters get a bar — vowels in function words ("a", "of") can be skipped for visual breathing room, but this is a judgment call per page
- The underline colors cycle through the palette — they do NOT need to mean anything specific, they are purely decorative
- Spaces between words get no underline
- The eyebrow text (era name, count) sits above the title at 9px uppercase

**Example implementation:**
```jsx
// PageTitle component
// Receives: title string, eyebrow string
// Splits title into characters, assigns cycling underline colors
const UNDERLINE_COLORS = ['#fbbf24', '#be185d', '#4f46e5', '#0e7490', '#16a34a', '#f97316'];

function PageTitle({ title, eyebrow }) {
  let colorIndex = 0;
  return (
    <div>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="page-title">
        {title.split('').map((char, i) => {
          if (char === ' ') return <span key={i} style={{display:'inline-block',width:'0.3em'}} />;
          const color = UNDERLINE_COLORS[colorIndex % UNDERLINE_COLORS.length];
          colorIndex++;
          return (
            <span key={i} style={{borderBottom: `4px solid ${color}`, fontFamily:'Lora,serif', fontStyle:'italic'}}>
              {char}
            </span>
          );
        })}
      </h1>
    </div>
  );
}
```

### 5.3 Filter Controls

Three visually distinct filter types that live above the task grid. They are **not** standard `<select>` or checkbox elements.

**Status Filter — Rubber Stamps**
- Rectangular, no border-radius
- Border: 2px solid
- Font: Courier Prime, 10px, bold, uppercase, tracking 0.1em
- Inactive: `background: rgba(255,255,255,0.6); color: var(--color-text-primary); border-color: rgba(0,0,0,0.2)`
- Active: `background: #1a1209; color: #F7F4EE; border-color: #1a1209`
- Dark active: `background: #f0e6d0; color: #13121a`
- Inner dashed border: `inset: 2px; border: 1px dashed rgba(0,0,0,0.15)`

**Faction Filter — Diagonal Banner Tabs**
- `clip-path: polygon(0 0, 100% 0, 95% 100%, 5% 100%)` — gives a parallelogram/pennant shape
- Font: Courier Prime, 9px, bold, uppercase, tracking 0.07em, white text with text-shadow
- Background: faction color (see Section 2.2)
- Active: full opacity
- Inactive: `opacity: 0.42; filter: saturate(0.3)`
- No border-radius

**Level Filter — Connected Nodes**
- Row of circles connected by short horizontal bars
- Each circle: 30px diameter, `border: 2px solid`
- Inactive: `background: rgba(255,255,255,0.6); border-color: rgba(0,0,0,0.2); color: var(--color-text-tertiary)`
- Active: `background: #1a1209; color: #F7F4EE; border-color: #1a1209; transform: scale(1.15)`
- Dark active: `background: #f0e6d0; color: #13121a`
- Connector bar: `width: 12px; height: 2px; background: rgba(0,0,0,0.2)`
- Represents the minimum level filter — selecting "3" shows tasks level 3 and above

### 5.4 Sidebar Cards (surface)

Shared card shell used by all three sidebar panels:

```css
.sidebar-card {
  background: var(--color-bg-surface);
  border-radius: 14px;
  padding: 0.9rem;
  border: 1px solid var(--color-border);
  backdrop-filter: blur(4px);
}
```

---

## 6. Faction Task Cards

**Core principle:** Each faction's tasks are displayed using a completely different card archetype. The card type IS the faction identity. All cards share these common data points displayed somewhere logical within their design:

- Task name
- Faction name
- Point value
- Level requirement (always in a dark pill: `background: #1a1209; color: white; font-size: 7px; padding: 1px 6px; border-radius: 6px; text-transform: uppercase`)
- In dark mode: the dark pill inverts to `background: var(--faction-color); color: dark-bg`

Cards are arranged in a flex-wrap container (`display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-start`). They are NOT on a strict grid — varying heights and slight rotations are intentional and correct.

---

### 6.1 UA — Sticky Note

UA players have no faction identity yet. Their card is a sticky note — the most generic, temporary-feeling object.

**Structure:** Colored sticky note body with a push-pin at top-center. Bottom-right corner is clipped off (`clip-path`).

**Light mode:**
- Background: `#fef9c3` (yellow) or `#fce7f3` (pink) — varies per note, use either
- Pin: small circle, `background: #fbbf24` or `#f472b6`, `border: 2px solid rgba(0,0,0,0.25)`
- Text: `#1a1209`
- Slight rotation: `rotate(-2deg)` or `rotate(1.5deg)` alternating

**Dark mode:**
- Background: `#211d35` (purple-dark) or other deep tint
- Pin: `#a78bfa`
- Text: `#ddd6fe`
- Level pill: `background: #a78bfa; color: #1a1530`

**CSS clip for folded corner:**
```css
clip-path: polygon(0 0, 100% 0, 100% 88%, 88% 100%, 0 100%);
```

**Width:** ~122–130px. **Font:** Courier Prime.

---

### 6.2 Analog — Torn Field Journal Page

Analog players are documentarians. Their card looks like a page torn from a field notebook.

**Structure:** Slightly yellowed paper, red margin rule line on left, faint horizontal lines across the whole page, torn bottom edge via clip-path.

**Light mode:**
- Background: `#fffef5`
- Margin rule: `position: absolute; left: 20px; top: 0; bottom: 0; width: 1px; background: rgba(220,80,80,0.25)`
- Ruled lines: `repeating-linear-gradient(to bottom, transparent, transparent 17px, rgba(100,140,200,0.1) 17px, rgba(100,140,200,0.1) 18px)`
- Left padding: `1.4rem` (to clear the margin rule)
- Border: `1px solid rgba(0,0,0,0.08)`
- Torn bottom: `clip-path: polygon(0 0, 100% 0, 100% 90%, 92% 100%, 80% 95%, 68% 100%, 56% 93%, 44% 100%, 32% 94%, 20% 100%, 8% 94%, 0 100%)`

**Dark mode:**
- Background: `#1e1a10`
- Margin rule: `rgba(220,80,80,0.16)`
- Ruled lines: `rgba(100,140,200,0.05)`
- Text: `#e8dcc8`
- Level pill: `background: #e8dcc8; color: #1e1a10`

**Font:** Special Elite. **Width:** ~132–140px.

---

### 6.3 Gestalt — Collage / Layered Scraps

Gestalt is collective and organic. Their card looks like pieces of paper taped together — a collage.

**Structure:** Three stacked paper scraps at different rotations, plus a translucent tape strip across the top.

**Light mode:**
- Back scrap 2 (deepest): `background: #bbf7d0; transform: rotate(-4deg); height: ~20px` (mostly hidden)
- Back scrap 1: `background: #dcfce7; transform: rotate(3deg); height: ~30px` (partially visible)
- Front scrap (main): `background: #f0fdf4; transform: rotate(-2deg)` — contains all readable content
- Tape: `width: ~40px; height: 12px; background: rgba(250,230,130,0.7); transform: rotate(-1deg)` — positioned at top of front scrap
- All scraps: `border: 1.5px solid rgba(0,0,0,0.12)`
- Text color: `#14532d`

**Dark mode:**
- Scraps: `#091209`, `#0d1a10`, `#132318`
- Tape: `rgba(250,230,130,0.12)`
- Text: `#4ade80` (terminal green — Gestalt in dark looks alive)
- Level pill: `background: #4ade80; color: #091209`

**Container:** `position: relative; height: ~128px; width: ~138px` — scraps are absolutely positioned within.

---

### 6.4 S.N.I.D.E. — Newspaper Clipping

S.N.I.D.E. deals in information, mischief, and correspondence. Their card is a torn newspaper clipping.

**Structure:** Aged newsprint, masthead banner at top, headline, two-column body text, torn top and bottom edges. The faction name is spelled out in individual cutout letters (each letter in a monospace block).

**Light mode:**
- Background: `#f0e8d0` (aged newsprint)
- Top and bottom torn edges: `::before` and `::after` pseudo-elements using `clip-path` polygon to fake torn paper, colored `#F7F4EE` (page background)
- Masthead: `font-size: 6px; text-transform: uppercase; letter-spacing: 0.25em; color: #666; border-bottom: 1.5px solid #1a1209`
- Headline: Special Elite, 12px, `#1a1209`
- Faction letters: each letter in its own `<span>` with `background: #1a1209; color: white; font-family: Courier Prime; font-size: 9px; padding: 0 2px`
- Body text: Special Elite, 7.5px, `#444`, two-column with a 1px column rule
- Footer: points left, level pill right, separated by top border

**Dark mode:**
- Background: `#1a1710`
- Torn edge pseudo-elements use `#13121a` (page background)
- Masthead border: `#c49a3a`
- Headline: `#f0e6d0`
- Faction letters: `background: #c49a3a; color: #1a1710`
- Body text: `#7a6a50`

**Torn edge implementation:**
```css
.snide-card::before {
  content: '';
  position: absolute;
  top: -1px; left: 0; right: 0; height: 6px;
  background: var(--color-bg-page);
  clip-path: polygon(0% 0%, 4% 100%, 8% 20%, 12% 90%, 16% 10%, 20% 80%, 24% 0%, 28% 100%, 32% 15%, 36% 85%, 40% 5%, 44% 95%, 48% 20%, 52% 80%, 56% 0%, 60% 100%, 64% 15%, 68% 90%, 72% 5%, 76% 85%, 80% 0%, 84% 100%, 88% 20%, 92% 80%, 96% 10%, 100% 0%);
}
/* ::after mirrors this for bottom edge */
```

**Width:** ~148px. **Font:** Special Elite for card, Courier Prime for cutout letters.

---

### 6.5 Journeymen — Luggage Tag

Journeymen go places. Their card is a luggage tag hanging from a braided string.

**Structure:** A string + eyelet hole at top, then the tag body. Top of the tag has a repeating color stripe (hazard tape / trail marker feel).

**Light mode:**
- String: dashed vertical line + small circle eyelet, `border: 2px solid #8a6a20`
- Tag body: `background: #fef9ee; border: 2px solid #8a6a20`
- Top stripe: `repeating-linear-gradient(90deg, #c2410c 0, #c2410c 8px, #1a1209 8px, #1a1209 16px, #f59e0b 16px, #f59e0b 24px, #1a1209 24px, #1a1209 32px); height: 3px`
- Text: `#1a1209`
- Faction meta: `color: #8a6a20`
- Level pill: `background: #8a6a20; color: white`

**Dark mode:**
- String: `#c49a3a`
- Tag body: `background: #1c1610; border: 2px solid #c49a3a`
- Stripe: same pattern with `#1c1610` replacing white
- Text: `#f5e6c8`
- Faction meta: `#c49a3a`
- Level pill: `background: #c49a3a; color: #1c1610`

**Layout:** Card has `padding-top: 26px` to make room for the hanging string above it. String is `position: absolute; top: 0`.

**Width:** ~118px.

---

### 6.6 Singularity — Terminal Printout

Singularity is about the edge of what's knowable. Their card is a thermal printer / terminal output. This card works in both modes because it's already a dark card — in light mode it's a dark object on a light page.

**Structure:** Dark background, green terminal text, corner bracket decorations, sprocket hole rows at top and bottom (like thermal paper), scanline overlay, blinking cursor in header.

**Both modes (card itself is always dark):**
- Background: `#050f08`
- Border: `1px solid #1a3a22`
- Scanline overlay: `repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(74,222,128,0.015) 2px, rgba(74,222,128,0.015) 4px)`
- Corner brackets: `position: absolute` L-shaped borders, `border-color: #4ade80; width/height: 10px`
- Sprocket holes: row of 5 small rectangles, `background: rgba(10,26,14); border: 1px solid #1a3a22`
- Header: `font-size: 7px; color: #1f6b34; text-transform: uppercase; letter-spacing: 0.15em`
- Blinking cursor: `display: inline-block; width: 5px; height: 9px; background: #4ade80`
- Task name: `font-size: 9px; color: #4ade80` prefixed with `> `
- Data lines: `font-size: 8px; color: #1f6b34`
- Points: `color: #4ade80; font-size: 11px; font-weight: 700`
- Level pill: `border: 1px solid #4ade80; color: #4ade80` (outline style, no fill)

**Font:** Share Tech Mono throughout. **Width:** ~140px.

---

### 6.7 UA Masters — Newspaper / Gazette

UA Masters have been around. They've seen eras come and go. Their card is a proper newspaper clipping with a masthead, headline, dateline, and two-column layout — more composed than the SNIDE clipping, which is torn. UA Masters is a complete article.

**Distinction from SNIDE:**
- UA Masters: full newspaper format, deckled (not torn) edges using `clip-path: polygon(0 0, 98% 0, 100% 2%, 100% 98%, 98% 100%, 2% 100%, 0 98%, 0 2%)` — subtle corner snips
- SNIDE: torn top and bottom edges, column body, cutout ransom letters for faction name

**Light mode:**
- Background: `#f0ead8`
- Border: `1px solid rgba(0,0,0,0.12)`
- Masthead: `6px, uppercase, letter-spacing 0.2em, color: #555, border-bottom: 2px solid #1a1209`
- Headline: Special Elite, 13px, `#1a1209`
- Dateline: Special Elite, 7px italic, `#777`
- Two columns: Special Elite, 7.5px, `#333`, 1px column rule `rgba(0,0,0,0.12)`
- Footer: `border-top: 1px solid rgba(0,0,0,0.15)`

**Dark mode:**
- Background: `#1a1710`
- Masthead border: `#c49a3a`
- Headline: `#f0e6d0`
- Dateline: `#5a5030`
- Columns: `#7a6a50`
- Column rule: `rgba(255,255,255,0.05)`
- Level pill: `background: #c49a3a; color: #1a1710`

**Width:** ~148px.

---

## 7. Watercolor Background Component

Implement as `<WatercolorBackground />` — a full-bleed `position: absolute; inset: 0` SVG rendered behind all page content.

The SVG uses:
- `feGaussianBlur` with `stdDeviation="26-30"` for the main blobs
- `feTurbulence` + `feDisplacementMap` for paint-bleed edge distortion on some blobs
- Scattered small droplet circles with `stdDeviation="9"` blur
- All elements have explicit `opacity` values

This component accepts a `theme` prop (`"light"` | `"dark"`) and renders the appropriate color set.

The component is **purely presentational** — it takes no data props and renders identically on every page. Just drop it inside the page shell above the content layer.

```jsx
// Usage
<div className="page-shell">
  <WatercolorBackground theme={colorMode} />
  <Nav />
  <main className="page-body">
    {/* content */}
  </main>
</div>
```

---

## 8. Dark Mode Implementation

Dark mode is controlled by a `data-theme="dark"` attribute on `<html>` or the root app wrapper. All color values reference CSS custom properties (see Section 2.1) so the switch is automatic.

**Persistence:** Store preference in `localStorage` key `wz-theme`. Default to system preference via `prefers-color-scheme`.

**Toggle:** A simple toggle in the nav or settings. No animation required on the toggle itself, but a 150ms `transition: background-color, color` on the body is nice.

**Card dark mode:** Each faction card component should check the current theme and render the appropriate variant. Recommended: use a `useTheme()` hook that returns `'light' | 'dark'`, then conditionally apply dark-mode class or pass a `dark` boolean prop.

---

## 9. Component File Structure

```
frontend/src/
├── components/
│   ├── layout/
│   │   ├── Nav.jsx
│   │   ├── PageShell.jsx          # wraps WatercolorBackground + body
│   │   ├── Sidebar.jsx            # always-on right panel
│   │   └── WatercolorBackground.jsx
│   ├── ui/
│   │   ├── PageTitle.jsx          # underline bar treatment
│   │   ├── FilterStamps.jsx       # status rubber stamps
│   │   ├── FilterFactionTabs.jsx  # diagonal pennant tabs
│   │   ├── FilterLevelNodes.jsx   # connected circle nodes
│   │   └── LevelPill.jsx          # dark pill for level on cards
│   └── cards/
│       ├── TaskCardUA.jsx
│       ├── TaskCardAnalog.jsx
│       ├── TaskCardGestalt.jsx
│       ├── TaskCardSNIDE.jsx
│       ├── TaskCardJourneymen.jsx
│       ├── TaskCardSingularity.jsx
│       ├── TaskCardUAMasters.jsx
│       └── TaskCard.jsx           # router: picks correct component by faction
├── pages/
│   ├── Tasks.jsx
│   ├── TaskDetail.jsx
│   ├── Praxis.jsx
│   ├── PraxisDetail.jsx
│   ├── Players.jsx
│   ├── Profile.jsx
│   └── Updates.jsx
├── hooks/
│   └── useTheme.js
└── styles/
    ├── globals.css                # :root variables, dark mode overrides
    └── fonts.css                  # @import for Google Fonts
```

---

## 10. What NOT To Do

- **No rounded pills for status filters** — they must be rectangular rubber stamps
- **No standard card grid** — task cards are flex-wrap with intentional chaos, not a CSS grid
- **No uniform card shapes** — every faction is a different archetype, this is load-bearing
- **No sans-serif for body text** — Courier Prime is the base UI font, not Inter or Roboto
- **No solid color backgrounds on the page** — the watercolor SVG is always present
- **No hardcoded hex values in components** — always use CSS custom properties
- **No border-radius on stamps or SNIDE newspaper edges** — those elements must stay sharp
- **No dark mode by simply inverting colors** — each card has a specifically designed dark variant; do not auto-invert
- **Do not regularize card sizes** — the varied widths and slight rotations are intentional
- **Do not use emoji as icons** — use CSS or SVG

---

## 11. Quick Reference — Card by Faction

| Faction     | Card type          | Key visual detail                        | Font           |
|-------------|-------------------|------------------------------------------|----------------|
| UA          | Sticky note        | Push pin, clipped corner, pastel color   | Courier Prime  |
| Analog      | Field journal page | Red margin rule, horizontal lines, torn bottom | Special Elite |
| Gestalt     | Paper collage      | 3 layered scraps, scotch tape strip      | Courier Prime  |
| S.N.I.D.E. | Newspaper clipping | Torn edges, two columns, cutout letters  | Special Elite  |
| Journeymen  | Luggage tag        | Hanging string, eyelet, hazard stripe    | Courier Prime  |
| Singularity | Terminal printout  | Dark always, green text, sprocket holes  | Share Tech Mono|
| UA Masters  | Gazette article    | Corner-snipped edges, proper masthead    | Special Elite  |

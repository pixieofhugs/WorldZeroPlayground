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

## 2. Color System & CSS Variables

### 2.1 CSS Custom Properties — Complete Reference

All colors, spacing, and theming values are CSS custom properties. **Components must reference variables only — never hardcode hex values.** This is enforced so palette changes can be made in one place.

Add to `src/styles/globals.css`:

```css
:root {
  /* ── PAGE BACKGROUNDS ── */
  --color-bg-page:           #F7F4EE;
  --color-bg-surface:        rgba(255, 255, 255, 0.72);
  --color-bg-surface-alt:    #F0EDE6;
  --color-bg-surface-hover:  rgba(255, 255, 255, 0.85);
  --color-bg-overlay:        rgba(0, 0, 0, 0.45);

  /* ── TEXT ── */
  --color-text-primary:      #1a1209;
  --color-text-secondary:    #6b6050;
  --color-text-tertiary:     #9b8e7d;
  --color-text-disabled:     #c8c0b0;
  --color-text-on-dark:      #F7F4EE;
  --color-text-body:         #2a1e10;

  /* ── BORDERS ── */
  --color-border:            rgba(0, 0, 0, 0.07);
  --color-border-medium:     rgba(0, 0, 0, 0.12);
  --color-border-strong:     rgba(0, 0, 0, 0.20);
  --color-border-focus:      #14532d;

  /* ── INTERACTIVE SURFACES ── */
  --color-stamp-bg:          rgba(255, 255, 255, 0.6);
  --color-stamp-active-bg:   #1a1209;
  --color-stamp-active-text: #F7F4EE;
  --color-input-border:      rgba(0, 0, 0, 0.12);
  --color-input-border-focus: #14532d;

  /* ── NAV ── */
  --color-nav-bg:            rgba(247, 244, 238, 0.90);
  --color-nav-border:        rgba(0, 0, 0, 0.07);

  /* ── SIDEBAR CARDS ── */
  --color-sidebar-bg:        rgba(255, 255, 255, 0.72);
  --color-sidebar-border:    rgba(0, 0, 0, 0.06);
  --color-sidebar-alt:       #F0EDE6;

  /* ── ACCENT ── */
  --color-accent:            #be185d;
  --color-logo-underline:    linear-gradient(90deg, #4f46e5, #be185d, #f97316, #16a34a);

  /* ── PROPOSE / SUBMIT BUTTONS (ink stamp) ── */
  --color-btn-primary-bg:    #1a1209;
  --color-btn-primary-text:  #F7F4EE;
  --color-btn-outline-border: rgba(0, 0, 0, 0.15);
  --color-btn-outline-text:  #6b6050;

  /* ── FUNCTIONAL COLORS ── */
  --color-success:           #14532d;
  --color-success-light:     rgba(20, 83, 45, 0.10);
  --color-success-border:    rgba(20, 83, 45, 0.25);
  --color-danger:            #dc2626;
  --color-danger-light:      rgba(220, 38, 38, 0.07);
  --color-danger-border:     rgba(220, 38, 38, 0.25);
  --color-warning:           #b45309;
  --color-warning-light:     rgba(251, 191, 36, 0.15);
  --color-warning-border:    rgba(251, 191, 36, 0.30);

  /* ── FACTION COLORS — light mode ── */
  --faction-ua:              #6b6a7a;
  --faction-ua-light:        rgba(107, 106, 122, 0.10);
  --faction-ua-border:       rgba(107, 106, 122, 0.25);

  --faction-analog:          #15803d;
  --faction-analog-light:    rgba(21, 128, 61, 0.10);
  --faction-analog-border:   rgba(21, 128, 61, 0.25);

  --faction-gestalt:         #14532d;
  --faction-gestalt-light:   #f0fdf4;
  --faction-gestalt-border:  rgba(20, 83, 45, 0.20);

  --faction-snide:           #8a6a20;
  --faction-snide-light:     #fef9ee;
  --faction-snide-border:    #c49a3a;

  --faction-journeymen:      #c49a3a;
  --faction-journeymen-light: #fef9ee;
  --faction-journeymen-border: rgba(196, 154, 58, 0.40);

  --faction-singularity:     #7c3aed;
  --faction-singularity-light: rgba(124, 58, 237, 0.08);
  --faction-singularity-border: rgba(124, 58, 237, 0.25);

  --faction-ua-masters:      #555555;
  --faction-ua-masters-light: #f5f0e0;
  --faction-ua-masters-border: rgba(196, 154, 58, 0.40);

  /* ── WATERCOLOR SPLASH OPACITIES ── */
  --wc-opacity-blob:         0.30;
  --wc-opacity-drip:         0.22;
  --wc-opacity-drop:         0.18;

  /* ── FOE TAUNT NOTES ── */
  --color-taunt-ahead-bg:    #fef9ee;
  --color-taunt-ahead-border: #c49a3a;
  --color-taunt-ahead-text:  #8a6a20;
  --color-taunt-behind-bg:   #fff8f8;
  --color-taunt-behind-border: #dc2626;
  --color-taunt-behind-text: #9f1239;

  /* ── ERA ANNOUNCEMENT ── */
  --color-era-bg:            #1a1209;
  --color-era-text:          #F7F4EE;
  --color-era-accent:        #fbbf24;

  /* ── SINGULARITY CARD (always dark) ── */
  --color-sing-bg:           #050f08;
  --color-sing-border:       #1a3a22;
  --color-sing-text:         #4ade80;
  --color-sing-text-muted:   #1f6b34;

  /* ── PRAXIS BODY TEXT ── */
  --color-prose-text:        #2a1e10;
  --color-prose-drop-cap:    #14532d;

  /* ── TYPE SCALE ── */
  --text-xs:                 8px;
  --text-sm:                 9px;
  --text-base:               10px;
  --text-md:                 11px;
  --text-lg:                 12px;
  --text-xl:                 14px;
  --text-2xl:                18px;
  --text-3xl:                28px;
  --text-4xl:                34px;

  /* ── TITLE UNDERLINE COLORS (cycling order) ── */
  --underline-1:             #fbbf24;
  --underline-2:             #be185d;
  --underline-3:             #4f46e5;
  --underline-4:             #0e7490;
  --underline-5:             #16a34a;
  --underline-6:             #f97316;

  /* ── VOTE STAMP COLORS ── */
  --vote-1:                  #9b8e7d;
  --vote-2:                  #0e7490;
  --vote-3:                  #4f46e5;
  --vote-4:                  #be185d;
  --vote-5:                  #14532d;

  /* ── RADIUS ── */
  --radius-sm:               4px;
  --radius-md:               8px;
  --radius-lg:               12px;
  --radius-xl:               14px;
  --radius-full:             9999px;
}

/* ════════════════════════════════════════════
   DARK MODE OVERRIDES
   Applied via [data-theme="dark"] on <html>
   ════════════════════════════════════════════ */

[data-theme="dark"] {
  /* ── PAGE BACKGROUNDS ── */
  --color-bg-page:           #13121a;
  --color-bg-surface:        rgba(255, 255, 255, 0.04);
  --color-bg-surface-alt:    rgba(255, 255, 255, 0.06);
  --color-bg-surface-hover:  rgba(255, 255, 255, 0.08);
  --color-bg-overlay:        rgba(0, 0, 0, 0.65);

  /* ── TEXT ── */
  --color-text-primary:      #f0e6d0;
  --color-text-secondary:    #7a7060;
  --color-text-tertiary:     #4a4860;
  --color-text-disabled:     #3a3850;
  --color-text-on-dark:      #f0e6d0;
  --color-text-body:         #d4c8b0;

  /* ── BORDERS ── */
  --color-border:            rgba(255, 255, 255, 0.07);
  --color-border-medium:     rgba(255, 255, 255, 0.12);
  --color-border-strong:     rgba(255, 255, 255, 0.20);
  --color-border-focus:      #4ade80;

  /* ── INTERACTIVE SURFACES ── */
  --color-stamp-bg:          rgba(255, 255, 255, 0.05);
  --color-stamp-active-bg:   #f0e6d0;
  --color-stamp-active-text: #13121a;
  --color-input-border:      rgba(255, 255, 255, 0.15);
  --color-input-border-focus: #4ade80;

  /* ── NAV ── */
  --color-nav-bg:            rgba(19, 18, 26, 0.92);
  --color-nav-border:        rgba(255, 255, 255, 0.06);

  /* ── SIDEBAR CARDS ── */
  --color-sidebar-bg:        rgba(255, 255, 255, 0.04);
  --color-sidebar-border:    rgba(255, 255, 255, 0.07);
  --color-sidebar-alt:       rgba(255, 255, 255, 0.05);

  /* ── ACCENT ── */
  --color-accent:            #be185d;

  /* ── BUTTONS ── */
  --color-btn-primary-bg:    #f0e6d0;
  --color-btn-primary-text:  #13121a;
  --color-btn-outline-border: rgba(255, 255, 255, 0.15);
  --color-btn-outline-text:  #7a7060;

  /* ── FUNCTIONAL COLORS ── */
  --color-success:           #4ade80;
  --color-success-light:     rgba(74, 222, 128, 0.10);
  --color-success-border:    rgba(74, 222, 128, 0.25);
  --color-danger:            #f87171;
  --color-danger-light:      rgba(248, 113, 113, 0.08);
  --color-danger-border:     rgba(248, 113, 113, 0.25);
  --color-warning:           #fbbf24;
  --color-warning-light:     rgba(251, 191, 36, 0.12);
  --color-warning-border:    rgba(251, 191, 36, 0.25);

  /* ── FACTION COLORS — dark mode ── */
  --faction-ua:              #a78bfa;
  --faction-ua-light:        rgba(167, 139, 250, 0.12);
  --faction-ua-border:       rgba(167, 139, 250, 0.30);

  --faction-analog:          #15803d;
  --faction-analog-light:    rgba(21, 128, 61, 0.12);
  --faction-analog-border:   rgba(21, 128, 61, 0.30);

  --faction-gestalt:         #4ade80;
  --faction-gestalt-light:   rgba(74, 222, 128, 0.10);
  --faction-gestalt-border:  rgba(74, 222, 128, 0.25);

  --faction-snide:           #c49a3a;
  --faction-snide-light:     rgba(196, 154, 58, 0.10);
  --faction-snide-border:    rgba(196, 154, 58, 0.35);

  --faction-journeymen:      #c49a3a;
  --faction-journeymen-light: rgba(196, 154, 58, 0.10);
  --faction-journeymen-border: rgba(196, 154, 58, 0.35);

  --faction-singularity:     #4ade80;
  --faction-singularity-light: rgba(74, 222, 128, 0.08);
  --faction-singularity-border: rgba(74, 222, 128, 0.25);

  --faction-ua-masters:      #c49a3a;
  --faction-ua-masters-light: rgba(196, 154, 58, 0.10);
  --faction-ua-masters-border: rgba(196, 154, 58, 0.30);

  /* ── WATERCOLOR SPLASH OPACITIES (dimmer in dark) ── */
  --wc-opacity-blob:         0.15;
  --wc-opacity-drip:         0.11;
  --wc-opacity-drop:         0.08;

  /* ── FOE TAUNT NOTES — dark mode ── */
  --color-taunt-ahead-bg:    #1c1a10;
  --color-taunt-ahead-border: #c49a3a;
  --color-taunt-ahead-text:  #c49a3a;
  --color-taunt-behind-bg:   #1a1010;
  --color-taunt-behind-border: #f87171;
  --color-taunt-behind-text: #f87171;

  /* ── ERA ANNOUNCEMENT — unchanged (always dark) ── */
  --color-era-bg:            #1a1209;
  --color-era-text:          #F7F4EE;
  --color-era-accent:        #fbbf24;

  /* ── SINGULARITY CARD — unchanged (always dark) ── */
  --color-sing-bg:           #050f08;
  --color-sing-border:       #1a3a22;
  --color-sing-text:         #4ade80;
  --color-sing-text-muted:   #1f6b34;

  /* ── PRAXIS BODY TEXT ── */
  --color-prose-text:        #d4c8b0;
  --color-prose-drop-cap:    #4ade80;

  /* ── TITLE UNDERLINES — same in dark, they pop against dark bg ── */
  /* (no overrides needed — same cycling colors work in both modes) */

  /* ── VOTE STAMPS — same colors, they're always punchy ── */
  /* (no overrides needed) */
}
```

### 2.2 Faction Color Usage Pattern

Always reference faction colors via the CSS variable system. In React components, use a `getFactionVars(faction)` utility that returns the correct variable names:

```js
// src/utils/factionVars.js
export const FACTION_KEYS = {
  'ua':          'ua',
  'analog':      'analog',
  'gestalt':     'gestalt',
  'snide':       'snide',
  'journeymen':  'journeymen',
  'singularity': 'singularity',
  'ua-masters':  'ua-masters',
};

// Returns CSS var strings for a given faction
export function factionVar(faction, variant = '') {
  const key = FACTION_KEYS[faction] ?? 'ua';
  const suffix = variant ? `-${variant}` : '';
  return `var(--faction-${key}${suffix})`;
}

// Usage in component:
// style={{ color: factionVar('gestalt') }}
// style={{ background: factionVar('gestalt', 'light') }}
// style={{ border: `1px solid ${factionVar('gestalt', 'border')}` }}
```

Each faction exposes three variants:
- `--faction-{name}` — primary color (text, accents, badges)
- `--faction-{name}-light` — background tint (card backgrounds, highlight areas)
- `--faction-{name}-border` — border/ring color

### 2.3 Watercolor Splash Colors

Fixed per corner — same SVG positions on all pages, opacity controlled by CSS variables so dark mode dims them automatically.

| Corner       | Light mode colors             | Dark mode colors              |
|--------------|-------------------------------|-------------------------------|
| Top-left     | Blue `#60a5fa`, indigo `#818cf8`, violet `#c084fc` | `#4f46e5`, `#7c3aed`, `#be185d` |
| Top-right    | Orange `#fb923c`, amber `#fbbf24`, lime `#4ade80`  | `#b45309`, `#d97706`, `#16a34a` |
| Bottom-left  | Rose `#f43f5e`, pink `#e879f9`, orange `#fb923c`   | `#9f1239`, `#7c3aed`          |
| Bottom-right | Teal `#34d399`, cyan `#22d3ee`, sky `#60a5fa`      | `#0f766e`, `#0e7490`          |

Use `var(--wc-opacity-blob)`, `var(--wc-opacity-drip)`, `var(--wc-opacity-drop)` for SVG element opacities so dark mode automatically dims them.

### 2.4 Page Title Underline Colors

Use `var(--underline-1)` through `var(--underline-6)` cycling in order. Same values work in both modes — they're vivid enough to pop on dark backgrounds without adjustment.

### 2.5 Dark Mode — Page-by-Page Coverage

Every page and component must be verified against this checklist. The CSS variable system handles most cases automatically, but the following components have **manually specified dark variants** that must be implemented explicitly (they cannot be achieved by variable substitution alone):

| Component / Page | Dark mode approach | Notes |
|---|---|---|
| Nav | `var(--color-nav-bg)` + `var(--color-nav-border)` | Auto via variables |
| Watercolor background | Same SVG, `var(--wc-opacity-*)` | Opacity dims automatically |
| Page title underlines | No change needed | Same colors work on dark bg |
| Sidebar cards | `var(--color-sidebar-bg/border)` | Auto via variables |
| Stamp filters (status, level nodes) | `var(--color-stamp-*)` | Active state inverts: cream on dark |
| Faction filter tabs | Faction vars, `opacity: 0.35` inactive | Auto via faction vars |
| **UA card** | Dark: `#211d35` bg, `#a78bfa` pin, `#ddd6fe` text | Manually specified in Section 6.1 |
| **Analog card** | Dark: `#1e1a10` bg, `#e8dcc8` text, same rules | Manually specified in Section 6.2 |
| **Gestalt card** | Dark: `#132318 / #0d1a10 / #091209` scraps, `#4ade80` text | Manually specified in Section 6.3 |
| **S.N.I.D.E. card** | Dark: `#1a1710` newsprint, `#c49a3a` gold accents | Manually specified in Section 6.4 |
| **Journeymen card** | Dark: `#1c1610` leather, `#c49a3a` gold | Manually specified in Section 6.5 |
| **Singularity card** | Unchanged — always dark | No dark variant needed |
| **UA Masters card** | Dark: `#1a1710` bg, `#f0e6d0` headline, `#c49a3a` masthead rule | Manually specified in Section 6.7 |
| Profile header | Uses faction card archetype — inherits card dark spec | No additional work |
| Level track | `var(--faction-*)` for done nodes, `rgba(255,255,255,0.04)` locked | Auto via variables |
| Praxis body text | `var(--color-prose-text)`, `var(--color-prose-drop-cap)` | Auto via variables |
| Vote stamp buttons | Same colors — vivid enough for dark | No override needed |
| Voter tiles | Faction gradients work on dark bg | No override needed |
| Flag block | `var(--color-danger-*)` | Auto via variables |
| **Foe taunt note** | Dark: `var(--color-taunt-ahead-*)` / `var(--color-taunt-behind-*)` | Dark bg, gold/red borders |
| **Era announcement** | Unchanged — always dark bg `#1a1209` | No dark variant needed |
| Praxis gallery cards | `var(--color-bg-surface)` | Auto via variables |
| Podium cards | Faction card archetype — inherits card dark spec | No additional work |
| Players table | `var(--color-bg-surface)` container, `var(--color-border)` rows | Auto via variables |
| Faction standings bars | Faction primary colors | Auto via faction vars |
| Feed items | `var(--color-bg-surface)` + type-specific border | Auto via variables |
| Collab invite field | `var(--color-border)` | Auto |
| Form fields (title, RTE, textarea) | `var(--color-input-border)` focus → `var(--color-input-border-focus)` | Auto via variables |
| Media upload zone | `var(--color-border-medium)` dashed, hover → `var(--faction-*-border)` | Auto |
| Meta task checkboxes | `var(--faction-*)` checked bg | Auto via faction vars |
| Collab / duel note strip | `var(--faction-*-light)` bg, `var(--faction-*-border)` border | Auto via faction vars |
| Submit / Propose buttons | `var(--color-btn-primary-*)` | Inverts to cream-on-dark |
| Tips cards (editorial) | `var(--color-bg-surface)` | Auto |
| Task preview strip | `var(--faction-*-light)` bg, `var(--faction-*-border)` | Auto |

**Implementation rule:** If a value doesn't appear in the variables list and you find yourself hardcoding a hex value, stop and add it to `:root` first. The only exception is the manually-specified faction card dark backgrounds in Section 6, which use fixed hex values because they represent specific paper/material colors rather than semantic UI colors.


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

---

## 12. Praxis Submission Page

### 12.1 Page Layout

Same shell as all logged-in pages (nav + watercolor bg + main/sidebar grid). The sidebar is identical to the tasks page — character card, active tasks, recent activity, propose button — with one addition: an "Other praxis for this task" panel sits between active tasks and recent activity, showing up to 3 other submissions for the same task with player avatar orbs and their score.

Breadcrumb above the title: `Tasks › [faction dot] [Task Name] › Praxis` — task name links back to task detail, faction dot is a 7px circle in faction color.

### 12.2 Byline Block

The byline block uses the **author's faction card aesthetic** as its visual framing. This is load-bearing — the submission is signed with the author's visual identity before you read their name.

- Gestalt author → collage scrap background with tape strip
- Analog author → notebook paper texture
- SNIDE author → aged newsprint with masthead strip
- etc. — mirror the card archetypes from Section 6

Contents: avatar orb (faction gradient, 42px), display name (Lora italic, faction color), faction + level + era meta (9px uppercase), collaboration tags if applicable. Right side: average vote score (large, Lora), vote count (9px muted).

### 12.3 Praxis Title

Lora italic, 30px. Followed immediately by a full-width rainbow underline bar — NOT per-letter (user-generated titles are unpredictable length). The bar is a flex row of equal-width segments in the cycling color order: `#fbbf24 → #be185d → #4f46e5 → #0e7490 → #16a34a → #f97316` repeating. 8 segments total, 4px height.

### 12.4 Task Context Strip

A slim horizontal bar below the title linking the submission back to its task:
- Left border: 4px solid in faction color
- Border-radius: 0 8px 8px 0 (sharp left, rounded right)
- Background: `rgba(255,255,255,0.6)` with blur
- Contents: "Completing task" label (8px muted) + task name (12px bold) + points + level pill

### 12.5 Media Gallery

- Main image/video: full width, 16:9 aspect ratio, rounded 8px
- Image counter badge: bottom-right, `rgba(0,0,0,0.5)` pill
- Filename label: bottom-left, monospace 8px, muted
- Thumbnail strip below: flex row of equal-width thumbs, 4:3 aspect ratio, 5px rounded
- Active thumb: 2px solid faction-color border
- Overflow thumb: shows "+N more" in muted style
- Video thumbs: distinguish with a play icon overlay

### 12.6 Body Text

- Font: Lora (not Courier Prime — this is prose, not UI)
- Size: 15px, line-height: 1.75
- Color: `#2a1e10` (slightly warmer than pure black)
- **Drop cap on first letter:** float left, 58px, faction color, Lora bold
- Paragraphs separated by 0.9rem
- Italic emphasis (`<em>`) renders in faction color

### 12.7 Collaboration Strip

Shown only when the praxis has collaborators or is a duel result.

- Background: `rgba(255,255,255,0.6)` with blur, rounded 10px
- Left: "Completed with" label + overlapping avatar orbs (each 26px, -8px margin-left for overlap) + player names
- Right: badge pill — "Collab · Both earn pts" or "Duel · Winner takes pts"

---

## 13. Voting System (Praxis Page)

### 13.1 Vote Input — Stamp Buttons

Replaces star rating. Five rectangular stamp-style buttons numbered 1–5 with a word label below each. NO star iconography anywhere.

**Labels:**
| Value | Word |
|-------|------|
| 1 | a start |
| 2 | solid |
| 3 | good |
| 4 | excellent |
| 5 | legendary |

**Button appearance:**
- 44×44px square
- Border: 2.5px solid in value color (see below)
- Font: Courier Prime, 18px, 900 weight
- Background: `rgba(255,255,255,0.8)`
- Inner dashed border inset on selected state
- Word label: 7px uppercase, max-width 44px

**Value colors (border + selected background):**
| Value | Color |
|-------|-------|
| 1 | `#9b8e7d` (muted — intentionally low energy) |
| 2 | `#0e7490` (teal) |
| 3 | `#4f46e5` (indigo) |
| 4 | `#be185d` (rose) |
| 5 | `#14532d` (deep green — reserved for legendary) |

**Selected state:** background becomes the value color, text white, inner dashed border `rgba(255,255,255,0.25)`.

**Below the stamps:**
- "Submit vote" button: rectangular stamp style (matches status filters), `background: #1a1209`
- Inline text: "Voting X pts · costs X of your votes" — makes the vote economy visible at decision time
- Player's remaining vote count shown in the sublabel above stamps

**Vote economy reminder:** players have 100 + 2× their total score in votes. This depletes as they vote. Surface it here without making it anxious — matter of fact.

### 13.2 Vote Results — Voter Tile Grid

Replaces star average display. Shows every voter as a tile with their avatar and their vote value.

**Tile structure (per voter):**
- Avatar: 48×48px, border-radius 4px (slightly square — distinguishes from orbs elsewhere), faction gradient background
- Points badge: 18px circle, top-right corner, faction color background, white text, 1.5px white border
- Name: 8px, muted, max-width 52px, truncated with ellipsis

**Grid:** `flex-wrap: wrap; gap: 0.5rem` — not a strict grid, tiles flow naturally.

**Overflow:** if more than ~12 voters, show a "+N more" tile in the same size with dashed border and muted text. Clicking expands (or links to a full voter list page).

**Header row above grid:**
- Left: "Points earned from votes" (9px label) + total in Lora italic 26px + "points from votes" suffix
- Right: voter count (9px muted uppercase)

### 13.3 Flag Block

Flagging is a first-class UI element, not a footer link. Placed below the voter grid.

**Structure:**
- Background: `rgba(255,255,255,0.6)`, border `1.5px solid rgba(0,0,0,0.08)`, rounded 10px
- Left: circular icon (32px, red-tinted border, ⚑ character at 50% red opacity)
- Middle: "Flag this praxis" title (10px bold, muted) + explanation text (8px): "If this content is inappropriate, harmful, or violates the rules, flag it for admin review. Flagged praxis loses its points until reviewed."
- Right: "⚑ Flag" button — outline style, red-tinted border and text at low opacity, intensifies on hover

**Confirmation:** clicking Flag opens a confirmation modal (not inline) before submitting. The modal should restate the consequence: the author loses base task points AND vote points until an admin reviews. This prevents frivolous flagging.

**Flag button colors:**
- Default: `color: rgba(220,38,38,0.6); border-color: rgba(220,38,38,0.25)`
- Hover: `color: #dc2626; border-color: rgba(220,38,38,0.5); background: rgba(220,38,38,0.05)`

---

---

## 14. Player Profile Page

### 14.1 Page Layout

Same shell as all logged-in pages. Sidebar is identical to all other pages. Main column has four sections stacked vertically: profile header, level track, praxis grid, friends/foes row.

### 14.2 Profile Header — Faction-Framed

The profile header uses the **subject player's faction card aesthetic** as its visual container. This is the same principle as the praxis byline block — the faction identity follows the player everywhere they appear.

- Gestalt player → collage scrap layers with tape strip
- Analog player → notebook paper with margin rule, torn bottom edge
- S.N.I.D.E. player → manila folder with dossier header
- Journeymen player → large luggage tag framing
- Singularity player → terminal black with green text and corner brackets
- UA Masters player → aged newsprint with masthead
- UA player → oversized sticky note

Implementation: the profile header is a wrapper component that accepts `faction` as a prop and renders the appropriate background treatment behind a consistent content layout.

**Header content (always):**
- Avatar orb: 80px circle, faction gradient, 3px white border, 3px faction-color outer ring
- Level badge: pill below avatar, `background: faction-color; color: white; 8px uppercase`
- Action buttons (other player's profile only): Friend, Foe, DM — stacked below level badge, full width of avatar column
  - Friend: `background: faction-color; color: white`
  - Foe: outline style, `border: 1.5px solid #dc2626; color: #dc2626`
  - DM: outline style, `border: 1.5px solid faction-color; color: faction-color`
- Own profile: "Edit Profile" button replaces action buttons
- Display name: Lora italic, 26px, faction color
- Username: `@handle · joined Era X`, 10px muted
- Faction banner: diagonal pennant clip-path (same as filter tabs), faction color
- Member since: 8px muted
- Bio: Special Elite 11px, 1.6 line-height, left border 3px in faction color at 30% opacity
- Stat strip: Era score, All-time score, Praxis count, Votes remaining, Friends count, Foes count — each in a small rounded card `rgba(255,255,255,0.6)`

### 14.3 Level Track

Full-width horizontal track showing all 9 levels (0–8).

**Node states:**
- Completed: `background: faction-color; border-color: faction-color; color: white`
- Current: `background: light-faction-tint; border: 3px solid faction-color; color: faction-color; box-shadow: 0 0 0 3px rgba(faction, 0.2)` — shows current point total inside
- Locked: `background: rgba(255,255,255,0.5); border-color: rgba(0,0,0,0.12); color: #c8c0b0` — shows point threshold inside

**Connectors:** 3px height, faction-color for completed segments, `rgba(0,0,0,0.1)` for locked.

**Below track:** progress bar toward next level. `flex` row: "Lvl N → N+1" label, bar track, "X / Y pts" in faction color bold.

**Top right of section:** "Next unlock at Level N: [unlock description]" in 9px italic faction color.

**Section background:** `rgba(255,255,255,0.65)` frosted card, rounded 12px.

### 14.4 Praxis Grid

3-column grid of praxis cards. Each card:
- Thumbnail: 4:3 aspect ratio, placeholder or actual image, dark gradient bg
- Points badge: bottom-right of thumbnail, `rgba(0,0,0,0.55)` pill, white text, 7px
- Card body: task name (9px bold), task it belongs to (8px muted), average vote score (7px faction color bold)
- Voter mini-tiles: row of 14×14px square avatars (faction gradient), "+N" overflow tile

Last card in grid is a "+N more praxis" overflow card — dashed border, centered count, links to full praxis list.

Header: "Praxis — N total" left, "View all →" right in `#4f46e5` with dashed underline.

### 14.5 Friends / Foes

Two-column row below the praxis grid.

Each column: label ("Friends · N" or "Foes · N"), list of relation items, "See all →" link or explanatory note.

**Relation item:**
- 24px avatar orb (faction gradient)
- Display name (10px) + faction · level (7px muted)
- Score delta right-aligned: "+N pts ahead" in `#14532d` (green) or "−N pts behind" in `#dc2626` (red)

**Foes panel note:** "Mutual foes see each other's score delta after every completed task." — 8px italic muted. This surfaces the mechanic without requiring a tooltip.

**Score delta** only shows if the relationship is mutual (both have added each other). One-sided friend/foe requests show "pending" instead.

### 14.6 Own Profile vs. Other Profile

| Element | Own profile | Other player's profile |
|---------|-------------|----------------------|
| Action buttons | "Edit Profile" | Friend / Foe / DM |
| Bio | Editable inline (click to edit) | Read-only |
| Display name | Editable inline | Read-only |
| Active tasks sidebar | Your tasks | Your tasks (unchanged — sidebar is always yours) |
| Level track | Shows your unlocks | Shows their unlocks |
| Praxis grid | Your praxis | Their praxis |

---

---

## 15. Task Detail Page

### 15.1 Page Layout

Same shell as all logged-in pages. Two-column grid: main content left, 256px sidebar right.

Sidebar panels (top to bottom): character card, "who else is on this task" panel, active tasks panel, recent activity, propose button.

### 15.2 Breadcrumb

`Tasks › [Task Name]` — "Tasks" links back to task list. Task name is plain text (current page).

### 15.3 Task Hero Block — Faction Expanded Card

The task description block IS the faction card archetype expanded to full width. The same visual logic that governs a small task card governs the full task hero — just larger.

- Analog task → full journal page with spiral binding holes (left edge), red margin rule, horizontal lines, torn bottom edge
- Gestalt task → large collage with multiple paper layers and tape
- S.N.I.D.E. task → full newspaper clipping with masthead, column rule, torn edges
- Journeymen task → oversized luggage tag
- Singularity task → full terminal window, dark bg, green text, corner brackets
- UA task → large sticky note
- UA Masters task → full gazette article

**Contents (always present regardless of faction):**
- Faction tab (diagonal pennant) + status pill ("Active") + level pill
- Task title: faction-appropriate font, ~28px
- Stats strip: Base pts · Completed count. **No "in progress" count. No average vote score.**
- Task description: faction-appropriate font, 13px, 1.7 line-height
- Task description is hypertext — can embed images and video inline

### 15.4 Sign-Up Block

The most important action on the page. Gets the most visual weight.

**Step 1 — Mode selector:** Three stamp-style buttons side by side (same rectangular stamp aesthetic as status filters):

| Option | Icon | Description |
|--------|------|-------------|
| Solo | ◎ | Just you. All points are yours. |
| Collaboration | ⬡ | Invite others. Everyone earns full points. |
| Duel | ⚔ | Challenge one player. Winner takes the points. |

Selected state: `background: #1a1209; color: #F7F4EE` with inner dashed border. Unselected: `background: rgba(255,255,255,0.7); border: 2.5px solid #1a1209`.

**Step 2 — Conditional fields:**
- Solo: no additional fields
- Collaboration: inline player invite field appears below selector. Input + "+ Add" button. Shows invited players as dismissible pills. If invited player's task list is full, show inline error.
- Duel: same as collab but limited to one player. Label changes to "Challenge".

**Step 3 — Sign up button:**
- Full width, faction color background (not generic black — this is the faction's action)
- Font: Courier Prime, 13px, bold, uppercase, tracking 0.15em
- Inner dashed border (same stamp pattern)
- Subtitle text inside button: "· earn up to N pts + votes" in lighter weight

**Below button:** two lines of context — slot count remaining ("You have N of 20 task slots open") and level eligibility ("Level N required ✓" or "Level N required — you are level N ✗").

**Already signed up state:** button replaced by a confirmation badge: `background: rgba(faction, 0.1); border: 1.5px solid rgba(faction, 0.25)` with checkmark and "You're on this task" text. Collab/duel partners shown as small orbs.

### 15.5 Meta Tasks

Shown below the sign-up block. Always visible even if not yet in the backend — treat as display-only until implemented.

**Section container:** frosted card, `rgba(255,255,255,0.65)`, rounded 10px.

**Each meta task item:**
- Faction color dot (8px circle) — meta tasks belong to specific factions
- Name (10px bold)
- Description (8px muted, flex: 2)
- Bonus: "+N%" or "+N flat" in faction color, bold

**Locked meta tasks** (level too low): `opacity: 0.45` on the entire row + locked level pill appended.

**Implementation note:** meta tasks are modifiers applied at praxis submission time, not at sign-up. The UI here is informational — it shows what bonuses are available for this task before you commit. The submission form will have a separate step for attaching applicable meta tasks.

### 15.6 Praxis Gallery

Grid of completed praxis submissions for this task. Two-column layout (not three — more room for excerpts, which are important for inspiring sign-ups).

**Sort options:** "Top rated" (default) · "Recent" — displayed as small stamp-style toggles top-right.

**Each praxis card:**
- Thumbnail: 16:9 or 4:3 depending on content, dark gradient bg with emoji placeholder, points badge top-right, media type label bottom-left
- Author row: 18px orb + display name + average vote score right-aligned
- Title: Lora italic, 11px
- Excerpt: 9px muted, ~2 lines, encourages click-through
- Footer: voter mini-tiles (14px square, faction gradient) + "N pts earned" right

**Below grid:** "View all N praxis →" centered link in `#4f46e5`.

### 15.7 "Who Else Is On This Task" Sidebar Panel

Replaces the "other praxis for this task" panel from the praxis detail page. Shows players currently signed up.

- Header: "N players in progress" (N = total signed up count)
- List: up to 4 players shown — friends and foes prioritized over strangers
- Each item: 22px avatar orb + display name + relationship badge ("Friend" in green, "Foe" in red, "—" for neutral)
- "+ N more →" overflow link

This panel creates social pressure and collaboration opportunities simultaneously. A foe on the same task is competitive motivation. A friend is a potential collab invite.

---

---

## 16. Leaderboard / Players Page

### 16.1 Naming

This page is called **"Players"** everywhere — nav link, page title, breadcrumbs. Never "Leaderboard" in the UI.

### 16.2 Page Title

"Player" with per-letter underline bars in cycling faction colors. Eyebrow: "Era III · [Era Name]".

### 16.3 Podium — Top 3

The top 3 players get a podium treatment above the main table. Three columns arranged: 2nd | 1st | 3rd, with 1st place visually largest.

**Each podium slot:**
- Card using the player's faction card archetype (tape strip, collage layers, etc.) — same visual logic as task cards and profile headers
- Faction diagonal pennant tab inside card
- Avatar orb with faction gradient + faction-color outer ring
- Rank badge: circle top-right, faction-color for 1st/2nd/3rd specific colors: `#f59e0b` (gold), `#c49a3a` (silver), `#888` (bronze)
- Display name in Lora italic, faction color
- Era score: large, bold, Lora, faction color
- "era pts" label beneath, 7px muted
- Praxis count: 8px muted

**Platform blocks** below each card (no border-top):
- Heights: 1st = 52px, 2nd = 36px, 3rd = 24px
- Background: very light tint of rank color
- Large faded rank numeral as background texture

**1st place** is additionally larger: card width 160px vs 140px for 2nd/3rd, avatar 64px vs 52px, score font 28px vs 22px, border 3px vs 2px, border-color `#fbbf24`.

### 16.4 Your Rank Strip

Shown between podium and the main table. Always present regardless of your actual rank — pulls your row out and displays it in a highlighted strip so you immediately know where you stand.

- Background: `rgba(79,70,229,0.08)` (your faction color ideally, but indigo as default)
- Border: `2px solid rgba(79,70,229,0.25)`
- Left: rank number (large, Lora, faction color) + your avatar orb + name + faction/level
- Right: score value + "era pts" label + rank delta ("↑ N places this week")

### 16.5 Score Toggle + Faction Filter

Two controls in a flex row:

**Score toggle** (left): Era III | All-time — rectangular stamp buttons, same as status filters. Switches the score column and re-sorts the table.

**Faction filter** (right): diagonal pennant tabs, same as task page. "All" is active by default. Filters table to show only that faction's players.

### 16.6 Main Table

Contained in a frosted card (`rgba(255,255,255,0.65)`, rounded 12px, backdrop blur).

**Columns:** `#` · Player · Faction · Level · Praxis · Score

**Header row:** 8px uppercase, muted, `letter-spacing: 0.15em`. Separated from body by `2px solid #1a1209`.

**Each row:**
- Left edge accent: 3px vertical bar in the player's faction color (absolute positioned, `top: 20%; bottom: 20%`)
- Rank: Lora serif, 13px bold. Ranks 4+ are muted color; your rank is faction color
- Player cell: 32px orb + display name (Lora italic 12px) + "Joined Era X · N days" (7px muted)
- Faction: 8px faction color dot + faction name (8px uppercase muted)
- Level: dark pill (`background: #1a1209`)
- Praxis: centered, 11px bold
- Score: right-aligned. Era score 15px bold. Below it: all-time score in 8px muted (or rank delta for your row)
- Row separator: `1px dashed rgba(0,0,0,0.07)`
- Hover: `background: rgba(255,255,255,0.55)`
- Your row: `background: rgba(faction,0.06)`, all text in faction color, "You · Level N" as subtitle

**Gap indicator:** When your row is surfaced out of natural order, a separator row spans all columns showing `· · · N players · · ·` with flanking horizontal rules. This communicates the contextual jump without confusion.

**Pagination:** "Load more players →" link at bottom of card, centered, indigo with dashed underline.

### 16.7 Sidebar — Faction Standings Panel

Unique to the Players page. Replaces the "other praxis" or "who's on this task" panel.

Shows collective score per faction for the current era — each faction as a row with:
- Faction color pip (10px circle)
- Faction name (9px bold uppercase)
- Horizontal bar (proportional to highest faction score = 100% width)
- Total faction score (9px bold right-aligned)

Bar colors match faction colors. This panel gives the leaderboard a second axis: individual competition AND faction competition. Useful for players deciding which faction to join at Level 3.

Standard active tasks panel and recent activity panel below it. Propose button at bottom.

---

---

## 17. Updates Feed Page

### 17.1 Page Layout

Same shell as all logged-in pages. Two-column grid: feed stream left, 256px sidebar right.

Sidebar panels (top to bottom): character card, pending requests panel (unique to this page), active tasks panel, recent global activity panel, propose button.

### 17.2 Feed Filters

Stamp-style rectangular pills (same aesthetic as status filters) in a horizontal row above the feed.

| Filter | Description |
|--------|-------------|
| All | Everything, reverse chronological |
| Friends | Activity from players you've friended |
| Foes | Foe taunts only |
| Your stuff | Votes/comments on your praxis, collab invites, duel challenges |
| Global | Site-wide events, new tasks, era announcements |
| Requests | Pending friend/foe requests |

The **Requests pill** gets a colored badge count (red background, white text) when there are pending requests — the only pill with a colored count, because requests genuinely need action.

### 17.3 Feed Item Types

All items share a base card: `rgba(255,255,255,0.68)` frosted, `border-radius: 10px`, `backdrop-filter: blur(3px)`. Each type has a **4px left-edge accent bar** and a **type label pill** top-right.

| Type | Left bar color | Label color | Notes |
|------|---------------|-------------|-------|
| Friend activity | `#14532d` green | `#14532d` | Warm |
| Global | `#4f46e5` indigo | `#4f46e5` | System/admin |
| Your stuff | `#be185d` rose | `#be185d` | Ego feed |
| Duel challenge | `rgba(220,38,38,0.2)` border tint | `#dc2626` with ⚔ | Card bg: `rgba(255,248,248,0.7)` |
| Foe taunt | No base card — see below | — | Special treatment |
| Era announcement | No left bar — see below | — | Special treatment |

**Date separators** between temporal groups: flex row with flanking `1px rgba(0,0,0,0.08)` lines and "Today" / "Yesterday" / date label in 8px muted uppercase.

### 17.4 Feed Item Content Patterns

**Player action items** (completed task, signed up, voted):
- Player orb (28px) + bold player name in faction color + action text + time
- Preview strip below: faction dot + task/praxis name + metadata + "→" arrow
- Clicking preview strip navigates to the task or praxis

**Praxis completion items** (friend completed, global completion):
- Same header
- Praxis card below: thumbnail (52×40px) + italic Lora title + task name + voter mini-tiles + pts earned so far

**Vote notification** (someone voted on your praxis):
- Header as above
- Vote row: stamp-style number badge + "on [praxis title]" + "+N pts" right-aligned

**Collab invite** (actionable):
- Header
- Task preview strip
- Accept / Decline buttons inline below. Show remaining task slots as inline hint text.

**Duel challenge** (actionable):
- Same pattern as collab invite
- Red "Accept duel" button, neutral "Decline" button
- Preview strip has ⚔ instead of →, red tint

### 17.5 Foe Taunt — Special Treatment

Foe taunts do NOT use the base card. They are rendered as **physical notes** — aged paper, tape at top, torn bottom edge.

**"Watch your back"** (foe passed you in score):
- Paper: `background: #fef9ee; border: 1.5px solid #c49a3a`
- Tape strip: `rgba(250,230,130,0.7)` centered at top, `width: 48px; height: 13px`
- Torn bottom edge: `::after` pseudo-element with jagged clip-path in page background color
- Font: Special Elite throughout
- Header: small foe orb + "From your foe · [Name]" in `#8a6a20` + timestamp in `#c49a3a`
- Message: italic, 12px — auto-generated: `"You might want to watch your back, [player]. Things just got interesting."`
- Footer: task completed left + score delta right in `#dc2626` ("Foe now leads by N pts")

**"Catch up"** (you're still ahead):
- Paper: `background: #fff8f8; border: 1.5px solid #dc2626`
- Same structure but red-tinted
- Message: `"Still trailing. I'll catch up eventually, [player]. Eventually."`
- Footer: score delta in `#14532d` ("You lead by N pts")

The taunt messages are game-generated strings. Admins should be able to define a pool of taunt templates per faction — S.N.I.D.E. taunts should feel different from Journeymen taunts.

### 17.6 Era Announcement — Special Treatment

Full-width dark card. Only item type with `background: #1a1209`.

- 4px left bar in `#fbbf24`
- Gold circular icon (36px, `background: #fbbf24`) with ◎ symbol
- "ERA ANNOUNCEMENT · ADMIN" label in `#fbbf24`, 8px uppercase
- Title: Lora italic, 18px, `#F7F4EE`
- Body: 10px, `rgba(255,255,255,0.65)`, 1.55 line-height
- Action buttons below: primary (`background: #fbbf24; color: #1a1209`) + secondary (outline, muted)

Era announcements are always pinned to the top of the feed on the day they're posted, regardless of other activity.

### 17.7 Pending Requests Sidebar Panel

Unique to the Updates page. Sits between the character card and the active tasks panel.

Each request item:
- 24px player orb
- Display name + relationship type ("Friend request" in green, "Foe request" in red)
- Accept button (`background: #14532d`) + Decline button (✕, outline)

If no pending requests: panel is hidden entirely (don't show an empty state).

### 17.8 Recent Global Activity Sidebar Panel

On the Updates page, the "recent activity" sidebar panel shows **global** activity (not personal) — it's a compact running ticker of what's happening site-wide while you read your personal feed.

Same format as on other pages: player name in faction color + action + timestamp. Up to 3 items.

---

---

## 18. Submit Proof Form

### 18.1 Layout — No Sidebar

This is the **only logged-in page without the right-hand sidebar panels**. The user is writing. Give them the full width.

Layout: single centered column, max-width ~720px, with generous padding. The watercolor background is still present. Nav is still present. No sidebar, no active tasks panel, no character card, no activity feed.

The breadcrumb reads: `Tasks › [Task Name] › Submit Proof`

### 18.2 Task Context Header

The form opens with a faction-framed task context block — same collage/journal/dossier aesthetic as the faction card for the task's faction. This anchors the writer to what they're proving before they start.

**Contents:**
- "Proving completion of" eyebrow (8px uppercase muted)
- Task name (Special Elite or faction-appropriate font, 18px, faction color)
- Faction + base pts + level pills
- If collaboration: right side shows collaborator orbs + names
- If duel: right side shows opponent orb + "Duel — winner takes all"

### 18.3 Form Sections

Each section is a frosted card (`rgba(255,255,255,0.7)`, `border-radius: 12px`, `backdrop-filter: blur(3px)`). Sections stack vertically with `gap: 1.1rem`.

**Section header pattern:** 9px uppercase label left + 8px italic hint text right (muted, non-uppercase).

#### Section 1 — Proof Title

- Input: Lora italic, 24px, transparent background, no border except bottom (2px, `rgba(0,0,0,0.12)`)
- Focus state: bottom border transitions to faction color
- Placeholder: "What did you do?" in `#c8c0b0` italic
- Below input: full-width rainbow underline bars (same 8-segment system as page titles, `opacity: 0.6`, `height: 3px`) — appear as soon as text is present

#### Section 2 — The Proof (Rich Text)

- Minimal toolbar: Bold, Italic, Underline | H1, Quote | Bullet, Link | Insert Image, Insert Video
- Toolbar buttons: 28×28px, `border: 1.5px solid rgba(0,0,0,0.12)`, `border-radius: 3px`
- Active/pressed: `background: #1a1209; color: white`
- Separator bars: `1px rgba(0,0,0,0.1)`, 28px height
- Text area: Lora, 14px, `color: #2a1e10`, `line-height: 1.75`, `min-height: 180px`, no border, full width
- Placeholder: italic, `#c8c0b0`
- Word count: 8px muted, right-aligned, below textarea. Label: "N words · no limit"
- **No character limit. No word limit.** The culture of long-form proof posts should be encouraged.

#### Section 3 — Media

Three media type tabs above the grid (Photos / Video / Audio) using stamp-style buttons — same rectangular stamp aesthetic, no border-radius.

**Media grid:** 3 columns, `gap: 0.6rem`

**Uploaded tile:**
- 4:3 aspect ratio, `border-radius: 6px`, `border: 1.5px solid rgba(0,0,0,0.1)`
- "Main" badge: top-left, `background: faction-color; color: white; 7px uppercase` — first uploaded image gets this by default
- File type + size badge: bottom-left, `rgba(0,0,0,0.5)` pill, 7px, white
- Hover overlay: `rgba(0,0,0,0.35)` with "Remove" and "Set main" action pills
- Action pills: `background: rgba(255,255,255,0.9); color: #1a1209; 7px uppercase; border-radius: 3px`

**Upload zone (always last):**
- Same 4:3 grid cell
- `border: 2px dashed rgba(0,0,0,0.15)`, `border-radius: 6px`
- ⊕ icon + "Drop files here / or click to upload"
- Hover: `border-color: faction-color; background: rgba(faction, 0.04)`

Accepted formats note below grid: 8px muted. Max 50mb per file.

Multiple upload zones are NOT shown — just one. As files are uploaded, they fill the grid left-to-right and the upload zone stays at the end.

#### Section 4 — Meta Tasks

Only shown if the player has applicable meta tasks available for this task.

**Each meta task row:**
- Checkbox (18px, `border-radius: 3px`) — checked state: `background: faction-color; color: white; ✓`
- Meta task name (10px bold) + description (8px muted)
- Bonus right-aligned: `+N%` or `+N pts` in faction color bold

Below the list: if any meta tasks are checked, show a caveat: "You're claiming [Meta Task Name]. Your proof must demonstrate this — voters can dispute it." — 8px italic muted.

#### Section 5 — Collaboration Note (conditional)

Shown only for collab or duel submissions.

- `background: rgba(faction, 0.07); border: 1px solid rgba(faction, 0.15); border-radius: 8px`
- ⬡ icon + explanatory text
- For collab: "Both of you will earn points from votes. [Partner] will be notified when you submit — they can add their own proof post for the same task, or endorse this one."
- For duel: "Only the player with the higher vote total earns points. Voting on a duel also requires voters to indicate who they believe won."

### 18.4 Submit Row

Below all sections, full width:

- **"Publish proof"** button (primary): faction color background, white text, Courier Prime 12px bold uppercase, rectangular stamp style with inner dashed border. NOT "Submit" — "Publish" implies pride of authorship.
- **"Save draft"** button: outline style, `border: 2px solid rgba(0,0,0,0.15)`, muted text. Saves without publishing.
- Submit note (right of buttons, 8px muted): "Once published, others can vote on your proof. You can edit it after publishing."

### 18.5 Sidebar Replacement — Contextual Panels

Since there is no right sidebar, two pieces of information that would normally live in a sidebar are instead placed as the **right column of the main content area** on wider screens, or as collapsed accordions on mobile:

**"What makes a good proof post"** — always visible on desktop, collapsed on mobile.
Content (bulleted list, 9px, `color: #4a3f30`):
- Write in first person. We want to feel like we were there.
- Specificity beats spectacle. A real moment with one pigeon beats a zoo photo.
- Photos and video help, but they don't replace the writing.
- Tell us what changed. Did something unexpected happen?
- Voters reward weirdness, honesty, and genuine effort over polish.

**"Other proofs for this task"** — peek at up to 3 existing praxis submissions.
- Small thumbnail (36×28px) + Lora italic title + points earned
- Note below: "Reading other proofs is allowed and encouraged — see what approaches others took."

These panels are editorial, not functional. They should feel like a soft nudge from the community, not a rules box.

### 18.6 Active Task Highlight

In the active tasks panel (if shown anywhere on this page — on mobile it may appear collapsed in a bottom drawer), the task currently being submitted is highlighted with faction-color background tint and "Submitting now" as the meta text.

---

---

## 19. Submit Proof Form — Layout Note

*(Spec documented in Section 18 above. Key addition: this is the only logged-in page with NO right-hand sidebar panels. Full-width writing environment. The watercolor background and nav remain.)*

---

## 20. Propose a Task Form

### 20.1 Layout — No Sidebar Panels

Same as Submit Proof — no character card, no active tasks panel, no activity feed. The user is in creative/proposal mode. Give them space.

Layout: two-column grid — main form left (flex: 1), tips column right (~280px). The tips column is editorial context, not functional UI. On mobile, tips column collapses below the form.

Breadcrumb: `Tasks › Propose a Task`

### 20.2 Faction Selector — Step 1

The faction selection happens **before** the form appears, because the faction determines the aesthetic of the proposal card wrapper.

**Display:** Row of faction choice tiles, each containing:
- Diagonal pennant tab (faction color, faction name)
- Small descriptor label below (8px muted: "Collective", "Document", "Mischief", etc.)
- `border: 2px solid rgba(0,0,0,0.1); background: rgba(255,255,255,0.55)`
- Selected state: `border-color: faction-color; background: light faction tint`
- Hover: `transform: translateY(-2px)`

**Faction descriptors:**
| Faction | One-word descriptor |
|---------|-------------------|
| UA / Unaffiliated | Unaffiliated |
| Gestalt | Collective |
| Analog | Document |
| S.N.I.D.E. | Mischief |
| Journeymen | Explore |
| Singularity | Discover |
| UA Masters | Chronicle |

### 20.3 Proposal Card — Faction Aesthetic Wrapper

The form fields live inside a card that uses the **selected faction's card archetype** expanded to full width. This is the same system as task cards and profile headers — the faction identity wraps the content.

The masthead / header area of each faction wrapper:
- **UA/Unaffiliated:** Large sticky note, no masthead
- **Analog:** Journal page with margin rule, "Field Notes" header
- **Gestalt:** Collage with tape, no formal masthead
- **S.N.I.D.E.:** Newspaper clipping with "The Dispatch · S.N.I.D.E. Task Proposal" masthead, "PENDING ADMIN REVIEW" classification stamp
- **Journeymen:** Luggage tag, "Task Proposal Filed" header stripe
- **Singularity:** Terminal window, `> TASK_PROPOSAL_INIT` header
- **UA Masters:** Gazette article with proper masthead

Inside the card wrapper, the form sections (task name, description, difficulty) are frosted sub-cards in the same frosted style as other form sections.

### 20.4 Form Fields

#### Task Name
- Font: faction-appropriate (Special Elite for newspaper/journal factions, Share Tech Mono for Singularity, Courier Prime for others)
- Size: 22px
- Bottom-border only input, `2px solid rgba(0,0,0,0.12)`, focus transitions to faction color
- Placeholder: "What do you want people to do?"

#### Task Description
- Rich text editor — same minimal toolbar as Submit Proof form (Bold, Italic | H1, Quote | List)
- Font: faction-appropriate, 13px, 1.7 line-height
- Min-height: 120px
- Placeholder: "Write the task description here. What exactly should the player do? What counts as completing it? What makes a good proof post?"
- No word limit.

#### Suggested Difficulty — Two Fields

**Base point value:** Free text number input.
- `font-family: Courier Prime; font-size: 20px; font-weight: 700; width: 80px`
- Plain number input, no spinner arrows, no min/max enforced in UI
- Players can type any number — admins edit/handle outliers
- Label below: "Admin may adjust — this is a suggestion"
- Placeholder: "pts"

**Minimum level:** Connected node selector (same as filter nodes on task page, levels 0–5)
- Nodes: 32px circles, `border: 2px solid rgba(0,0,0,0.15)`
- Selected: `background: #1a1209; color: white; transform: scale(1.12)`
- Label below: "Level 0 = anyone can attempt"

### 20.5 Notes to Admin (Optional)

Textarea field below the faction card.
- `border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; padding: 0.6rem 0.7rem`
- Focus: `border-color: faction-color`
- Placeholder: "Why do you want this task to exist? What inspired it? Any concerns about how it could be misused?"
- Font: Courier Prime 11px

### 20.6 Task Preview Strip

Below the notes field, above the submit button. Shows exactly how the task will appear in the task list once approved.

- Background: light faction tint with faction-color border
- "Task preview — [Faction] · Pending" label in faction color
- Renders a read-only version of the task card at reduced scale: faction tab + task name + description excerpt + pills (pts / level / "Pending review" status)
- Updates live as the user types the task name and description

### 20.7 Submit Row

- **"Submit proposal"** button: faction color background, Courier Prime 12px bold uppercase, rectangular stamp style with inner dashed border
- **"Cancel"** button: outline style
- Note (inline, 8px muted): "Your proposal goes to admin for review. You'll be notified when it's approved, edited, or declined."

### 20.8 Tips Column (Right, Always Visible on Desktop)

Three cards:

**"What makes a good task"** (bulleted, 9px):
- It should be doable by someone with no money and no special skills.
- The proof post should be interesting to read even if you didn't do the task.
- It should have a clear pass/fail — did they do the thing or not?
- It should feel like it belongs to its faction.
- If it could only be done once ever, it's too specific. If anyone could do it anywhere, it's probably right.

**"Your previous proposals"** — list of player's past proposals with:
- Task name (10px bold)
- Faction + suggested pts (8px muted)
- Status pill: "Approved — now active" (green) or "Pending review · N days" (amber) or "Declined" (red, with note link)
- Note: "Admins typically review proposals within 1–2 weeks."

**"What happens next"** — 9px prose explaining the pipeline: admin review → pending task list → Level 5+ players vote to activate.

---

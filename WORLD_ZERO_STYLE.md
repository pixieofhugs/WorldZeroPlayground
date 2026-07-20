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

**Dark mode** is handled by `[data-theme="dark"]` overrides in `index.css`. Components should use `var(--faction-everymen-card-bg)` — never `dark ? '#1e1a10' : '#fffef5'`.

**Rule:** If you're about to hardcode a hex value in a component, stop. Add it as a CSS variable first.

### Albescent has no theme, on purpose (#783)

Albescent is a secret society hiding in plain sight, so it is the one faction with **no `--faction-albescent-*` block and no slot in `FACTION_RAINBOW_ORDER`**. It maps to `default` in `CSS_KEY`, exactly as `na` does, which makes `isKnownFaction('albescent')` **false**. That is the intended outcome, not a gap: every surface that branches on that predicate hands Albescent the unaffiliated treatment automatically, including surfaces built later.

Its manifest (`factions/albescent.ts`) is therefore almost empty, and that is the design — the override-only seam means declaring nothing renders Default everywhere. Do not add wrappers that "render Default for Albescent"; a wrapper that adds nothing is a place for divergence to creep back in.

Two traps, both of which have already been sprung:

- **Do not give it a token block cloned from `--faction-default-*`.** `isKnownFaction` would go true, Albescent would take the real-faction branch, and it would get a **solid** fill while an unaffiliated player beside it gets `factionFill`'s **gradient** — flatter and greyer, so *more* conspicuous. Pointing the token at a gradient does not help either: the same token is read in scalar contexts (`color:`, `border-color:`) where a gradient is invalid.
- **A per-faction voice is as identifying as a per-faction colour.** Albescent's vote vocabulary ("Unseeing → Inscribed") and comment dialect ("Vigil the Third") both had to go, because they rendered to every viewer on ordinary surfaces. If you add a per-faction *word*, ask the same question you would ask of a hue.

The one exception is the **reveal surfaces** — the invitation letter, the sealed placeholder, the `/factions` tile — which are only ever shown to an account already revealed to the society. They read the private `--albescent-reveal-*` palette by direct reference, never through `factionCssVar`. That palette is not a theme and must not become one.

### A faction's SPINE HUE and its SKIN are two different things (#812, #814, #838)

Warriors of Whimsy is the case that proves it, and the case that got it wrong twice.

WOW's **spine hue is yellow**: `--faction-wow` (#e0a800 light / #f5c542 dark) and its stop in `--faction-default-rainbow`. That is its membership of the rainbow — index 2 of `FACTION_RAINBOW_ORDER`, between UA's orange and S.N.I.D.E.'s green — and it is why `isKnownFaction('wow')` is true and its members get faction-coloured ornament.

WOW's **skin is the chronicle**: cream parchment (`#fbf4e0`), a gold frame (`#c8a02a`) and plum ink (`#7a4a9e` light → `#c79be0` dark), MedievalSharp for display, the `✦` glyph, the googly-balloon verdict and an archaic register. None of that is yellow, and none of it should be pulled toward yellow.

The two axes are independent, and #830 collapsed them: it read a mislabelled mockup heading, gave the chronicle to Cozy Coven, and then *derived a whole yellow skin for WOW from its spine hue*, out of nothing. #838 retired that ramp. **ADR-0050** is the record, and `.design-sync/praxis-cards/LABELS.md` is the short version — every design artifact for this faction pair is labelled backwards, so go by tokens and metaphor:

| | **`wow`** (Warriors of Whimsy) | **`coven`** (Cozy Coven) |
|---|---|---|
| Card | cream / gold / **plum** chronicle | **pink** marker sticker |
| Widget | googly **balloons** | **moon phases** on a night plate |
| Glyph | `✦` | `✨` |
| Tier ladder | `a start … excellent · legendary` | `sweet · lovely · wonderful · magical · iconic` |
| Register | archaic — *"Cast thy Verdict"* | cozy-casual — *"how'd this land?"* |

**On the hue.** Yellow is the palette's hard case (#651, #669, #677), for two reasons that pull in opposite directions. A yellow saturated enough to read as yellow needs **dark ink** on it, never white — hence `--faction-wow-on-fill` is ink in both themes. And WOW sits **adjacent to UA** in the spectrum, so the two are painted touching in the Leaderboard/DefaultPlayers stripe bars and Meadow's bloom; a goldenrod too near UA's burnt orange reads as a second brown at that size. The shipped light value resolves this by pushing hue rather than lightness — clear of orange, deep enough to stay legible.

**On the gold.** `#c8a02a` is **theme-invariant** — it is the same value in light and dark, because a metal-leaf frame does not brighten when the lights go out. The plum is what carries the theme flip. The gold is a *frame and rule* colour, never an ink: it measures 2.24:1 on the cream, so nothing legible is ever painted in it. Where the chronicle's running head needs text, both gradient stops are deepened until cream clears 4.5:1 across the band — a declared deviation from the design's undimmed gold/plum stripe, which carries no text.

Read this next to the Albescent note above: those are the repo's two partly-registered factions, partial on **different axes**. Albescent has neither theme nor skin, on purpose, because it is hiding. WOW now has both, but only a few manifest surfaces claim it, so the rest still render `Default*` until the card rebuild lands.

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
| Cozy Coven  | `Caveat`           | `--faction-coven-card-font`       |
| Warriors of Whimsy | `MedievalSharp` — the chronicle's display face; `Lora` italic is its secondary (§3) | `--faction-wow-card-font` |
| S.N.I.D.E.  | `Permanent Marker` (+ a punk set: Anton / Bebas Neue / Archivo Black / Special Elite, via `--faction-snide-font-*`) | `--faction-snide-card-font`       |
| Ephemerists | `Cinzel`           | `--faction-ephemerists-card-font` |
| Singularity | `Share Tech Mono`  | `--faction-singularity-card-font` |
| UA Masters  | `UnifrakturCook`   | `--faction-ua-masters-card-font`  |

Use `factionCssVar(slug, 'card-font')` in components. Never hardcode the font family string directly.

**Type scale** is defined as CSS variables in `index.css`. Use the variable names, not raw pixel values. It comes in **two tiers**, and the naming convention is the tier boundary made visible: the label tier is a size ramp with t-shirt names, the content tier is a **role vocabulary**.

| Tier        | Tokens                                                                     | Rule                    |
| ----------- | -------------------------------------------------------------------------- | ----------------------- |
| **Label**   | `--text-xs` 8 · `--text-sm` 9 · `--text-base` 10 · `--text-md` 11 · `--text-lg` 12 · `--text-xl` 14 | Stays small. Scanned, not read. |
| **Content** | `--text-content` 18 · `--text-title` 24 · `--text-heading` 32 · `--text-display` 42 | The floor and up. Read for meaning. |

The content tier is a clean **4:3 ramp** — each step is exactly a third bigger than the last, so it needs no table to reproduce.

| Token             | px  | Role                                                    |
| ----------------- | --- | ------------------------------------------------------- |
| `--text-content`  | 18  | body copy, descriptions, admin notes — **the floor**    |
| `--text-title`    | 24  | titles, scores                                          |
| `--text-heading`  | 32  | section and page headings                               |
| `--text-display`  | 42  | hero, wordmark                                          |

**Content-text floor.** `--text-content` (18px) is the floor for _real content_ — nothing a player is meant to actually read may sit below it. The name *is* the rule.

### The role vocabulary

Classify every string against these three roles. This is the vocabulary the sweeps work from.

- **Content → the floor.** User-authored free text (`praxis.body`, `task.description`, `admin_note`, comments). Titles (`h1`–`h3`, `font-display`, `task.title`). Numbers a player cares about (points, votes, level). Full sentences from the i18n catalog — banner prose, status explanations.
- **Label → stays small.** `.eyebrow` (and anything uppercase + letter-spacing, which is the same thing hand-rolled). Button and link chrome. Pills, badges, stamps, corner counters. Bylines, timestamps, metadata.
- **Ornament → exempt.** Glyphs used as icons (a `✗` dingbat is not text). Text that is part of the illustration — stamp text, tape-strip labels, punch-card headers.

### The geometry doctrine

> **If the type doesn't fit, the container is too small. Make the container bigger.**
> Type wins; geometry yields. A cramped card is not a reason to shrink readable text —
> it is a reason to widen the card.

Both of the floor's original exceptions came from treating a fixed container as immovable. It is not.

**Role classes.** Two classes carry the content tier, next to `.eyebrow`:

| Class            | Token                   | Role                                                                     |
| ---------------- | ----------------------- | ------------------------------------------------------------------------ |
| `.content-text`  | `--text-content` (18px) | body copy, descriptions, admin notes, the praxis body, textareas          |
| `.content-title` | `--text-title` (24px)   | titles and scores                                                        |

There is deliberately no `.content-heading` / `.content-display` / `.content-score`: each would have a single caller already owned by a component, and a class for one caller is a class for nobody. A score is a title-sized number — `.content-title` plus a `fontWeight`.

**Eyebrow / label text:** Courier Prime, `--text-sm` (9px), uppercase, letter-spacing 0.15em, `var(--color-text-tertiary)`. Use the `.eyebrow` class. Never add an inline `fontSize` to an element that already carries `.eyebrow` — the class owns the size.

---

## 4a. Spacing

**Spacing scale** is defined as CSS variables in `index.css`. Use the variable names, not raw pixel values.

| Token         | Value |
| ------------- | ----- |
| `--space-xs`  | 4px   |
| `--space-sm`  | 8px   |
| `--space-md`  | 12px  |
| `--space-lg`  | 16px  |
| `--space-xl`  | 24px  |
| `--space-2xl` | 32px  |
| `--space-3xl` | 40px  |
| `--space-4xl` | 48px  |
| `--space-5xl` | 64px  |
| `--space-6xl` | 96px  |

The rungs through `2xl` are for spacing **within** a component; `3xl` and up are for the space **around** one — section breaks, hero padding, sticky-footer clearance. The step widens on purpose: at that size a 4px difference is not a design decision anyone is making.

**Rule:** `padding`, `margin`, and `gap` take a `--space-*` token — never a raw pixel value. If you're about to write `padding: 13` or `gap: 6`, stop and pick the nearest token. This mirrors the typography rule: the scale is the vocabulary, and a value outside it is a bug, not a nuance.

**Ties round up.** 20px sits exactly between `--space-lg` and `--space-xl`, and it is one of the most common raw values in the codebase; "nearest" does not resolve it. Round up. §4's *type wins; geometry yields* is the reason — text sizes rose site-wide in #627/#623, so containers giving up room is the wrong direction. The exception is an intentionally **asymmetric** inset (`"24px 24px 22px 20px"`), where rounding every side up flattens the asymmetry into a uniform box; there, round the tie down and keep the shape.

**Never compose with `calc()` to dodge the scale.** `calc(var(--space-2xl) + var(--space-lg))` is a 48px value wearing a disguise — it passes the linter and tells the next reader nothing. If a needed value has no rung, that is a gap in the scale to raise, not to route around.

Both scales are **global, not per-faction**. A faction picks a headline font, a colour, and an ornament — never its own type size or spacing. There are no per-faction size or spacing exceptions.

**Skins don't own type size.** A skin style object (`inputStyle`, `textareaStyle`, `markdownStyle`, and friends) carries `fontFamily`, `fontStyle`, `color`, `lineHeight` — **never `fontSize`**. The shared control owns the size, via a role class (`.content-text` / `.content-title`) or a `--text-*` token. This is the rule above made enforceable: if a skin is setting a size, the size has escaped the scale.

**A wrapper `fontSize` is the worst version of that.** A size on a *container* is inherited by every slot inside it at once, so one line silently overrides a whole surface — and no individual line looks wrong when you read it. This is what #769 was: three duel-rail skins each set `fontSize: var(--text-sm)` on their frame, and the cast roster, the next-step line and the stakes copy all rendered at 9px, half the floor, despite no line of that text naming a size. The fix inverts ownership: **each slot sets its own size and the frame sets none.** When you find a below-floor surface, look at the container before the line — the line is usually innocent.

**A token names a tier, so pick by role, not by number.** `--text-sm` is 9px, not 14px; `--text-xl` is 14px, not 20px. The Label ramp's t-shirt names read like a *size* vocabulary and invite you to reach for the nearest-looking name when tokenizing a raw value. Decide which of the three roles the string is (§4's role vocabulary), take that tier's token, and let the number land where it lands. Substituting `--text-sm` for a raw `14` is a two-tier demotion wearing a rename: it turns the lint green while making the surface materially harder to read.

**Zero is exempt.** `padding: 0` / `margin: 0` / `gap: 0` stay as written. Zero is the *absence* of spacing rather than a choice from the scale — it is unit-less and theme-invariant, so it carries none of the drift the scale exists to prevent. There is deliberately no `--space-none` token: spelling "nothing" as `var(--space-none)` is churn, not clarity. The lint rule exempts the literal `0`.

**Not covered by the rule:** ornament geometry (`width`/`height`/`top`/`inset` on decorative marks, sprocket holes, tape strips, corner brackets) is illustration, not layout spacing, and stays in raw pixels.

**Ornament spacing.** The same carve-out extends to `padding`/`margin`/`gap` *inside* an ornamental composition — the lead between stacked stencil lines, the inset of a stamp within its border, the offset of a taped label. Rounding those to the nearest rung reflows the composition, and §6's "do not regularize card sizes" applies to an archetype's internal rhythm as much as to its outer dimensions. Such a value keeps its raw pixels behind the same per-line hatch ornament `fontSize` uses. The test is unchanged: spacing that positions **layout** takes a token; spacing that positions **illustration** is ornament. When genuinely unsure, it is layout — the carve-out is narrow, and a gutter between two paragraphs is never ornament.

**An on-scale value can never be ornament.** The carve-out exists because *rounding* an off-scale value reflows the composition. A value already sitting on a rung is not rounded at all, so that justification is absent and the claim is empty. Before hatching, check the number: `padding: 4` is `--space-xs` and simply takes the token, however ornamental its surroundings. A legitimate claim is **off-scale** *and* **in register with raw ornament geometry**. Two recurring shapes qualify: a `paddingLeft: 46` clearing a *drawn* margin rule at `left: 32`, where rounding runs body text into the line; and a **ring-stroke inset** (`padding: 2`/`3`/`6` on an avatar band, gilt frame or seal) where the inset *is* the drawn band — 4px is a 33–100% thicker ring that visibly eats the inner disc. Both are correctness, not taste.

**This rule does NOT extend to the type scale.** A `--text-*` token names a **tier**, not merely a number: `--text-base` means *Label tier*. A 10px stamp is not label-tier text — it is a stamp that happens to be 10px, and tokenizing it would couple it to a tier it was never part of, so retuning that tier later would silently drag the ornament along. Spacing tokens are near-purely dimensional, which is why the on-scale rule binds them and not type. **Ornament type keeps its raw value even when the number happens to sit on a rung.**

### The ornament escape hatch

Some type is illustration rather than text: a marker scrawl, a stamp, a tape label, a punch-card header, a condensed poster face, hand-lettering on a pinned index card. It carries a raw pixel size on purpose, because rounding it to the nearest token would flatten one archetype into another. §6's "do not regularize card sizes" applies to type too.

The test is what the size is *doing*, not how big it is. Display-face type whose optical size is not the text scale is ornament even at 13px; anything a player actually reads is content even at 30px. **When you are genuinely unsure, it is ornament** — the content-text floor is a rule about reading, not about every number in the file.

Ornament that keeps a raw value must say so **at the site**, so the exemption is legible to the next reader instead of hiding behind a filename in a list. This is a **two-phase** state, because a file's `fontSize` axis and its spacing axis migrate on different schedules (#623 and #750):

**Phase 1 — file still grandfathered (the rule is off for it).** Annotate with a plain comment. An `eslint-disable` directive here would be an *unused* directive, since the rule never fires on a listed file:

```js
// ornament: hand-lettered Caveat — handwriting on the board, not typeset copy.
fontSize: 19,
```

**Phase 2 — file delisted (the rule is on for it).** The comment becomes the directive, and the exemption turns per-line and self-documenting instead of per-file and invisible:

```js
// eslint-disable-next-line local/no-raw-style-values -- ornament: hand-lettered Caveat.
fontSize: 19,
```

A file only moves to phase 2 when it is clean on **both** axes — no un-annotated raw `fontSize` *and* no raw `padding`/`margin`/`gap`. Tokenizing only the type leaves it in phase 1.

**Enforcement.** The `local/no-raw-style-values` ESLint rule fails the build on a raw numeric `fontSize`/`padding`/`margin`/`gap` in an inline style. Files not yet migrated are grandfathered in `frontend/.eslint-legacy-raw-styles.txt`. **That list only ever shrinks** — migrating a file means deleting its line; no file may ever be added to it. The hatch above is what keeps that literally true: ornament is not a permanent residue on the list, it is a per-line directive on a delisted file. The list reaches **empty** when #750 (the spacing sweep) closes and the last file moves to phase 2. **It is empty now** — so a newly-flagged violation is fixed in place or hatched per-line, never grandfathered.

**What the rule sees.** A raw value is a raw value whichever notation carries it, so the rule covers three shapes: a numeric inline style (`padding: 6`), a length string including `rem`/`em` (`padding: '0.6rem 1.2rem'`), and an **arbitrary Tailwind spacing utility** (`mt-[6px]`, `px-[10px]`) — the last of these leaves the style object entirely and so needs a separate `className` check (#763). It walks ternaries, `&&` chains and template literals, because the recurring lesson of #770/#789 is that *any* indirection hid the value from a literal-only check.

**What it deliberately does not see**, each a judgement rather than an oversight:

| Gap | Why it stays open |
| --- | --- |
| `text-sm` / `text-xs` on prose | Needs to know prose from chrome; a className carries no role signal. `text-sm` is right on a timestamp and wrong on a paragraph. Review-only. |
| `text-[13px]` | A `--text-*` token names a **tier**. Flagging arbitrary type mechanically would pin ornament to a tier it was never part of — the coupling this section forbids. |
| `calc(...)` | Named above; composing around the scale is a review rule, not a regex. |
| `w-`/`h-`/`top-`/`inset-` | Ornament geometry, already carved out above. |

---

## 5. Layout

Every logged-in page follows this shell:

```
Nav (sticky, frosted glass)
Watercolor Background (absolute, behind content)
Body: Main Content (flex: 1) + Sidebar (minmax 280–340px)
```

The sidebar contains: character card, active tasks panel, recent activity panel, propose-a-task button. Some pages add contextual panels (e.g., faction standings on Players, pending requests on Updates).

**Exceptions:** Submit Proof and Propose Task forms drop the sidebar for a single-column writing layout.

---

## 6. Faction Card Archetypes

**Core principle:** Each faction's tasks use a completely different card archetype. The card type IS the faction identity. All cards display: task name, faction name, point value, level requirement (via `LevelGem`).

**The level gem** is the one shape shared across every archetype: a 45°-rotated square, always outlined and never filled, with a faction-coloured numeral and a mandatory tiny "LVL" caption. It is deliberately the exception to "no uniform shapes" — the level is a game-wide fact, not a faction one, and a player should recognise it instantly whether it sits on a ransom note or a roster row. Faction identity enters as stroke colour and glow only. Unaffiliated takes the spectrum on both stroke and numeral (ADR-0039); it never degrades to grey, and it never borrows another faction's hue.

Cards are arranged in a `flex-wrap` container with varied heights and slight rotations. This is intentional — they are NOT on a strict grid.

Each faction's archetype lives in its card component — see `frontend/src/components/cards/*TaskCard.tsx`. Every one carries a one-line docstring naming its archetype (metaphor, colors, headline font); that docstring is the source of truth and is edited in the same commit as any redesign. A table here would only cache — and drift from — what those components already state. Colors are CSS variables (§3).

**Singularity** is always dark in both themes — no light variant needed.

**UA Masters** (dormant, deferred to Era 2 per ADR-0004): gazette-article archetype — proper masthead, corner-snipped edges, two columns, UnifrakturCook. No component exists yet, so this line is the only place it lives.

**Reuse pattern:** The faction card aesthetic should be used as a wrapper for any faction-branded context: profile headers, praxis bylines, proposal form wrappers, podium cards. The card component handles the visual treatment; the parent provides the content.

---

## 7. Components

### Nav Bar

- Frosted glass: `var(--color-nav-bg)` with backdrop blur
- Wordmark: Lora italic with rainbow gradient underline
- Links: Courier Prime, `--text-base`, uppercase

### Page Title

- Lora italic, `--text-display`
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

### Faction Component Naming

Faction-specific components are named with a **Title-cased slug prefix** — `Ua`, `Snide`, `Wow`, `Everymen`, `Ephemerists`, `Singularity`, `Albescent` — never an ALL-CAPS acronym (`UA`, `SNIDE`). The file name, the component's default export, and any private per-faction helper (sigil, crest, card) all share that Title-cased prefix. Only the lowercase backend **slug** (`ua`, `snide`) stays lowercase — it is the string key in the per-faction manifests (`factions/<slug>.ts`, `pickVariant`) and in CSS variables (`--faction-ua-*`), and must never be recased. This keeps a single, greppable identifier per faction across every surface.

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
- **Players (Leaderboard):** Top 3 podium in faction-framed cards. Your rank strip. Frosted table with faction color edge accents. Faction standings sidebar panel. In the roster rows, faction colour lives on **ornament only** — the glowing `FactionAvatar` ring, the level gem, the edge accent, the points numeral. Player names are always `--color-text-primary`, including your own row; the tinted row background is what identifies you. Unaffiliated players get the spectrum, never a borrowed faction colour (ADR-0039). Desktop rows are separated by `.divider-curved`: a neutral dashed rule that flares into an upward curl at each end. It is deliberately not applied site-wide — the other divided-row surfaces are not ranked lists.
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
- **No raw pixel values for fontSize/padding/margin/gap** — use the `--text-*` / `--space-*` scales (§4, §4a); enforced by `local/no-raw-style-values`
- **No content text below `--text-content`** — 7px and 9px are label sizes, not reading sizes
- **No shrinking type to fit a container** — if the type doesn't fit, the container is too small; widen it (§4)
- **No `fontSize` in a skin style object** — a skin owns font, colour and ornament, never size (§4a)
- **No dark mode via ternaries** — use CSS variables so the cascade handles it
- **No dark mode by inverting colors** — each card has a specifically designed dark variant in the CSS variables
- **No disabled buttons for permission gates** — hide controls users can't use
- **No dead buttons** — every interactive control must have a working handler; no placeholders, no stubs, no `onClick={() => {}}`
- **No parallel faction styling** — reuse the card archetype everywhere, don't recreate it
- **Do not regularize card sizes** — varied widths and rotations are intentional
- **Do not use emoji as icons** — use CSS or SVG

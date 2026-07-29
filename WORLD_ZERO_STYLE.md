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

### Contrast is a pairing, not a property (#1028)

A measurement belongs to a **hue on a ground**. It survives exactly as long as both halves do, and the task-detail epic broke that in two ways that each turned up independently on three separate skins.

**A new ground invalidates every contrast claim measured on the old one.** Everymen, WOW and Ephemerists each hit this without knowing the others had: a token that had cleared AA for releases stopped clearing the moment its surface was repainted, and nothing warns you — the token is unchanged, so it looks untouched. Ephemerists is the worked example. A task *card* is one plate sitting on the app's page ground; a task *detail* **is** the plate, so it gained a page ground of its own and a second sheet for the panel cells, and it sets quiet type on all three. The design's `muted` brown clears 4.60:1 on the plate and only 4.31:1 on the page beneath it. The fix is not to branch per ground at the call site — it is to walk the ink down until it clears on **every** ground that surface has (`--faction-ephemerists-plate-quiet`: page 5.25, plate 5.60, inner 6.20), so a skin never has to know which sheet a label landed on. **When a surface gains a sheet, re-measure the inks it already had.**

**An accent can clear AA as a rule or a fill and still fail as body ink — and that is a token split, not a usage convention.** "Never paint text in this one" is a rule a future editor has to remember; a second token is a rule the cascade enforces. `--everymen-red` pays 4.95:1 on the light broadsheet panel and 3.73:1 on the dark one, so ink got its own name — `--faction-everymen-sheet-accent`, walked up in the dark cascade to 5.45:1 — while dashed rules and filled bars keep `--everymen-red`. WOW's gold and the WOW duel rail's opponent accent state the same constraint as a usage convention *because they genuinely have no text pairing*: nothing legible is ever painted in either. The moment a surface does want the accent as text, mint the ink token rather than writing the caution down.

The third variant of this — a design kit's own annotations measured against the kit's plate rather than ours — is §6's, under "Reading a design kit".

### Unaffiliated grey is usually a FILL written as a border (#983, #805)

ADR-0039 draws one line: an unaffiliated player's identity is a gradient, so it appears wherever a gradient is expressible (`background:`, an SVG `fill=`) and stays neutral grey where one is not (`color:`, `border: Npx solid`). The line holds. What keeps going wrong is which side a given accent is actually on — and the answer is usually decided by how somebody happened to type it, not by what it is.

**A rule drawn as a `border` is a fill that lost an argument with the shorthand.** The feed's headline accent read grey for every `na` row purely because it was written `borderLeft: 3px solid ${accent}`; drawn instead as a 3px element it is a fill, and the spectrum arrives with no ADR amendment and no change for the seven themed factions. Same story in the Meadow: an SVG `fill` takes `url(#…)`, so the bloom's soft wash was never a scalar — it had simply been switched off (`fill="none"`) for unaffiliated players, which cost them the flower shape and left a scatter of hard dots. **Before accepting that a surface owes `na` grey, check whether it is genuinely ink or merely a fill in a scalar's clothing.**

**The spectrum comes in ramps cut for their geometry, and the cut is `factionFill`'s job, not the caller's.** `bar` is a 90deg ramp, `dot` a conic (a 7-stop linear at 10–12px is mud), and `rule` — `bar` stood on end — a 180deg one, because seven stops across a 3px-wide vertical rule is the same mud in the other axis. A themed faction returns the identical solid hue for all of them; only `na` is shape-dependent, which is what lets a call site swap `factionCssVar` for `factionFill` without restyling anybody else.

**What stays grey stays grey, and it is a decision.** Actor names, kickers and links in the feed are single-ink text: no stop of a seven-stop ramp is legible as one (#649), and `background-clip: text` buys the spectrum at the price of text selection and high-contrast modes. Unaffiliated actor text is grey on purpose. Reporting it as a bug is how the wrong fix gets built.

### Albescent has no theme, on purpose (#783)

Albescent is a secret society hiding in plain sight, so it is the one faction with **no `--faction-albescent-*` block and no slot in `FACTION_RAINBOW_ORDER`**. It maps to `default` in `CSS_KEY`, exactly as `na` does, which makes `isKnownFaction('albescent')` **false**. That is the intended outcome, not a gap: every surface that branches on that predicate hands Albescent the unaffiliated treatment automatically, including surfaces built later.

Its manifest (`factions/albescent.ts`) is therefore almost empty, and that is the design — the override-only seam means declaring nothing renders Default everywhere. Do not add wrappers that "render Default for Albescent"; a wrapper that adds nothing is a place for divergence to creep back in.

Two traps, both of which have already been sprung:

- **Do not give it a token block cloned from `--faction-default-*`.** `isKnownFaction` would go true, Albescent would take the real-faction branch, and it would get a **solid** fill while an unaffiliated player beside it gets `factionFill`'s **gradient** — flatter and greyer, so *more* conspicuous. Pointing the token at a gradient does not help either: the same token is read in scalar contexts (`color:`, `border-color:`) where a gradient is invalid.
- **A per-faction voice is as identifying as a per-faction colour.** Albescent's vote vocabulary ("Unseeing → Inscribed") and comment dialect ("Vigil the Third") both had to go, because they rendered to every viewer on ordinary surfaces. If you add a per-faction *word*, ask the same question you would ask of a hue.

The one exception is the **reveal surfaces** — the invitation letter, the sealed placeholder, the `/factions` tile — which are only ever shown to an account already revealed to the society. They read the private `--albescent-reveal-*` palette by direct reference, never through `factionCssVar`. That palette is not a theme and must not become one.

**What unfreezing a surface may and may not do (ADR-0048).** "Frozen" now means "frozen *until designed*", and surfaces come off the freeze one at a time — the praxis card first (#821), the task card second (#1023), the **task detail** third (#1038). Everything above still holds: none of them adds a `--faction-albescent-*` token, because the released surfaces are **`Default` plus a flourish**, never a skin of their own. Each renders the exact `Default*` component an unaffiliated player sees and washes MOTION over it (a rainbow drift, a spectrum edge that travels, an aurora that breathes) — the shimmer that reveals the society to someone already looking. `AlbescentTaskCard` is the shape to copy: it forwards its whole prop object to `DefaultTaskCard` and adds two overlay classes, so a change to the na card or to the card contract reaches Albescent with no edit.

Three things the task-detail wrapper settled that the next unfreeze inherits:

- **A flourish is clipped to the COMPONENT, not the viewport** — the general rule, and what it cost the wave, are in §5. `.alb-detail` is the 1200 column itself, and every light layer insets by `--space-2xl` top and bottom to land exactly on `DefaultTaskDetail`'s own sheet.
- **On an opaque sheet, the flourish goes ON TOP, blended** (§5 owns the stacking rule). `z-index: -1` puts an overlay *behind* a `Default*` surface that paints its own background, i.e. nowhere. `multiply` light / `screen` dark at a trimmed opacity is the shape — the same call `.alb-rainbow` and `.alb-task-aurora` already make.
- **Structure the wrapper cannot reach goes through an optional slot on the `Default*` component, never a fork.** The design turns the score readout into a spinning prism ring; `DefaultTaskDetail` gained one optional `worthSlot` and na is unchanged when it is absent. It is a slot, not a data channel (ADR-0016): the wrapper builds the node from the same state it forwards, so the two readouts cannot disagree. A second copy of an eight-hundred-line anatomy for one circle is the thing to avoid.

The **words** are covered by the same rule as the hues, and it is the easier one to get wrong: an unfrozen surface keeps `na`'s copy, including its sign-up verb. The task-detail design was the hardest case yet — `Correspondence №207`, `Albescent · in confidence`, `The Ask` / `in the hand of the keeper`, `In hand`, `14 accounts inscribed`, `most witnessed`, `Acknowledge`, `withdraw`, `Said quietly`, `Set something down, plainly…` — and **every word of it was cut** (#1038, ADR-0057 + ADR-0027). Albescent keeps the light and loses the words; a page announcing itself that loudly un-hides the society outright. `feed:taskCard.albescent.*` still sits in the catalog, orphaned since #783 deleted the card it belonged to; re-wiring it would print a word no other player's card prints, on a surface every player can see.

### A faction's SPINE HUE and its SKIN are two different things (#812, #814, #838)

Warriors of Whimsy is the case that proves it, and the case that got it wrong twice.

WOW's **spine hue is yellow**: `--faction-wow` (#e0a800 light / #f5c542 dark) and its stop in `--faction-default-rainbow`. That is its membership of the rainbow — index 2 of `FACTION_RAINBOW_ORDER`, between UA's orange and S.N.I.D.E.'s green — and it is why `isKnownFaction('wow')` is true and its members get faction-coloured ornament.

WOW's **skin is the chronicle**: cream parchment (`#fbf4e0`), a gold frame (`#c8a02a`) and plum ink (`#7a4a9e` light → `#c79be0` dark), MedievalSharp for display, the `✦` glyph, the googly-balloon verdict and an archaic register. None of that is yellow, and none of it should be pulled toward yellow.

The two axes are independent, and #830 collapsed them: it read a mislabelled mockup heading, gave the chronicle to Cozy Coven, and then *derived a whole yellow skin for WOW from its spine hue*, out of nothing. #838 retired that ramp. **ADR-0050** is the record — every design artifact for this faction pair is labelled backwards, so go by tokens and metaphor:

| | **`wow`** (Warriors of Whimsy) | **`coven`** (Cozy Coven) |
|---|---|---|
| Card | cream / gold / **plum** chronicle | **pink** marker sticker |
| Widget | googly **balloons** | **moon phases** on a night plate |
| Glyph | `✦` | `✨` |
| Tier ladder | `a start · quite solid · jolly good · splendid! · legendary!` | `sweet · lovely · wonderful · magical · iconic` |
| Register | archaic — *"Cast thy Verdict"* | cozy-casual — *"how'd this land?"* |

**On the hue.** Yellow is the palette's hard case (#651, #669, #677), for two reasons that pull in opposite directions. A yellow saturated enough to read as yellow needs **dark ink** on it, never white — hence `--faction-wow-on-fill` is ink in both themes. And WOW sits **adjacent to UA** in the spectrum, so the two are painted touching in the Leaderboard/DefaultPlayers stripe bars and Meadow's bloom; a goldenrod too near UA's burnt orange reads as a second brown at that size. The shipped light value resolves this by pushing hue rather than lightness — clear of orange, deep enough to stay legible.

**On the gold.** `#c8a02a` is **theme-invariant** — it is the same value in light and dark, because a metal-leaf frame does not brighten when the lights go out. The plum is what carries the theme flip. The gold is a *frame and rule* colour, never an ink: it measures 2.24:1 on the cream, so nothing legible is ever painted in it.

That constraint used to cost the design a deviation: #838's chronicle put the masthead **on** the gold/plum band, so both gradient stops had to be deepened until cream cleared 4.5:1 across it. #840 removed the cause rather than the symptom — the design's running head is a 6px stripe carrying **no text**, and the masthead is an eyebrow line inside the text column. With nothing painted on the band, the undimmed gold/plum stripe ships as drawn. **A contrast fix that fights the design is usually a structure bug**: check what put text on the surface before you dim the surface.

**On the crest.** WOW's mark (`components/cards/WowSigil.tsx`, #897) is a gilt coin: a beaded rope ring, a motto band carrying **"IMSYWHAY · ORFAY · EVERYONEWAY"** — *whimsy for everyone*, in Pig Latin — and a cream field where a goofy unicorn brandishes a floppy **noodle sword**. The Pig Latin and the noodle are the faction's entire conceit; a version of this mark that "cleans them up" has drawn a different faction. The seal is **theme-invariant**, on the same reasoning as the gold above — struck metal does not repaint itself when the lights go out, and the kit draws the identical coin on its light and its dark card. What flips is the chrome that *mounts* it: the avatar's field disc. Below **56px** the band drops its lettering and keeps only its gold ring — at that size the 13-unit type renders under ~4.5 CSS px, where it stops being glyphs and becomes a smudge that dulls the band and muddies the rope ring beside it. Three gold rings round a cream field is what carries recognition at badge sizes anyway.

**On the lists.** WOW's duel surfaces (#895) are a tourney joust: a gold-framed enclosure, the gold/plum checker barrier along its top edge, and a **ribbon** that rides home with the loser — the loss floor dressed as generosity rather than as punishment. One rule in that skin is load-bearing and is not a taste call. The opponent's faction colour arrives on the rail and the seal (`accent`/`soft`, #310) and **can be any hue in the palette**, so it is held as a **rosette ring, a plate edge and a bar — never as an ink and never behind text**. That is what lets a hostile hue sit inside cream-and-gold chrome without a contrast fix, and it is why no `ARCHETYPE_PAIRS` row measures the opponent accent: there is no text pair to measure. This rule now lives on the **seal** skins (`components/duel/wowLists.tsx`); the duel *rail* was retired with the praxis-detail redesign (#1090), and `wowDuelRail.test.tsx` — which asserted the rule structurally against three different accents — went with it. `duelSkinSlots.test.tsx` still renders the seal against a foreign-faction opponent, but it does **not** assert the never-as-ink/never-behind-text pairing, and a *pairing* is invisible to the token-value contrast test. **So the rule is currently unguarded** (#1115). If a later edit paints a string in the opponent's colour, nothing will stop it.

**On the phone.** The kit drew **one** mobile screen, not a mobile twin of every surface — a crested header wash, a list of gold-framed quest cards, and a bottom nav. #901 builds what is drawn (the field desk and the mobile task card) and **derives** the other four from that screen's chrome plus the matching desktop archetype, which is what every other faction's mobile build did. The vocabulary is one module, `components/cards/wowMobile.tsx`, in the same shape as the duel skins' `components/duel/wowLists.tsx`.

Two of the drawing's pieces are deliberately **not** built, and the reason is the same one in both cases: they are not surfaces of ours. The phone bezel and the 9:41 clock are the *mockup's* device shell, and the app already runs inside a real one. The bottom nav is the global `MobileTabBar` — navigation means the same thing to every player, exactly as a level gem or a badge does (§6), so it must not acquire a faction seam. The header's `✦ 4,180` looks like part of that shell and is not: it is the player's score, and it survives.

The kit's mobile palette is a complete two-theme contract, and all but two of its keys resolved to tokens WOW already shipped — the mapping lives beside the declarations in `index.css`. One pairing failed measurement: the kit sets the header byline in its `sub` grey, which reads 4.10:1 on the header's lower gradient stop, so that one line takes `--faction-wow-accent-deep` instead. That is the third slice in this epic to find the kit's contrast claims wrong; **measure every pairing you lift from a design annotation.**

Read this next to the Albescent note above: those are the repo's two partly-registered factions, partial on **different axes**. Albescent has neither theme nor skin, on purpose, because it is hiding. WOW now has both, and twenty-five manifest surfaces claim it (praxis card, its mobile twin, the score stamp, the vote widget, the edit-praxis composer on both form factors, the sigil and the avatar from #897, the task card, the comment and the feed frame from #899, the faction hero, backdrop, profile body and pledge card from #900, the duel seal plus the duel rail on both form factors from #895, and #901's six mobile surfaces — field desk, task card, task detail, praxis detail, faction page and profile), so the rest still render `Default*`. The eight that remain are listed, with the reason each one is unclaimed, in `factions/__tests__/wowRendersDefault.test.tsx`.

**Its task card and its praxis card do not match, on purpose.** A quest is *issued* by DECREE and proof is *recorded* in the CHRONICLE: `WowTaskCard` is a sheet hung from a knobbed rod under a gold/plum checker band, sealed with the crest; `WowPraxisCard` is a bound chronicle with a running head and a score stamp. They share the palette, the two fonts and the ✦, and nothing else. #785's "the praxis card mirrors the task card" clause is retired for this faction (#899) — the mismatch is the archetype, not a bug to reconcile.

### Verify a moved `index.css` block in the BUILT stylesheet, not by counting braces

`index.css` is now large enough that skin work routinely moves whole token blocks between the light declarations, the `[data-theme="dark"]` cascade and the media queries. **A dropped `}` fails nothing.** With CSS nesting and `@media` blocks, a lost closing brace produces no parse error — it silently **reparents** everything after it, and the result is valid CSS that simply applies to almost nobody. This wave a whole token block ended up nested inside `@media (prefers-reduced-motion)`; `tsc`, `eslint` and `vitest` were green throughout, and only `vite build` plus reading the emitted file caught it.

Balanced brace counts prove nothing here — the file balances either way, the braces just close different things than you meant. After moving or merging a block, run `vite build` and grep the **emitted** stylesheet for the moved selectors, checking the **depth** each one sits at. The question is never "is the selector present", it is "is it still at the nesting level it was written for".

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
| UA          | `Cormorant Garamond` — via `--font-faction-serif`; `EB Garamond` is its secondary, on `--faction-ua-body-font` (#848) | `--faction-ua-card-font`          |
| Everymen    | `Special Elite`    | `--faction-everymen-card-font`    |
| Cozy Coven  | `Caveat`           | `--faction-coven-card-font`       |
| Warriors of Whimsy | `MedievalSharp` — the chronicle's display face; `Lora` italic is its secondary (§3) | `--faction-wow-card-font` |
| S.N.I.D.E.  | `Permanent Marker` (+ a punk set: Anton / Bebas Neue / Archivo Black / Special Elite, via `--faction-snide-font-*`) | `--faction-snide-card-font`       |
| Ephemerists | `Cinzel`           | `--faction-ephemerists-card-font` |
| Singularity | `Share Tech Mono`  | `--faction-singularity-card-font` |
| UA Masters  | `UnifrakturCook`   | `--faction-ua-masters-card-font`  |

Use `factionCssVar(slug, 'card-font')` in components. Never hardcode the font family string directly.

**A face can belong to a SURFACE rather than to a faction.** `--faction-{slug}-card-font` is read by a dozen surfaces each, so repointing one to satisfy a single redesign restyles eleven others by accident. When a design names a face for one surface only, give it a shared `--font-faction-*` token and reference that token from the one component — the same move `DefaultTaskCard` makes when it takes Lora rather than `--faction-default-card-font`. The v2 task cards (#1023) introduced four such faces: **Quicksand** (`--font-faction-rounded`) and **Grenze Gotisch** (`--font-faction-witch`) for Coven's spell slip, **Poiret One** (`--font-faction-deco`) and **Spectral** (`--font-faction-spectral`) for the Ephemerists plate. Coven's `card-font` is still Caveat and Ephemerists' is still Cinzel, and both still appear on their v2 cards — as the hand-lettering and the small caps respectively.

Whichever route a face takes, **it must also be in the `index.html` loader**, added in the same commit. A family named but never requested renders as its generic fallback, and that fallback *is* the rendering — no check catches it except `fontsLoaded` comparing the two lists (#839).

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

### A component's ground belongs to the component, not the viewport (#1028)

A faction skin that wants a full-page ground reaches for `position: fixed; inset: 0`, and it is wrong every time: it paints over the app. **Six of the eight v2 task-detail skins shipped that way and had to be corrected** — owner QA on #1055, #1057 and #1065 caught the last of them. The watercolor background and the page shell must still show *around* the component; a skin owns its own column, never the window. This is §10's "no solid color backgrounds on the page" seen from the other side, and the correct shape is a layer inside the component's column, inset to land exactly on its own sheet.

**The stacking half bites next, and it caught UA and S.N.I.D.E. independently: a positioned ornament at `z-index: 0` paints ABOVE static copy.** The content column is what establishes the stacking context, and the copy inside it is unpositioned — so `z-index: 0` on a positioned overlay is not "the bottom of the pile", it is above every static sibling. Two ways out, and which one is correct is decided by what is underneath:

- `z-index: -1` puts the ornament behind the column's own content. It renders *nowhere* if the thing beneath paints its own opaque background.
- An explicit blend — `mix-blend-mode: multiply` in light, `screen` in dark, at a trimmed opacity — keeps the ornament on top and keeps the ink under it legible. This is the one an opaque sheet needs.

`z-index: 0` is neither, and it reads as if it were both. When an ornament lands over copy, the bug is almost always here rather than in the opacity.

---

## 6. Faction Card Archetypes

**Core principle:** Each faction's tasks use a completely different card archetype. The card type IS the faction identity. All cards display: task name, faction name, point value, level requirement.

**Task cards v2 (ADR-0055 / ADR-0056) draw the level themselves.** The redesigned task cards are the one archetype family that does *not* reach for `LevelGem`: every design in the v2 kit draws the level as a numeral in its own display face — under tally strokes on the Ephemerists plate, over a braid on the Coven slip, beside a dashed rule on the Everymen bill. The gem stays the shared shape everywhere else (rosters, detail pages, praxis surfaces), and the reasoning below is unchanged for those; on this one surface the whole point of the redesign was that the hero row belongs to the faction. Two other v2 rules ride along and apply to every card in the family: it is **one responsive component** (`useFormFactor` picks a size set — never a second file, never a fixed-px grid), and it shows **base points** with a `×multiplier` badge gated on `isNeutralMultiplier`, which is invisible at `era_1` and lights up on its own the day an era ships a non-1.0 modifier.

**Reading a design kit: four things in a `.jsx` that are not part of the design.** Four waves of kits now agree on these, so treat them as translation rules rather than judgement calls.

- **A skin never mutilates user-authored text.** S.N.I.D.E.'s task-card design redacted two words of the task's own brief as black bars — true to the ransom-note metaphor, and vetoed on sight (#1023): the description belongs to the player who wrote it, and no amount of fitting the archetype earns a skin the right to edit it. The line is between *restyling* and *destroying*. The same card's headline slices the title across four typefaces and that is fine, because every word survives and is readable. When a design proposes eating content, keep the ornament that carries the same idea and drop the part that touches the string — here, a decorative strip of redaction blocks used as a section rule says "censor" without censoring anything.

- **An A/B prop is canvas experimentation, not a contract.** WOW's task-card design takes a `ctaGold` prop that flips its button between plum and gold. `CardProps` has no such field and never will; pick one and delete the switch. Usually the repo has already picked — here, gold measures 2.24:1 on WOW's cream and §3 says nothing legible is ever painted on it.
- **A `theme === 'dark' ? {…} : {…}` map is a token that has not been declared yet.** That is the useful reading of §8's ban: it tells you *what to do* with the ternary instead of only that it is forbidden. WOW's design picks its emblem's four colours that way; three of the four turned out to be tokens already shipped, and only the blade needed a name.
- **A kit's contrast annotations are measured against the kit's own plate, not against our card.** This has now been wrong in four consecutive epics, so measure every pairing you lift. Two corollaries that are easy to miss: the **tighter half is not always the dark one** (Singularity's light chassis is the *lighter* black, so its light half is where the inks failed while the dark half shipped as drawn), and the repo may **already have measured and rejected** the exact value the kit is offering (WOW's dark #8a5aae is the 4.10:1 value that made `--faction-wow-plum-surface` theme-invariant in the first place). When the kit and a shipped token disagree, find out whether the disagreement is already settled before you add a token.

**The level gem** is the one shape shared across every archetype: a 45°-rotated square, always outlined and never filled, with a faction-coloured numeral and a mandatory tiny "LVL" caption. It is deliberately the exception to "no uniform shapes" — the level is a game-wide fact, not a faction one, and a player should recognise it instantly whether it sits on a ransom note or a roster row. Faction identity enters as stroke colour and glow only. Unaffiliated takes the spectrum on both stroke and numeral (ADR-0039); it never degrades to grey, and it never borrows another faction's hue.

**A dispatcher's fallback is the `na` kit, so it is always the `Default*` archetype — never a faction's card.** `na` has no manifest on purpose (unaffiliated is a state, not a faction), so `pickVariant`'s fallback argument *is* its registration: whatever component sits there is what every unaffiliated player and every unregistered slug wears. Name a faction's card there and you have dressed the blank slate in someone else's costume — the #418 / #636 / #796 family, three instances now, and each one sat unfixed because the missing `Default*` looked like a bigger job than the one-line repoint. It is the same job: **the Default archetype has to exist before the fallback can be right**, and building it is the fix. `FactionSelectCard` was the third; its neutral tile is `DefaultSelectCard`, on the Default praxis card's cream-sheet language with the spectrum in three fills (the frame, the sigil's conic ring, one hairline rule). Every rainbow on it goes through `factionFill(slug, shape)`; its scalars — body ink, muted status, the CTA hairline — stay neutral, because ADR-0039 says a gradient has nowhere to live in `color:` or `border: Npx solid`.

**Badge art is the second game-wide shape**, for the same reason. `badgeArtFor(key)` (`components/badges/badgeArt.tsx`) dispatches on the badge key and nothing else — a badge means the same thing to every player, so it must not acquire a faction seam. Most glyphs are line art in `currentColor` and inherit the surrounding skin's ink; a badge whose design *is* a colour (the `duel_victor` seal carries the ADR-0039 spectrum) names its own tokens instead. Either way, nothing about a badge is chosen by who is wearing it.

Cards are arranged in a `flex-wrap` container with varied heights and slight rotations. This is intentional — they are NOT on a strict grid.

Each faction's archetype lives in its card component — see `frontend/src/components/cards/*TaskCard.tsx`. Every one carries a one-line docstring naming its archetype (metaphor, colors, headline font); that docstring is the source of truth and is edited in the same commit as any redesign. A table here would only cache — and drift from — what those components already state. Colors are CSS variables (§3).

**Singularity** is always dark in both themes — no light variant needed.

"No light variant" is **not** the same as "one value for both themes", and Singularity now shows both shapes at once. Its older families (`--faction-singularity-terminal-*`, the decode strip, the system slab) are genuinely theme-**invariant** and declare no `[data-theme="dark"]` block at all. Its v2 task card's `--faction-singularity-term-*` is a real **two-theme contract whose halves are both near-black**: the chassis stays black and what the cascade flips is the *phosphor*. Say which shape a new block is where you declare it. The failure mode runs both ways — a later editor "completing" an invariant family with a dark half, or flattening a two-theme one on the grounds that the faction is always dark anyway.

**UA Masters** (dormant, deferred to Era 2 per ADR-0004): gazette-article archetype — proper masthead, corner-snipped edges, two columns, UnifrakturCook. No component exists yet, so this line is the only place it lives.

**Reuse pattern:** The faction card aesthetic should be used as a wrapper for any faction-branded context: profile headers, praxis bylines, proposal form wrappers, podium cards. The card component handles the visual treatment; the parent provides the content.

### A faction's ornament is one primitive at named strengths (#849)

A faction's signature device is drawn **once**, as one parameterized component, and consumed everywhere. It is never re-drawn per surface — a hero with its own hand-tuned rosette and a join card with another is how a faction stops looking like one faction.

Two rules follow, and UA is the worked example:

**A mark is reserved, and reserving it is the point.** UA's ensō (`components/cards/UaSigil.tsx`) is for the **score** and the **faction mark**. It is never a container border. A mark spent as decoration stops meaning anything; the restraint is the identity.

**Where an ornament may appear is part of its API, including where it may not.** `UaMandala` takes a `strength` of `full` (one surface — the vote control), `texture` (6–22%, behind page backdrop / faction hero / join card) or `absent`, which renders `null`. Dense, text-heavy surfaces — feed rows, comments, task lists, the editor — ask for `absent`. Encoding the third case as a strength rather than as "just don't use it" is deliberate: the ruling survives in the type instead of in a comment someone has to remember.

**That ruling is the mandala's, and it does not travel to the faction's other marks.** UA carries three devices — the mandala, the ensō and the lotus — and each has its own scope. `UaTaskCard` spent a release with no lotus because #851 read the kit's corner-bleed as something "the brief's strength ruling supersedes"; but the lotus is not radial concentric geometry, it is a ground wash, and `UaPraxisCard` (every bit as dense and text-heavy) had been floating one off its left edge the whole time. #1023 puts it back. When a rule names a component, check whether the thing in front of you *is* that component before you apply it — "UA ornament" is not one scope.

Where a mark ships as an inline SVG and where as a masked `public/` asset is a **weight** decision, not a style one — see `components/factionMarks/index.ts`. Both are token-tinted, so both follow the dark cascade. The same faction can legitimately carry two versions of one device at different sizes for different consumers; do not consolidate them on sight.

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
- **Task Detail:** Faction card archetype expanded to full width as hero block. Sign-up block with mode selector (Solo/Collab/Duel) as stamp buttons. Meta tasks section. Praxis gallery below. Since v2 (#1028) it is **one responsive component per faction** (ADR-0058) carrying **no faction voice** in its copy (ADR-0057), and it draws **no in-progress roster** — not one of the nine designs did, so the header's in-progress count is the only place that number appears. What that gives up is stated rather than forgotten: task detail is no longer where a player learns a *foe* is working the same task.
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
- **No `position: fixed; inset: 0` for a skin's ground** — a component's ground belongs to its own column, not the viewport (§5)
- **No `z-index: 0` on an ornament meant to sit behind copy** — positioned beats static; use `-1` or an explicit blend (§5)
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

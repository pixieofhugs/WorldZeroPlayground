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

   **A shared card is resized by its MOUNT, through an inherited custom property — never by a variant prop (#1137).** One component now serves every surface and both form factors (ADR-0067 for the praxis card), which means its geometry is *nine bespoke frames' worth* of inline style and a host page cannot reach any of it. The two obvious escapes are both wrong: a `compact` prop forks all nine internals for a decision that is purely about the container, and a class selector loses to the inline style it is trying to beat. A custom property is the one thing that crosses that boundary — it inherits down into an inline `var()`, so the container answers the question, and a surface that sets nothing renders byte-identically. `frameBase`'s `flex: 1 1 var(--praxis-card-basis, 394px)` against `.praxis-gallery` is the shape: **the default is today's value, and the override is a single declaration on the mount.**

   Two things this only works if you get right. **Pick the value by where the row WRAPS, not by how wide you want the card**: with `flex-grow: 1` the cards then stretch to fill the line, so the basis chooses a card *count* and the count chooses the width. The task detail's cards were rendering at 494–560px — half again the 380–398px the skins were drawn at — precisely because a 394px basis fitted only two across the column and both grew. And **an accompanying `min-width` silently caps the whole mechanism**: `frameBase`'s 280px floor is what holds one card per row on a phone, and it also swallows any basis below it, so the property is only meaningful in [280, 394]. State that range where the variable is declared or the next editor will set 240 and wonder why nothing moved.

3. **Single source of truth for style.** Colors, typography, and spacing live in CSS custom properties (`index.css`). Components reference variables — never hardcode hex values or pixel sizes. Dark mode works automatically through the cascade. **Faction colors live in `index.css` and nowhere else.** `factions.ts` maps a slug to a theme key and hands out `var()` references (`factionCssVar` / `factionFill`); it holds no hex of its own. It used to carry a mirror table that this document asked you to keep in sync by hand. The mirror drifted — UA sat on the *unaffiliated spectrum's* orange for months — and, being a literal, it could never hold a dark value at all, so every JS-sourced accent stayed at its light hue on a dark page. A second copy that must be synced is the failure, not the sync (#1269).

4. **If you can't use it, you can't see it.** Buttons, menu items, and actions that the user lacks permission for (level gate, role, status) should not render at all. Don't show disabled controls — hide them. This is already the pattern in the codebase; maintain it.

   **Validation belongs in business logic, not UX.** Gate rules (level thresholds, faction rules, anti-self checks, one-per-task rules) live in backend services. The backend is authoritative.
   - API responses include explicit `can_X` flags (`can_flag`, `can_sign_up`, `can_create_additional_character`, `allowed_modes`, `eligible_for_current_user`, etc.) computed server-side.
   - The frontend consumes those flags and hides controls accordingly. Do not re-implement the rule in a component.
   - No hardcoded rule thresholds in the frontend. If you're writing `level >= 4` in a component, the backend should be returning a flag instead.
   - Disabled state (`<button disabled>`) is only for in-flight async and form validity — never for rule-based denial.

   **Hiding the control does not hide the SPACE it was given (#1138).** All nine task-detail skins gated their one action cell behind `hasAction` and then pinned the column around it — 420 to 520px, unconditionally — so a logged-out visitor got a faction-framed panel sized for a sign-up button, wrapped around a 168px score box. Nine files, one omission, and the gated half looked correct in every review of it. A layout pinned in the same component that gates its contents is where this hides: the ternary that reads `desktop ? 440 : "100%"` answers *which form factor*, and the question it also has to answer is *whether there is anything to hold*. §1.1 is the general form — pin a dimension only where the design genuinely requires it — and a width that exists to seat an absent control does not require it. Note that this cuts against reaching for a shared `PANEL_WIDTH`: the spread across the skins is dress, so what gets hoisted is the *shape* of the expression (`actionColumnSize`), never the number.

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
- **Text:** `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary` — three tiers, and the third one is a **temperature** rather than a weight (see below)
- **Borders:** `--color-border`, `--color-border-strong`
- **Factions:** `--faction-{slug}` (primary), `--faction-{slug}-light` (tint), `--faction-{slug}-border`
- **Faction cards:** `--faction-{slug}-card-bg`, `--faction-{slug}-card-text`, `--faction-{slug}-card-accent`, `--faction-{slug}-card-font`
- **Functional:** `--color-success`, `--color-danger`, `--color-warning`. Danger and warning each carry a `-veil` (a tinted fill behind a banner), an `-edge` (a 1–2px rule) and a `-ring` (the stronger outline an outline-button wears), per theme. Danger additionally carries `--color-on-danger`, the ink for text painted **on** the red. There is no `-on-warning` and no `--color-success-*` ladder. Mint a rung when a surface needs it, not before. (This line used to promise a `-light` and a `-border` for all three; only one ever existed, and #1169 deleted it as dead.) **The `-on-warning` half of that is now overdue rather than deliberate (#1413):** two buttons *do* fill with `--color-warning` — the praxis detail's fail-confirm and the admin queue's — and both wear `btn-primary`'s inherited `--color-bg-page`, which is a statement about the page and not about legibility on amber. It clears, at **4.57:1** light and 11.14 dark, so this is hygiene rather than a defect; the reason it is not fixed here is that fixing one of the two sites is exactly the one-at-a-time failure #1168 names, and the other lives on a page outside that issue's scope.
- **Votes:** `--vote-1` through `--vote-5` (orange → yellow → green → blue → magenta, increasing intensity)
- **The rainbow:** `--faction-default-stop-1` through `-stop-7` (red → orange → yellow → green → teal → blue → magenta) as scalars, plus the nine gradient cuts composed from them. This is the site's only rainbow — see below.

**Dark mode** is handled by `[data-theme="dark"]` overrides in `index.css`. Components should use `var(--faction-everymen-card-bg)` — never `dark ? '#1e1a10' : '#fffef5'`.

**Rule:** If you're about to hardcode a hex value in a component, stop. Add it as a CSS variable first.

### The third text tier is a TEMPERATURE, not a weight (#1549)

The neutral vocabulary is three tiers, and only the first step is a step in contrast. `--color-text-primary` → `--color-text-secondary` is a 3.0× drop in ratio; `--color-text-secondary` → `--color-text-tertiary` is a **hue swing at held weight** — a lavender against warm greys, in both cascades, at essentially the same luminance.

**That is arithmetic, not taste.** Secondary bottoms out at 4.96:1 on `--filter-well` in light and 4.87:1 on `--color-bg-surface-alt` in dark, so a third rung that is genuinely *quieter* than secondary and still clears AA has the band [4.50, 4.96] to live in — a 1.10× span against the 3.0× above it. There is no room below secondary for a step anyone could see. A palette can afford two weight tiers over an AA floor and this one already spends both, so the third tier had to find a different axis or stop claiming to exist.

It had been claiming to exist without one. Light ran `#6b6050` / `#6c6358` — one hex step per channel, **ΔE 3.4**, 5.60:1 against 5.37:1 on the page — so every surface reaching for tertiary to sound quieter than secondary got nothing back, and had every reason to hardcode a grey instead. Dark had already made the right call (a lavender at h 296°, ΔE 38.3) and was left untouched; light was walked to the same hue at h 298°, C 20, weight held to within 0.2 L\*. **The dark cascade was the reference and not the patient** — repointing it would have moved ~460 `.eyebrow` sites for no defect.

Three things worth carrying.

**Cool-on-warm recedes at equal luminance**, so "quieter" survives as a perception after it stops being a ratio. A desaturated cool ink on warm paper reads as further away; that is what buys the hierarchy the contrast ladder could not. Chroma is dialled *down* from dark's 27 to 20 for the same reason in reverse — a mid-tone at C 27 reads as a colour on cream and as a tint on near-black, so matching the number would not have matched the voice.

**Neither cascade makes tertiary dimmer than secondary, and dark makes it louder** (6.21:1 against 5.63:1 on the page). If you find a comment claiming tertiary is "one step down", it predates this and is wrong; the file had two, and both were corrected rather than acted on. A rule that routes *away* from tertiary because it is "too faint" is the tell — measure before you believe it, since the same rule in `.filter-factions` cost contrast in dark while claiming to buy it in light.

**A contrast manifest cannot see this class of bug**, which is why the fix ships with a non-ratio guard beside the ratios. Both inks were comfortably AA-clear on every ground the whole time: the maths knows what an ink sits **on** and never what it sits **beside**. `deltaE76` and a floor of 20 across the three tiers in both cascades is #1449's deferred upgrade — that block guards the card family's alarm/notice split with a hex *inequality* and says in its own ponytail that a distance floor is the real answer, to be minted when a repaint walks two inks apart. This was that repaint. **Two tiers a viewer cannot tell apart are one tier with two names**, and a hex inequality passes them both.

### Contrast is a pairing, not a property (#1028)

A measurement belongs to a **hue on a ground**. It survives exactly as long as both halves do, and the task-detail epic broke that in two ways that each turned up independently on three separate skins.

**A new ground invalidates every contrast claim measured on the old one.** Everymen, WOW and Ephemerists each hit this without knowing the others had: a token that had cleared AA for releases stopped clearing the moment its surface was repainted, and nothing warns you — the token is unchanged, so it looks untouched. Ephemerists is the worked example. A task *card* is one plate sitting on the app's page ground; a task *detail* **is** the plate, so it gained a page ground of its own and a second sheet for the panel cells, and it sets quiet type on all three. The design's `muted` brown clears 4.60:1 on the plate and only 4.31:1 on the page beneath it. The fix is not to branch per ground at the call site — it is to walk the ink down until it clears on **every** ground that surface has (`--faction-ephemerists-plate-quiet`: page 5.25, plate 5.60, inner 6.20), so a skin never has to know which sheet a label landed on. **When a surface gains a sheet, re-measure the inks it already had.**

**A sheet can also arrive as a PANEL, and a shared slot is where you find out (#1173).** The rule above assumes the surface was repainted. It applies just as hard when nothing changed and the skin merely inset a plate: every duel seal mounts `StakesTiles` and `RaceRoster` on a deeper stock than its body ground and hands them `theme.muted`, an ink measured on the *sheet*. Two of the eight sat under AA there — WOW's `--faction-wow-card-muted` at **4.24:1** on the chronicle panel, `--everymen-muted` at **4.25:1** on `--everymen-paper-deep` — while both cleared on the body ground the whole time (4.76 / 5.09). So `-quiet` is now the standing name for *same role, second ground*: `--faction-wow-chronicle-quiet` (4.86) and `--everymen-quiet` (4.77) join `--faction-ephemerists-plate-quiet`, each a **sibling** that leaves the original ink every job it already had. Reaching for some other existing ink at the call site is the tempting shortcut and it does not survive the third faction: `-card-notice` clears on WOW's plate and Everymen's panel and fails the Ephemerists band at 4.43 — and it would recolour the tie line and the tile captions, which are muted-role, not a notice. **A named ink per (role, ground) beats a per-skin exception.**

**An accent can clear AA as a rule or a fill and still fail as body ink — and that is a token split, not a usage convention.** "Never paint text in this one" is a rule a future editor has to remember; a second token is a rule the cascade enforces. `--everymen-red` pays 4.95:1 on the light broadsheet panel and 3.73:1 on the dark one, so ink got its own name — `--faction-everymen-sheet-accent`, walked up in the dark cascade to 5.45:1 — while dashed rules and filled bars keep `--everymen-red`. WOW's gold and the WOW duel rail's opponent accent state the same constraint as a usage convention *because they genuinely have no text pairing*: nothing legible is ever painted in either. The moment a surface does want the accent as text, mint the ink token rather than writing the caution down.

**A block whose ink you do not control gets the stock that ink was measured on (#1118).** The corollary of the first rule, and the one that decides a shared page's grounds. A skin that dresses a shared layout mounts components it did not write, and each arrived carrying its own inks: the vote summary paints `--color-text-secondary`, which FLIPS with the theme, so it needs a ground that flips with it; `SnideScoreStamp`'s evidence tag is acid on a `rgba(0,0,0,0.4)` well and `SnideVote`'s amp face is a black chassis, both measured on photocopier ink, and acid on cream paper is 2.6:1. The S.N.I.D.E. praxis detail therefore runs two grounds side by side — flipping clippings and an always-dark plate — and which block gets which is a measurement rather than a taste call. **Do not unify a rail's panels for tidiness; check what each mounted component's inks were measured against first.**

**But "you do not control it" is often just a missing seam, and the seam beats the ground (#1153).** `DuelCard` was the fourth block in that list until every one of the nine praxis-detail skins hit it independently — Coven, S.N.I.D.E., Singularity and UA each reported the same thing, that the card's frame and label were dressable and the duellist names, totals and verdict were not, so the most prominent slot in the aside sat in Default furniture inside a fully dressed page. The escapes available without a seam are all worse than a prop. Choosing the ground the foreign ink was measured on is correct but limited: it dresses the *stock* and leaves the *ink* someone else's, which is fidelity lost, not a contrast bug. Re-pointing the tokens for the subtree works — Singularity had to, being near-black in both themes where the shared component assumed light-in-light — but a re-point is invisible from the component's side and lands on **everything** underneath rather than the four slots that were meant. And a per-skin fork of the component is the divergence a shared layout exists to prevent. So: **when a shared component's ink is wrong on your ground, add the ink prop to the component once rather than working around it eight times** — defaulting every field to what it painted before, so a faction that passes nothing is byte-identical. The ground rule above survives intact; it decides where a block sits when the ink genuinely is not yours, which after a seam lands is a smaller set.

**And the ground a mounted component needs is not always a contrast question (#1119).** The last of the nine praxis-detail skins found the same rule binding through a different mechanism, which is worth naming because the failure looks nothing like a contrast failure. UA's rail plates are `--faction-ua-card-bg` and may not be `-lift` or `-panel`, for two reasons that arrive from opposite directions: `UaScoreStamp`'s box is `--faction-ua-card-box-bg`, which *lifts* off the sheet in light and *sinks below* it in dark, so a plate already painted in the lift erases the box in one theme only; and `UaVote`'s mandala punches its cores to `--faction-ua-card-bg` **so the figure reads as an aperture** — on any other stock the cutout stops being a hole and the bloom becomes a disc. Nothing here is illegible; the drawing is simply wrong. So the question to ask of a mounted component is wider than "what were its inks measured on": it is **what did it assume it was sitting on**, and a punched-out core, a nested well or a shadow calibrated to one sheet all answer it as firmly as a contrast ratio does.

The third variant of this — a design kit's own annotations measured against the kit's plate rather than ours — is §6's, under "Reading a design kit".

**A SHARED faction-themed component owes its inks to eight sheets, not to the app (#694).** The two shapes above are about one surface; this is about one component mounted on all of them, and it fails in two ways that look nothing alike until you measure.

The first is a **token used in the wrong role**. `--faction-{slug}-card-muted` is muted *text* — every caller in the app reads it as `color:` — and the collab roster's cast row read it as `background:`. That renders as a slab of ink with the accent pill printed on top: **1.05:1 in light, 1.17:1 in dark**, the worst pairing yet measured in this repo, and the member's own name at 1.99:1 beside it. The role of a token is not a comment on it, so nothing catches this; the guard against it is that only one member of the card family is a surface. `card-bg` is the sheet, `light` is a tint wash, and everything else — `-text`, `-muted`, `-accent`, `-notice`, `-credit` — is ink. A cast row therefore fills with `card-bg` and sets its own `card-text`, which has the second virtue of making the rendered pairing identical to one `CARD_PAIRS` has gated since #651. **A row that paints its own ground must paint its own ink**; an inherited colour is whatever the mount happened to set, and a shared component has several mounts.

The second is a **global functional ink on faction paper**. `--color-warning` and `--color-success` were chosen against the app's near-white surface and are correct there. On UA's cream the warning is 4.14:1 as the "still weaving" pill and 3.98:1 under the holdout banner's amber veil; on S.N.I.D.E.'s near-black card the success green is 2.07:1. The fix is not to deepen the global token — that repoints a colour eight other surfaces read as a fill and a rule, and it cannot work anyway: **these inks flip on the SHEET's polarity, not on the theme.** Six card sheets are light by day and dark by night, but S.N.I.D.E.'s and Singularity's are dark in both (§6), so no single light-theme value clears both `#f7e7d2` and `#14110b`. That is the shape that forces a per-faction token rather than a global one, and it is worth recognising early: if a colour must differ between two factions *within one theme*, it is a faction token no matter how functional the word for it sounds. Hence `--faction-{slug}-card-notice` and `--faction-{slug}-card-credit` — new members of the card ink family, measured against `--faction-{slug}-card-bg` in both themes.

**A veil is part of the pairing.** The holdout banner lays `rgba(234,179,8,0.08)` over the sheet before the ink lands, which pulls the ground *toward* the ink on a light sheet and away from it on a dark one — the veiled reading is the tighter one in both directions, so it is the one that gates. `Pair` in the token test now takes a `veil`, because a manifest that can only ask "is this ink legible on that sheet" asks the wrong question the moment anything is laid over the sheet.

**Neither guard could have caught any of it, and the reasons differ.** The token test measures a token against the surface its *documentation* names, and `--color-warning` documents no faction surface — the pairing was not merely missing from the manifest, it was unrepresentable in it. The nightly sweep walks six read routes, and the composer is on none of them; worse, the failing row only exists in a *state* (two or more members, some but not all cast) that no route walk produces. **"The surface is skinned by a faction" is not the same claim as "the sweep has been there"** — before trusting either guard on a surface, check that the route is walked and that the state is reachable.

**The second instance found the same ink family on sixteen more surfaces, and the reason it went unfound is the useful part (#1168).** UA's duel seal skin measured `--color-danger` at 3.98:1 on its own cream and routed its forfeit body to `-card-notice`, keeping the red as a rule beside the paragraph — a correct fix, made **one skin at a time**, which is the failure mode this whole section exists to name. The other fifteen seal dialogs were then measured together and five more bodies were below AA: Default 4.40 on the page, Coven 4.31 on its pink board, WOW 4.40 on the lists cream, Singularity 4.03 on the terminal, and Everymen at **4.49 light / 4.16 dark** in `--everymen-red` — the only body pairing in the family that failed in *both* themes, and one this document had already half-caught, since §3 records the 4.49 and adds "nothing on this card sets PROSE in it". Something did. **When a skin routes around a global ink, the sibling skins have the same pairing and nobody has looked.**

**And where a shared slot hardcodes the ink, "route it per skin" is not available — that is a missing seam, not a missing measurement.** `StakesTiles` and `RaceRoster` painted the win figure and the "sealed" mark in `--color-success` with no prop, so no skin could reach them however carefully it measured: 2.07:1 on S.N.I.D.E.'s photocopier ink, 1.99:1 on Singularity's terminal glass, 1.88:1 on Everymen's *forfeit* panel — the last of which is the sharpest version of the rule, because that panel inverts to ink on a **mode** branch while the token flips on the **theme**, so the two polarities disagree inside one render. `DuelSlotTheme` now takes `credit` and `alarm`, defaulting to exactly what the slots painted before. This is `DuelCardInk` (#1153) again, and the same two details carry over: **default every field to today's value** so a skin passing nothing is byte-identical, and **resolve field-by-field rather than by spread**, which Everymen relies on directly — it passes `credit` only on the ink branch and `undefined` otherwise, and a spread would let that `undefined` erase the default. Nothing new was minted; `-card-notice` and `-card-credit` already existed for all eight, and Everymen's inverted panel took the faction's own gold.

Two calibrations worth keeping. **Check the size before the threshold**: the roster's "sealed" mark is 18px regular and owes 4.5:1, while the win figure beside it is 24px bold and owes 3:1 — the *smaller* text is what gates a shared ink, and the zero figure in `--color-danger` clears 3:1 on all nine grounds and is therefore left red on every one of them. And **a pairing that passes is left alone and written down anyway**: Ephemerists needed no change at all, and its zero figure at 3.01:1 is now a row precisely because that margin would vanish under any darkening of its ledger band.

**A token with two roles is measured in one of them (#1169, absorbing #1174).** `--color-danger` is an *ink* in ~30 places and a *fill* in eight, and only the ink role was ever measured — including by the nine seal rows above, which is why they read green while the forfeit **button** beside them sat at 2.77:1. The fill role had no ink of its own, so the eight sites each grabbed whichever pale token was nearby: `--color-text-on-accent` (4.83 light / **2.77 dark**), `--color-bg-page` (**4.40 light** / 6.72 dark) and, on two flag-reason chips, the *translucent* `--color-bg-surface`, which composited over the red in dark leaves the selected label at **1.04:1** — invisible, and unfindable by any guard that reads the token's declared value instead of compositing it. The fix has the shape #649 and #924 already set: **a fill gets a named ink** (`--color-on-danger`), never a nearby neutral, because a neutral is a statement about the page ground and not about legibility on red. Deepening `--color-danger` in dark was the rejected lever — it is the same token the ink role reads. And the tell that the family was never designed: twenty-seven sites wrote `rgba(220,38,38,·)` by hand at **eleven distinct alphas**, in the light hue, in both themes. `local/no-raw-style-values` does not cover colour, so all eleven linted clean; **a raw `rgba()` of a token's own hue is a hardcoded hex wearing a costume**, and it is what the `-veil` / `-edge` / `-ring` rungs now name.

**The third instance is the one the two guards were built for and still missed, and the reason is that nobody asked (#1302).** `components/praxisCard/shared.tsx` is a shared component mounted inside every faction's card frame, and it set all three global functional inks: the moderation badges and the moderator's hide/fail controls in `--color-danger` / `--color-warning`, the mode chip's duel and still-open marks in the same pair, its collaboration mark in `--color-success`. Thirty of the eighty assertions the new rows make went red, twenty-eight of them in light — worst `--color-success` at **1.96:1** on S.N.I.D.E.'s plate and **2.03:1** on the Singularity terminal, and `--color-danger` under **4.5:1 on all eight sheets** as the chip — and two failed in dark. The fix mints nothing: `factionCssVar` resolves `-card-notice` / `-card-credit` / `-card-muted` off `task_faction_slug`, the same slug the archetype dispatches on. **After a mechanism exists, the remaining instances are found by asking which shared components render inside a faction frame — not by waiting for one to be reported.**

Three things this instance adds. **The sheet is not always `--faction-{key}-card-bg`, and the manifest has to name the one that is painted.** Four of the eight praxis-card archetypes ground on a different token — `--faction-ua-panel` (the parchment ramp's darkest stop, since `parseColor` cannot read a gradient), `--faction-coven-ward-card`, `--faction-ephemerists-plate-bg`, `--faction-wow-chronicle-bg` — and the Ephemerists pair is a whole shade apart in dark (`#171a26` against `#211a10`). `ROSTER_PAIRS` gates those same inks on `-card-bg`, which for half the set is a different question. **A WASH MADE OF THE INK'S OWN HUE CAN ONLY TIGHTEN THE READING**, so it is part of the pairing in the direction that always costs: the chip's 12% self-tint took the Ephemerists plate to 4.41:1 where the bare sheet reads 5.20:1, and the `hidden` badge's 5% tint took WOW to 4.48:1 — the badge's wash is *deleted* rather than restated, because at 5% it was imperceptible on every sheet and only ever spent margin. And the raw `rgba(107,114,128, …)` that badge carried is #1169's costume worn by a **neutral**: a grey matching no token in either theme, invisible to `local/no-raw-style-values`, reading 2.94:1 on S.N.I.D.E. — the tell being that a *neutral* is a claim about the page ground, and this mark is never on the page.

**Where a role has one ink, two roles collapse onto it, and that is a decision to write down rather than a thing to notice later.** `-card-notice` was the card family's whole attention role, so danger and warning printed the same colour on this surface: the flagged and failed badges (mutually exclusive) and the hide/fail controls (side by side) lost their red/amber severity cue. Nothing is owed to WCAG 1.4.1 — each mark carries its own word — so the flattening shipped, with the upgrade path named at `sheetInk`'s declaration. **A deliberate flattening gets a `ponytail:` comment at the seam, not a silence** — and that comment is the whole reason the reversal below cost one afternoon instead of an investigation.

**The reversal (#1449) says what the rung is actually for: a fix is not a place to spend a distinction you were not asked to spend.** Routing four marks off the global inks was right; taking the second hue away while doing it was a second change riding along with the first, and the argument for it — the marks are textual, so 1.4.1 already holds — answers a question nobody had. **Compliance was never what the colour was doing.** An admin scanning a moderation queue is performing exactly the at-a-glance triage colour exists for, and this is the one surface in the app where two alarm states sit *adjacent*: `hide` and `fail` are neighbouring buttons, and misclicking them at speed is the cost. So `--faction-{key}-card-alarm` now exists for all eight keys in both cascades — the family's third functional ink, `--color-danger` walked to where it clears on paper exactly as `-card-notice` walked `--color-warning` down.

Three things worth carrying forward from it. **Which mark takes which was not re-decided, and did not have to be**: every one of the four already wore #1169's `-veil` and `-edge` rungs (`--color-danger-*` behind flagged and `hide`, `--color-warning-*` behind failed and `fail`), which *is* the red/amber assignment their ink carried before #1302 pooled it — so the ink simply rejoined its own wash. **When a flattening is undone, the split is usually still recorded somewhere in the chrome the flattening did not touch; read it before inventing one.**

**Both obvious values were measured and both failed**, which is the §3 rule about hand-derived ratios landing on a two-line change. Red-700 `#b91c1c` — one step off the global danger hue — reads **4.44:1** on the Ephemerists plate under the danger veil, and dark's own `--color-danger` (`#f87171`) reads **4.33:1** on the UA panel, where that veil is 14% and *lifts* the ground toward the ink. The shipped pair (`#991b1b` light, `#fca5a5` bright) bottoms out at 5.70:1.

And **a contrast manifest cannot see a collapse**, which is why this one survived a guard built to catch exactly this token family. Every pairing it made was comfortably clear of AA the entire time: the maths knows what an ink sits **on** and never what it sits **beside**. So the file now carries a non-ratio assertion beside the ratios — that `-card-alarm` and `-card-notice` resolve to two different values on every sheet in both themes — because without it a one-line `var()` alias restores the collapse with every row still green. **A guard that measures a token against a ground is blind to a token measured against its neighbour.**

**And a TRANSLUCENT surface is not a ground at all — which is why nothing above could reach it (#1413).** Every rule in this section starts "a ground is repainted / a sheet arrives / a panel is inset", and each assumes the surface *has* a value. `--color-bg-surface` does not: it is `rgba(255,255,255,0.72)` in light and `0.04` in dark, so a card filled with it composites against whatever it happens to be mounted on. `.sidebar-card` is the app's neutral chrome, and ADR-0061 mounts the praxis detail's steward bar and report card **bare** on all nine faction walls precisely so moderation reads the same everywhere — a promise the frost was quietly breaking. Over Singularity's always-dark terminal the same 72% white resolves to a mid-grey: `--color-danger` **2.54:1**, `--color-warning` 2.65, `--color-text-tertiary` 3.11, and one dark failure too (Everymen secondary, 4.15). **It was reported by eye because it was unassertable, not merely unmeasured**: `parseColor` cannot read a browser composite, so no `Pair` can name "72% white over whatever this is mounted on", and the token test measured every one of these inks and stayed green. `contrastRatio` now **throws** on a translucent surface rather than documenting that it must not be given one; a doc comment is not a guard.

The fix is a stock question, not an ink one, and the direction matters: **repointing these ten marks to faction inks is actively wrong** — `--faction-singularity-card-alarm` reads 1.00:1 on that near-white composite — because the global inks are correct against the stock this card is *supposed* to have. So `.sidebar-card` paints the frost as a background **image** over `background-color: var(--card-ground, transparent)`, and `.card-on-page` names `--color-bg-page`, the stock those inks were chosen on (#1118, arriving through a fourth mechanism). Two properties of that shape are what make it cheap. **Unset is byte-identical**: `transparent` composites to exactly today's render, so every card that genuinely means to frost what is behind it — and the blur that goes with it — is untouched, which is why this is not "make `.sidebar-card` opaque". And **nine rows collapse to one**: the ground stops being a function of the skin, so there is one pairing to measure instead of nine. Worst reading 4.71:1 against 2.54. Do not reach for `backdrop-filter: none` on the grounded case just because the blur is now invisible under an opaque fill — that filter is what makes the card a containing block, which #1148 depends on.

Two things the audit around it settled. **`.btn-outline` is the same shape and adds nothing**: it fills with the same token, but every praxis-detail mount save one is *inside* these cards, and the exception prints `--color-text-primary`, which runs 9.76:1 to 18.43 over the frost on all nine walls. A shape you have just named is not automatically a bug everywhere it appears; measure before you generalise. And the dark half of this hazard was already written down at `--faction-wow-court-glow` — a 4% fill lets the page ground through essentially undimmed, and WOW paid for it by dialling its own backdrop glow down rather than by questioning the surface. **When a faction tunes its backdrop to survive a card mounted on it, the card is the thing to look at.**

### There is one rainbow, and `na` is it (#1219, ADR-0066)

> **The brand and N/A should be the same rainbow. N/A is essentially the neutral site look.** — owner, 2026-07-29

The site ran **two** rainbows for a long time without either knowing about the other: the na spectrum (`--faction-default-*`, seven hues, nine cuts, both themes) and a six-hue brand palette (`--underline-1…6`, a resequenced near-copy, **no dark form at all**) that dressed the nav wordmark, every page title, the Home hero, the field desk and the level-up popup. A census turned up nineteen multi-hue definitions across six hue sets; two of the six were this one duplication, and a third copy of the same hexes sat in `--fdl-rainbow`. The brand palette is retired; the na spectrum is the site's rainbow, and the unaffiliated player's identity is one *use* of it rather than the whole of it.

**The spectrum is now scalars first and gradients second, because a gradient token cannot be indexed.** `--faction-default-stop-1…7` are the source; every cut composes from them with `var()`. That inversion is what the duplication was hiding: the surfaces that reached for a second palette were all cycling stops *by position* — a per-letter title bar, an ability row's dingbat, a confetti flake, a hard-wedge seal — and a `linear-gradient()` cannot answer "give me stop 3". If you find yourself copying hues out of a ramp, you want the stops.

**Retiring a palette is three migrations, not a find-and-replace.** Its consumers were three different shapes wearing one set of hues, and each shape lands somewhere different: index-cycling consumers take the seven stops; narrow marks (a 2px wordmark rule, a 6px progress fill) take the **short cuts that already exist** — `--faction-default-total-rainbow` (4 stops) and `-eyebrow-rainbow` (3) — because a mark that narrow cannot spend seven stops legibly; and a surface using one stop alone as a gold was never a rainbow use at all and takes `--faction-default-gold`. Nothing new was minted for the second and third shapes. **Before replacing a rainbow reference, ask what it was drawing.**

**The cycle length is not a constant.** Going six stops to seven broke the one place that had written the number down: the level-up seal's wedges were `idx * 60deg`. They are `360 / stops` now. A cycling consumer that hardcodes its count is a bug waiting for the next re-cut.

**Brand chrome flips with the theme — one palette, one behaviour, no exceptions.** This is the owner's ruling and it is the part that changed rendered output rather than moving values around: the nav wordmark, the page titles and the level-up popup rendered identical hexes in both themes, and now inherit the brightened dark stops. Those stops were tuned to sit on a **dark faction card**, not behind nav text, so the chrome that inherited them is the pairing to re-check whenever a stop moves. It amends ADR-0054, which called the Task Crown ring a fixed brand constant in both themes.

**A token whose entire content would be "that other token, turned" is a name pretending to be a value (#1213).** The Task Crown's ring was `--fdl-rainbow`, the third copy of the brand hexes and the last to go. What made it hard to retire was not the hues — the seam-closed conic it wanted already existed — but the `from 90deg` it added on top. Keeping it as a one-line rotation of `--faction-default-rainbow-conic` would have preserved a name that carried no value of its own, so the token is **gone** and `TaskCrown` reads the conic directly. The start angle went with it, because it pinned gold to 3 o'clock in a hue sequence that no longer exists and a plain circular ramp has no feature at any angle for an offset to place. **Before writing a token that wraps another token, check whether the wrapper is geometry the consumer could carry itself.**

**Inline per-stop alpha is what keeps a wash off the spectrum token, and it can usually move into `opacity` (#1213).** `.alb-rainbow` hand-wrote the seamless loop for one reason: its stops were `rgba(…, .3)` and the token's are opaque. For an empty blended layer the two places are exactly interchangeable — the composite is linear in the source alpha, and the source alpha is *stop-alpha × opacity* — so `.3` under `opacity: .5` becomes `opacity: .15` with no visible change on any backdrop. **The equivalence needs every stop to carry the SAME alpha**; a ramp with per-stop alphas interpolates differently once flattened, and moving that into `opacity` is a repaint, not a refactor. When a hand-rolled gradient looks like a token plus transparency, that is the arithmetic to do first.

**A partial fill of a spectrum bar is a WINDOW onto the track's rainbow, not a whole rainbow squeezed into the fill (#1128).** The sidebar's slot-usage bar sizes `--faction-default-rainbow` to `(100/percent)%` of the *fill*, which resolves to exactly one track width, so 1 of 5 slots reveals red→orange and 5 of 5 reveals the whole spectrum with every visible stop the same physical width at either. Sizing to the fill instead is the light-mode bleed of #1127 by another route — seven near-equal-luminance stops crushed into 40px. **Whether a percentage `background-size` is right depends on how many elements the ramp is spread over, not on the units:** `DefaultVote` (#842) needed a px span because its five separate dots each restarted the ramp and gave "five little rainbows, not one"; a single fill has nothing to restart, so the percentage is exact there. Guard the zero case — `100/0` emits `Infinity%`, an invalid declaration. And a bar that drifts is spending a *tiling* cut (`-rainbow-loop`); a bar that rests is spending the one-pass ramp, whose red↔magenta seam only ever shows if something repeats or moves it.

**A READ-ONLY twin of an interactive mark inherits its geometry rule and none of its affordances (#1143).** The Who-voted rung on the praxis detail is `DefaultVote` after the cast: same five dots, same one-rainbow-windowed px span, filled to the value someone already chose. What does not come across is everything that existed because the caster is an *input* — the ≥44px WCAG touch box and the pitch that box implied, hover, `selected` scale, the tier caption, the `--spectrum-glow-*` bloom, the rising-wave bob. Freed of the touch target the readout is about a third the size, which is why the pitch is re-derived rather than copied: the span is the ruler, so it has to be measured off the boxes actually drawn. And when the readout drops a *numeral* to become dots, the value has left the accessible name with it — the dot row takes `role="img"` and says the figure there, or the panel silently stops telling a screen reader who voted what.

**Three hues are still restated on purpose, and each says so at its own declaration.** `--badge-victor-stop-*` and `--spectrum-glow-*` are theme-invariant *identities*; `--faction-default-chip` is a fixed green→blue pill whose white ink is measured on its two exact values, so composing it from stops 4 and 6 would flip it and put white on a brightened green. That is the shape of a legitimate exception: **a hue restated deliberately carries its reason at the declaration**, or the next sweep tokenizes it and breaks something.

And one thing the merge cost, worth knowing before the next re-cut: **a stop is load-bearing across surfaces that never used to share one.** Moving the dark yellow now moves the na card's POINTS caption, the Singularity credits accent, every page title's third letter and the level-up rule together. That is the point of one source, and it is also the new blast radius.

**Chrome that RINGS itself in the spectrum needs an opaque interior, and the interior is a token rather than a surface (#1365).** The filter bar's rails paint `--faction-default-rainbow` on `border-box` over a flat fill on `padding-box` — `factionFill`'s `pill` / `frame` trick spent on a control instead of an avatar. Both of the app's lifted surfaces are **alpha**: `--color-bg-surface` is `rgba(255,255,255,0.72)` light and `0.04` dark, and `-alt` is opaque light but alpha dark, so either one lets the ring show straight through the middle of the track — in one theme only, which is the kind of bug a light-mode review never sees. `--filter-well` is the interior, and it is composed rather than declared twice: `color-mix(in srgb, var(--color-text-primary) 6%, var(--color-bg-page))` is a lift on both page grounds from one declaration, and it moves when the page ground moves instead of being a second value to re-tune. The same arithmetic gives the sliding thumb (`--filter-thumb` at 10%, `--filter-thumb-edge` at 18%). **A design authored dark-only in `rgba(240,230,208,·)` is usually saying "the theme's ink at N%"** — said that way, it arrives in light for free.

**A faction hue used as GLOBAL chrome is the same category error as a rainbow used as ink.** The filter redesign reached for `var(--faction-snide)` as its selection accent everywhere — checkbox fill, links, the applied-count badge — which would have painted every browse page's filter row in one faction's identity, on a surface every player sees. The neutral replacement was already in the repo and needed no new token: the retired `FilterStamps` had always inverted `--color-text-primary` / `--color-bg-page` for its active state, and the bar that replaced it (#1368) inherited the idiom — a pairing that is AA-clear in both themes by construction and belongs to nobody. The spectrum ring is the one faction-adjacent thing the bar keeps, and only because `na` ≡ site default is one identity. **When a design hands global chrome a faction's variable, look for the existing neutral idiom before minting an accent.**

### Unaffiliated grey is usually a FILL written as a border (#983, #805)

ADR-0039 draws one line: an unaffiliated player's identity is a gradient, so it appears wherever a gradient is expressible (`background:`, an SVG `fill=`) and stays neutral grey where one is not (`color:`, `border: Npx solid`). The line holds. What keeps going wrong is which side a given accent is actually on — and the answer is usually decided by how somebody happened to type it, not by what it is.

**A rule drawn as a `border` is a fill that lost an argument with the shorthand.** The feed's headline accent read grey for every `na` row purely because it was written `borderLeft: 3px solid ${accent}`; drawn instead as a 3px element it is a fill, and the spectrum arrives with no ADR amendment and no change for the seven themed factions. Same story in the Meadow: an SVG `fill` takes `url(#…)`, so the bloom's soft wash was never a scalar — it had simply been switched off (`fill="none"`) for unaffiliated players, which cost them the flower shape and left a scatter of hard dots. **Before accepting that a surface owes `na` grey, check whether it is genuinely ink or merely a fill in a scalar's clothing.**

**The same border, one level up, was worse than grey — it was ink (#1148).** The feed *chassis* drew its 4px left edge as `borderLeft: 4px solid card-accent`, and because a border can only take a scalar, the only token available was the na card's accent **ink**: near-black `#1a1209` on the cream sheet in light, near-white `#f0e6d0` in dark. That token is right where it is read as `color:` (about a dozen surfaces, plus a contrast row that measures it), so the fix is never to repoint it — **a token with one wrong consumer is a wrong consumer.** Drawn as an element it takes `factionFill(slug, 'rule')` — the vertical ramp for `na`, and a flat hue for anyone else. Note that "unchanged for the themed factions" is a claim about *dispatch*, not about the value: a real faction's fill is its **spine hue**, where the scalar path was reading its card **ink**, and the two are different tokens. That substitution is invisible here only because all eight registered frames claim `feedFrame` and nothing reaches the fallback. It is worth knowing before the next border-to-fill conversion lands somewhere a themed faction does render. Three things this case adds to the pattern above. **The width is not automatically the row rule's width**: 4px was kept rather than harmonised to the headline's 3px, because this rule runs the whole height of a card instead of one line of text. **A stretched edge needs the card's corner, and `overflow: hidden` on the card is not always available to give it**: the two companion bodies inside a feed card open `position: fixed` modals, and `.sidebar-card` sets `backdrop-filter`, which already makes the card their containing block — so clipping the card would clip a modal. The clip goes on an inert `aria-hidden` ornament layer instead (the shape `CovenFeedFrame`'s spark field already uses), at `inset: -1` so the 4px reads from the border box exactly as the border did. **And a layer above the band is the better render, not a compromise**: the rule now runs unbroken past the kicker band's hairline, where the border started below it.

**A card that hosts a POPOVER can never clip either, and a stripe does not need it to (#1255).** The same lesson on a different surface. Four comment cards — the na sheet, the Coven slip, the Singularity pane, the WOW sheet — set `overflow: hidden` to hold a full-bleed decoration inside their own corner, and every one of them also wraps the composer, whose @-mention listbox is an absolutely positioned child. `z-index` is no defence: a clipping ancestor cuts a descendant off whatever its stacking order. **So the question is never "may this card clip?" but "what is downstream of the clip?"** — a composer, a menu, a tooltip or a modal makes the answer no. The fix that adds no DOM: **an element's background is clipped by its OWN `border-radius`**, so the stripe carries the card's top corners itself and the card keeps nothing but its radius. The arc it draws is its own height rather than the card's radius, because a radius is scaled down to the box that carries it — at 3–4px tall that is the same mark to the eye, which is why this answer fits a hairline and not a tall ornament. A clip that must survive goes on an inert `aria-hidden` layer with nothing interactive inside it (the shape #1148 landed on). And where the clip was decorating nothing — Singularity takes no radius and its scrim is already `inset: 0` — the line just goes.

**Count the slugs that reach a fallback before you call a repaint na-only.** This one was filed as na-only on a correct census that went stale a week later: `DefaultFeedFrame` is `pickVariant`'s fallback and all seven themed factions claim `feedFrame`, but **Albescent claims it too and renders the fallback itself** (`<DefaultFeedFrame slug="albescent" …/>`, #1203). `albescent ≡ na + drift` (ADR-0048) makes that the right outcome rather than a surprise — the whole design of every Albescent surface is the na component with light over it, so anything repainting `na` repaints Albescent **by construction**, which is the property those wrappers exist to have. It is still worth stating in the issue: the second slug is the one whose *containment* test can move.

**The spectrum comes in ramps cut for their geometry, and the cut is `factionFill`'s job, not the caller's.** `bar` is a 90deg ramp, `dot` a conic (a 7-stop linear at 10–12px is mud), and `rule` — `bar` stood on end — a 180deg one, because seven stops across a 3px-wide vertical rule is the same mud in the other axis. A themed faction returns the identical solid hue for all of them; only `na` is shape-dependent, which is what lets a call site swap `factionCssVar` for `factionFill` without restyling anybody else.

**A hard edge needs a VALUE difference, and this palette has almost none (#1127).** The na conic came in two cuts — a smooth sweep and seven hard wedges — and the wedge cut was the one na ring on every circular surface in the app. It read as a single dark band in light mode, and the palette is the whole explanation: all seven light stops sit inside a WCAG-luminance band of **0.184** (mean adjacent ΔL 0.069), so the hue varies and the *value* barely does. Seven hard-edged wedges of near-equal value have nothing to separate them. Dark has nearly double the spread (0.347), which is why the identical ring read correctly there and the complaint was always about light mode. **Owner ruling: the ring goes smooth**, which collapsed the wedge token into `--faction-default-rainbow-conic` outright — a smooth sweep has no edges to fail to distinguish, so the failure mode is gone rather than tuned. Before drawing a boundary in this spectrum, check whether the two hues either side of it differ in anything but hue.

**But wedges are not banned, because a wedge boundary is a LANDMARK.** This is the distinction that outlived the token, and it is easy to collapse in the wrong direction. A hard-wedge conic has features on it, so a `from <angle>` places a hue deliberately — the level-up seal starts at `from -60deg` and is right to. A seam-closed *smooth* ramp has no feature at any angle, so a start offset places nothing, which is why the Task Crown's `from 90deg` went in the bin with `--fdl-rainbow` (#1213). The surviving rule is about ownership rather than shape: **a surface that genuinely wants wedges composes them from `--faction-default-stop-*` itself** rather than the file carrying a second gradient token for one caller. Cheap since #1220 made the stops indexable, and it keeps the geometry next to the surface that chose it.

**One linear ramp was hiding on a circle.** `FactionAvatar`'s na ring painted the **90deg linear** spectrum on a `border-radius: 50%` element, so it smeared left-to-right across the disc while every other na circle swept a conic. Nobody reported it; it surfaced only because smoothing the wedge ring would have left it as the last inconsistency of exactly the kind that issue was titled after. **When you change one cut, grep for the surfaces taking a different one on the same geometry.**

**What stays grey stays grey, and it is a decision.** Actor names, kickers and links in the feed are single-ink text: no stop of a seven-stop ramp is legible as one (#649), and `background-clip: text` buys the spectrum at the price of text selection and high-contrast modes. Unaffiliated actor text is grey on purpose. Reporting it as a bug is how the wrong fix gets built.

### Albescent has no theme, on purpose (#783)

Albescent is a secret society hiding in plain sight, so it is the one faction with **no `--faction-albescent-*` block and no slot in `FACTION_RAINBOW_ORDER`**. It maps to `default` in `CSS_KEY`, exactly as `na` does, which makes `isKnownFaction('albescent')` **false**. That is the intended outcome, not a gap: every surface that branches on that predicate hands Albescent the unaffiliated treatment automatically, including surfaces built later.

Its manifest (`factions/albescent.ts`) is therefore almost empty, and that is the design — the override-only seam means declaring nothing renders Default everywhere. Do not add wrappers that "render Default for Albescent"; a wrapper that adds nothing is a place for divergence to creep back in.

Two traps, both of which have already been sprung:

- **Do not give it a token block cloned from `--faction-default-*`.** `isKnownFaction` would go true, Albescent would take the real-faction branch, and it would get a **solid** fill while an unaffiliated player beside it gets `factionFill`'s **gradient** — flatter and greyer, so *more* conspicuous. Pointing the token at a gradient does not help either: the same token is read in scalar contexts (`color:`, `border-color:`) where a gradient is invalid.
- **A per-faction voice is as identifying as a per-faction colour.** Albescent's vote vocabulary ("Unseeing → Inscribed") and comment dialect ("Vigil the Third") both had to go, because they rendered to every viewer on ordinary surfaces. If you add a per-faction *word*, ask the same question you would ask of a hue.

The one exception is the **reveal surfaces** — the invitation letter, the sealed placeholder, the `/factions` tile — which are only ever shown to an account already revealed to the society. They read the private `--albescent-reveal-*` palette by direct reference, never through `factionCssVar`. That palette is not a theme and must not become one.

**What unfreezing a surface may and may not do (ADR-0048).** "Frozen" now means "frozen *until designed*", and surfaces come off the freeze one at a time — the praxis card first (#821), the task card second (#1023), the **task detail** third (#1038), the **praxis detail** fourth (#1140). ADR-0046's blanket *registration* freeze was **Reversed** with the praxis-detail epic (#1151), so Albescent now registers surfaces like any other faction; that changes *whether* a row may exist, never *what shape* it takes. Everything above still holds: none of them adds a `--faction-albescent-*` token, because the released surfaces are **`Default` plus a flourish**, never a skin of their own. Each renders the exact `Default*` component an unaffiliated player sees and washes MOTION over it (a rainbow drift, a spectrum edge that travels, an aurora that breathes) — the shimmer that reveals the society to someone already looking. `AlbescentTaskCard` is the shape to copy: it forwards its whole prop object to `DefaultTaskCard` and adds two overlay classes, so a change to the na card or to the card contract reaches Albescent with no edit.

Three things the task-detail wrapper settled that the next unfreeze inherits:

- **A flourish is clipped to the COMPONENT, not the viewport** — the general rule, and what it cost the wave, are in §5. `.alb-detail` is the 1200 column itself, and every light layer insets by `--space-2xl` top and bottom to land exactly on `DefaultTaskDetail`'s own sheet.
- **On an opaque sheet, the flourish goes ON TOP, blended** (§5 owns the stacking rule). `z-index: -1` puts an overlay *behind* a `Default*` surface that paints its own background, i.e. nowhere. `multiply` light / `screen` dark at a trimmed opacity is the shape — the same call `.alb-rainbow` and `.alb-task-aurora` already make.
- **Structure the wrapper cannot reach goes through an optional slot on the `Default*` component, never a fork.** The design turns the score readout into a spinning prism ring; `DefaultTaskDetail` gained one optional `worthSlot` and na is unchanged when it is absent. It is a slot, not a data channel (ADR-0016): the wrapper builds the node from the same state it forwards, so the two readouts cannot disagree. A second copy of an eight-hundred-line anatomy for one circle is the thing to avoid.

The praxis detail (#1140) is the fourth unfreeze and adds one refinement to the first bullet. **Where the flourish MOUNTS decides whether the clipping rule is arithmetic or structural.** The task detail's wrapper could sit outside `DefaultTaskDetail` and inset by `--space-2xl`, because that component's sheet starts exactly at its own `py-8` band. `DefaultPraxisDetail` puts a **variable-height breadcrumb** above its sheet, so no inset from outside lands on the sheet's top edge — the same wrapper shape would draw a rounded light-box around the breadcrumb *and* the page. So the three layers go through a second optional slot (`ornament`, ornament-only, carrying no data) and mount *inside* the sheet, where they inherit its `overflow: hidden` and its 18px radius. The light then **cannot** paint the viewport, rather than merely being measured not to. When a wrapper's inset depends on the height of something above the sheet, that is the signal to reach for a slot.

That praxis-detail skin has **no structural delta at all** — no `worthSlot` twin, because `ScoreStamp` has owned the whole score rail since #1091 and `scoreBreakdown()` is the single row-selection authority (ADR-0053). The design labels its rows *"base / witness / meta"*; the labels are recorded and the stamp ships as drawn by the repo. **A design's row labels are not a reason to hand-draw a score block.**

The **words** are covered by the same rule as the hues, and it is the easier one to get wrong: an unfrozen surface keeps `na`'s copy, including its sign-up verb. The task-detail design was the hardest case yet — `Correspondence №207`, `Albescent · in confidence`, `The Ask` / `in the hand of the keeper`, `In hand`, `14 accounts inscribed`, `most witnessed`, `Acknowledge`, `withdraw`, `Said quietly`, `Set something down, plainly…` — and **every word of it was cut** (#1038, ADR-0057 + ADR-0027). Albescent keeps the light and loses the words; a page announcing itself that loudly un-hides the society outright. `feed:taskCard.albescent.*` still sits in the catalog, orphaned since #783 deleted the card it belonged to; re-wiring it would print a word no other player's card prints, on a surface every player can see.

**The praxis detail is where that rule stops being inherited and becomes a choice, and the answer does not change.** ADR-0057 made task detail's copy neutral for *everyone*, so Albescent losing its words there was a site-wide rule landing on it. ADR-0061's amendment (2026-07-28) goes the other way for praxis detail: content slots — the write-up, proof, members, metatask, duel and comments headings, the vote and voter labels, the post button — **do** carry the skin's voice, and the other seven factions register a `detail.<faction>.*` block for exactly that. Albescent's design is the most heavily voiced of the nine (*"the ask"*, *"what was attended"*, *"entered together by"*, *"metatasks kept"*, *"base / witness / meta"*, *"bear witness"*, *"who has read it"*, *"said quietly"*, *"enter it"*, *"revise the account"*) and **registers none of it** (owner ruling on #1140). Permission to speak is not a reason to; a per-faction word renders to every viewer, and the whole premise is that no viewer can tell. The vocabulary is recorded in the issue and in the archetype's docstring so a future *reveal* surface has the words rather than re-deriving them — recorded, not built.

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

**On the crest.** WOW's mark (`components/sigil/WowSigil.tsx`, #897) is a gilt coin: a beaded rope ring, a motto band carrying **"IMSYWHAY · ORFAY · EVERYONEWAY"** — *whimsy for everyone*, in Pig Latin — and a cream field where a goofy unicorn brandishes a floppy **noodle sword**. The Pig Latin and the noodle are the faction's entire conceit; a version of this mark that "cleans them up" has drawn a different faction. The seal is **theme-invariant**, on the same reasoning as the gold above — struck metal does not repaint itself when the lights go out, and the kit draws the identical coin on its light and its dark card. What flips is the chrome that *mounts* it: the avatar's field disc. Below **56px** the band drops its lettering and keeps only its gold ring — at that size the 13-unit type renders under ~4.5 CSS px, where it stops being glyphs and becomes a smudge that dulls the band and muddies the rope ring beside it. Three gold rings round a cream field is what carries recognition at badge sizes anyway.

**On the lists.** WOW's duel surfaces (#895) are a tourney joust: a gold-framed enclosure, the gold/plum checker barrier along its top edge, and a **ribbon** that rides home with the loser — the loss floor dressed as generosity rather than as punishment. One rule in that skin is load-bearing and is not a taste call. The opponent's faction colour arrives on the rail and the seal (`accent`/`soft`, #310) and **can be any hue in the palette**, so it is held as a **rosette ring, a plate edge and a bar — never as an ink and never behind text**. That is what lets a hostile hue sit inside cream-and-gold chrome without a contrast fix, and it is why no `ARCHETYPE_PAIRS` row measures the opponent accent: there is no text pair to measure. This rule now lives on the **seal** skins (`components/duel/wowLists.tsx`); the duel *rail* was retired with the praxis-detail redesign (#1090), and `wowDuelRail.test.tsx` — which asserted the rule structurally against three different accents — went with it. It is guarded again: `components/duel/__tests__/wowSealAccent.test.tsx` (#1115) re-aims that assertion at the surface the rule now governs, walking both seal frames against those same three real accents in both modes. It stays **structural** because a *pairing* is invisible to a token-value sweep — `factionContrast.test.ts` knows which token holds which value and never which token was painted behind which string, and `duelSkinSlots.test.tsx` renders the seal against a foreign-faction opponent but only asserts slot presence. Both would stay green straight through the violation, which is the whole reason this guard is written by hand.

And the exposure widened before it narrowed. `DuelCard`'s ink seam (#1153) gives every praxis-detail skin three `color:` slots and a fill sitting directly behind a duellist's disc, on the one card where a rival's hue is nearest to hand — so the rule met a new, easy way to break it. **That seam is still unguarded**, and #1115 did not reach it: the violation there happens in the *call site* — a praxis-detail archetype choosing what to hand `ink` — so guarding it means walking the archetype registry, not the card. The mitigation is a comment on the prop and nothing stronger, which is worth stating plainly rather than dressing up: **where a rule has no guard, the seam that could violate it has to carry the rule in its own docstring**, at the point of use, not three files away in this document.

**On the phone.** The kit drew **one** mobile screen, not a mobile twin of every surface — a crested header wash, a list of gold-framed quest cards, and a bottom nav. #901 builds what is drawn (the field desk and the mobile task card) and **derives** the other four from that screen's chrome plus the matching desktop archetype, which is what every other faction's mobile build did. The vocabulary is one module, `components/factionMarks/wowMobile.tsx`, in the same shape as the duel skins' `components/duel/wowLists.tsx`.

Two of the drawing's pieces are deliberately **not** built, and the reason is the same one in both cases: they are not surfaces of ours. The phone bezel and the 9:41 clock are the *mockup's* device shell, and the app already runs inside a real one. The bottom nav is the global `MobileTabBar` — navigation means the same thing to every player, exactly as a level gem or a badge does (§6), so it must not acquire a faction seam. The header's `✦ 4,180` looks like part of that shell and is not: it is the player's score, and it survives.

The kit's mobile palette is a complete two-theme contract, and all but two of its keys resolved to tokens WOW already shipped — the mapping lives beside the declarations in `index.css`. One pairing failed measurement: the kit sets the header byline in its `sub` grey, which reads 4.10:1 on the header's lower gradient stop, so that one line takes `--faction-wow-accent-deep` instead. That is the third slice in this epic to find the kit's contrast claims wrong; **measure every pairing you lift from a design annotation.**

Read this next to the Albescent note above: those are the repo's two partly-registered factions, partial on **different axes**. Albescent has neither theme nor skin, on purpose, because it is hiding. WOW now has both, and most of the manifest claims it — the cards and their stamps, the vote widget, the composer, the crest and avatar, the comment and feed frame, the page-level hero/backdrop/profile/pledge surfaces, the duel seal, three mobile surfaces, and both **detail pages**: the task detail from #1037 and the praxis detail from #1121. The rest still render `Default*`, and they are listed — with the reason each one is unclaimed — in `factions/__tests__/wowRendersDefault.test.tsx`, which is the count's only home. A number cached here goes stale every time a surface ships or a surface is retired, and this sentence had drifted twice before it stopped naming one.

**Its task card and its praxis card do not match, on purpose.** A quest is *issued* by DECREE and proof is *recorded* in the CHRONICLE: `WowTaskCard` is a sheet hung from a knobbed rod under a gold/plum checker band, sealed with the crest; `WowPraxisCard` is a bound chronicle with a running head and a score stamp. They share the palette, the two fonts and the ✦, and nothing else. #785's "the praxis card mirrors the task card" clause is retired for this faction (#899) — the mismatch is the archetype, not a bug to reconcile.

### A retired metaphor's last surface is a GROUND, and it is the one nobody lists (#1208, #1209)

Two factions finished the same migration a day apart, and both issues were filed as a list of components. Coven's `coven.exe` window and the Ephemerists' illuminated codex had each been superseded by a v2 card metaphor, and each left its old token family painting a dozen surfaces the redesign never reached. Sweeping those is bookkeeping. Four things about it are not.

**The page under the surfaces is one of the surfaces.** `.eph-backdrop` is a `position: fixed` ground rendered by `FactionBackdrop` behind exactly two routes — the faction page and a member's profile — and both were on the sweep's list while the ground under them was not, because a CSS class is not a component and nothing greps for it. Repainting the plates and leaving the ground would have produced the failure in its most visible form: papyrus floating on vellum, full-bleed. **When a token family retires, grep the stylesheet for its class rules, not just the components for its `var()` reads** — the two censuses do not overlap, and the stylesheet's half is the bigger surface. Four dead animation classes fell out of the same look, along with the one keyframe that had to *stay* because a different faction's dust motes had adopted it.

**The guard is a source scan, and it is worth more than any per-file render test.** One assertion that no `.ts`/`.tsx` under `src` contains the retired prefix covers every surface, present and future, including the ones inside a `membership.state === 'gate'` branch or an empty state that no fixture reaches. Strip comments before matching: a docstring explaining what a file is *not* painting is the commonest false positive, and both sweeps' guards would have failed on their own headers otherwise.

**Do not delete the family, and say why at its declaration.** `--eph-*` survives with zero component readers because the `--faction-ephemerists-card-*` contract every faction supplies (§3) *aliases six of its members*, and those are read through `factionCssVar` by surfaces that are not Ephemerists skins at all. A count of zero `var(--eph-` reads is therefore not a licence to delete — the family is now reached by indirection only, which is exactly the state that looks dead to a grep.

**And a colour's role can be decided by a measurement rather than by the design.** The Valley plate already knew `-brass` is a rule colour and never an ink (2.97:1 on papyrus). The sweep found the second one: `-plate-ochre` measures **4.46:1 on the plate and 4.18 on the page** — a near miss the task card never hit, because it only ever drew the fifth tally stroke in it. The design sets the roster's "Rival" chip in ochre, and that is the one thing in the drawing that could not ship as drawn: ochre is a mark, a rule and a fill on this skin, and the accent *ink* is `-nile` (5.01 plate / 4.69 page). Two grounds now carry a rule this narrow, so the plate's ink budget is worth stating whole: on the **plate** `ink`, `quiet`, `caption`, `muted` and `nile` all clear; on the **page** only `ink`, `quiet` and `nile` do; on the **band** only `band-ink`, `gold`, `band-quiet` and `brass-light` — `nile` is 2.31 there and `ochre` 2.60.

A moved ground also moves the rows that measured it. The duel seal's ledger band went from the codex's vellum-deep to the plate's panel cell, and the two `factionContrast` rows pointing at it were repointed and re-measured rather than left to keep passing against a sheet no surface renders. That is the §3 rule about re-measuring a surface that gained a sheet, running in the other direction — and it repaid: the Ephemerists' zero figure at 3.01:1 had been the narrowest reading in the whole seal family, and on the plate it is 3.93.

One drawing decision rode along and is worth recording because it is not a colour. The codex struck a person in a list as a **circular** vellum medallion, on five surfaces. The plate's whole geometry is the cut corner, and the design draws every roster row, comment row and byline with an **octagon-clipped monogram** — so `AuthorOctagon` is now the kit's single answer to "draw a player", and the Ephemerists show a circle nowhere except the shared `FactionAvatar`, whose shape belongs to the app rather than to the faction.

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

UA Masters had a row here for a font it could not render in: it is dormant until Era 2 (§6), `--faction-ua-masters-card-font` was never declared, and #1293 took UnifrakturCook off the loader as an orphan. Its intended face is recorded in §6 with the rest of the archetype, which is where a faction with no component belongs. **A table of live tokens is not the place to hold a plan.**

Use `factionCssVar(slug, 'card-font')` in components. Never hardcode the font family string directly.

**A face can belong to a SURFACE rather than to a faction.** `--faction-{slug}-card-font` is read by a dozen surfaces each, so repointing one to satisfy a single redesign restyles eleven others by accident. When a design names a face for one surface only, give it a shared `--font-faction-*` token and reference that token from the one component — the same move `DefaultTaskCard` makes when it takes Lora rather than `--faction-default-card-font`. The v2 task cards (#1023) introduced four such faces: **Quicksand** (`--font-faction-rounded`) and **Grenze Gotisch** (`--font-faction-witch`) for Coven's spell slip, **Poiret One** (`--font-faction-deco`) and **Spectral** (`--font-faction-spectral`) for the Ephemerists plate. Coven's `card-font` is still Caveat and Ephemerists' is still Cinzel, and both still appear on their v2 cards — as the hand-lettering and the small caps respectively.

Whichever route a face takes, **it must also be in the `index.html` loader**, added in the same commit. A family named but never requested renders as its generic fallback, and that fallback *is* the rendering — no check catches it except `fontsLoaded` comparing the two lists (#839).

**And the token must be read, or it is the family's only consumer (#1293).** The reverse comparison asks "does anything name this family", which the guard answered by searching source — with `index.css` in the corpus, so a token's own declaration satisfied it and **every `--font-*` token vouched for itself**. Five had no `var()` reader at all and the check had been green over them for months; UnifrakturCook was on the render-blocking third-party request with nothing behind it but the line that named it. The question the guard asks now is whether anything *reads* `var(--font-…)`, and an unread declaration is cut out of the corpus before the family search runs. Two things this pattern teaches. **A declaration is not a use** — the same shape as §3's dead `--eph-*` family, in reverse: there the family was alive by indirection and looked dead to a grep, here the token was dead and looked alive to one. And **an unread token does not always free its family**: `--font-faction-old` had no reader, but `MediaArt`'s before/after plates set `IM Fell English` as a literal, so the token went and the face stayed. Deleting the family on the strength of the token alone would have unstyled a live surface — check the reads before the request.

**And the loaded family is not the loaded FACE (#1294).** One axis further down, the same failure changes shape: a weight a stylesheet sets and the request omits does not fall back to a generic, it *resolves* — the browser picks the nearest requested face and paints. Sixty `--font-display` sites set no weight, so they asked for 400 and rendered in Lora **500**; twenty more asked for bold and rendered **semibold**; the duel-victor badge's `DUEL`/`VICTOR` legend has declared Cinzel 800 and rendered 700 since #1304 dropped that axis. Nothing looks broken in any of them, which is why it survives review. **Owner ruling: the stylesheet is the truth and the loader follows it** — where a surface declares a weight, request that weight, rather than rewriting the declaration to name whichever face the browser happened to substitute. If the real face then differs from the design sheet, the sheet is what gets synced.

Three things that ruling turns up. **Adding a face can retire one**: Lora upright 500 was on the request only because those sixty 400-sites resolved to it, so requesting the 400 left it with no reader and it came off in the same commit — the two directions of the guard are one system, not two lists. **Where the family has no such face, the declaration is the thing that is wrong**: Bebas Neue ships exactly one face, upright 400, and Google Fonts has no bold of it, so `fontWeight: 700` on the na heading was buying a *synthesised* fake-bold over an already-condensed display face; the weight goes, and that is the honest move rather than the cheap one. And **a family whose name is a weight is still a family** — `Archivo Black` is served at `font-weight: 400`, so `--faction-snide-font-black` picks a cut, not a weight, and the dozen surfaces reading it were never asking for 900. Slant is the one axis still unguarded: the same Bebas Neue takes `fontStyle: italic` on five `na` surfaces and every one of those obliques is synthetic, because telling "this family has no italic" from "this family has an italic we did not request" needs Google's catalogue rather than our source.

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

**One container really is immovable: a drawn one (#1147).** When ornament type sits *inside a mark* — a
figure in UA's ensō, a total in Everymen's roundel — the container is an illustration, and widening it
is not a layout decision but a redrawing. There the numeral takes a **ceiling**: the `--text-*` tier is
the largest it may be, and the mark's own clear width caps it once the string grows. Two consequences
worth stating, because both have been got wrong: the ceiling must be a no-op at the values the site
actually shows today — a mark whose figure shrinks on a routine score has been mis-tuned, not fitted —
and a caption sharing the mark keeps its own full line box, so the figure can never come to rest on the
word. A cropped `line-height` under a figure is the bug, every time. This carve-out is for **marks
only**: a card, a panel or a rail is not a drawing, and there the doctrine above stands unchanged.

**Role classes.** Two classes carry the content tier, next to `.eyebrow`:

| Class            | Token                   | Role                                                                     |
| ---------------- | ----------------------- | ------------------------------------------------------------------------ |
| `.content-text`  | `--text-content` (18px) | body copy, descriptions, admin notes, the praxis body, textareas          |
| `.content-title` | `--text-title` (24px)   | titles and scores                                                        |

There is deliberately no `.content-heading` / `.content-display` / `.content-score`: each would have a single caller already owned by a component, and a class for one caller is a class for nobody. A score is a title-sized number — `.content-title` plus a `fontWeight`.

**Eyebrow / label text:** Courier Prime, `--text-sm` (9px), uppercase, letter-spacing 0.15em, `var(--color-text-tertiary)`. Use the `.eyebrow` class. Never add an inline `fontSize` to an element that already carries `.eyebrow` — the class owns the size.

That ink is the third text tier, and §3 records what it can and cannot do. The eyebrow clears AA on every neutral stock it lands on — **5.40:1** on the page, 5.78 over the frost, 5.07 on the alt surface, 4.78 on the filter well in light; 6.21 / 5.67 / 5.37 / 5.47 in dark — and it is now visibly a different ink from `--color-text-secondary` rather than the same one under a second name. What it does **not** have is headroom: the tier sits at secondary's weight because the palette has no AA-clear room below secondary, so an eyebrow cannot be made quieter by walking its colour down. If a label rank needs to recede further, the levers left are size, tracking, casing and layout — not ink.

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

**What the rule sees.** A raw value is a raw value whichever notation carries it, so the rule covers three shapes: a numeric inline style (`padding: 6`), a length string including `rem`/`em` (`padding: '0.6rem 1.2rem'`), and an **arbitrary Tailwind spacing utility** (`mt-[6px]`, `px-[10px]`) — the last of these leaves the style object entirely and so needs a separate `className` check (#763). It walks ternaries, `&&` chains and template literals, because the recurring lesson of #770/#789 is that *any* indirection hid the value from a literal-only check. **A sign is an indirection too**: `marginLeft: -3.5` is a `UnaryExpression` wrapping a literal, not a literal, so for four issues the ratchet caught `3.5` and waved the negative through — and negative margins are common in exactly the place this section cares about, pulling ornament back over a padded edge. The rule unwraps `-`/`+` before judging the operand (#1233), which leaves `-0` reading as `0` and staying exempt. **A negated token is spelled `calc(-1 * var(--space-lg))`** — the one calc composition §4a's warning above does not cover, because it names a rung rather than routing around one.

**What it deliberately does not see**, each a judgement rather than an oversight:

| Gap | Why it stays open |
| --- | --- |
| `text-sm` / `text-xs` on prose | Needs to know prose from chrome; a className carries no role signal. `text-sm` is right on a timestamp and wrong on a paragraph. Review-only. |
| `text-[13px]` | A `--text-*` token names a **tier**. Flagging arbitrary type mechanically would pin ornament to a tier it was never part of — the coupling this section forbids. |
| `calc(...)` | Named above; composing around the scale is a review rule, not a regex. |
| `w-`/`h-`/`top-`/`inset-` | Ornament geometry, already carved out above. |
| `marginLeft: -bleed` | A minus sign over an **identifier** or inside a template literal. Reading it needs flow analysis; the sign itself is closed (#1233), the indirection under it is not. |

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

### The phone's bottom edge is spoken for, and `position: fixed` does not escape it (#1566)

Two separate rules meet at the bottom 3.5rem of a phone viewport, and the filter bottom sheet broke both at once — on every filter surface in the app, since `OptionPicker` is shared by tasks, praxes and updates.

**A fixed child cannot climb out of an ancestor's stacking context, and `z-index` is what makes that invisible.** The sheet sits at `z-index: 40` and `MobileTabBar` at `10`, so the sheet looks like it wins. It does not: `ShellContent`'s mobile region is `relative` with `z-index: 5`, which opens a stacking context, so *everything* inside it — the sheet at 40, its scrim at 39 — composites at 5 against a bar sitting at 10 in the **root** context. The bar paints over the sheet. That is why the report was "Done is cut off" rather than "Done is behind the tab bar": the number in the rule says the opposite of what renders. **When two fixed elements disagree about who is on top, read the ancestors before you read the z-indexes** — and note that raising the region's z-index is the wrong lever, because it puts ordinary page content over the bar.

**Bottom chrome is a reservation, not a paint order.** The right fix is for anything pinned to the bottom of a phone viewport to reserve the strip the tab bar occupies. That strip is two things summed — the bar's height, then the home-indicator inset beneath it — and it was written out longhand as `calc(3.5rem + env(safe-area-inset-bottom))` in four files with no name before the sheet became the fifth consumer and reserved nothing at all. It is `--tab-bar-clearance` now, composed from `--tab-bar-height`. Two properties of it are worth knowing. **The height is measured, not declared** — the bar has no height rule for the token to read, so it is five `py-2` tabs at `--text-lg` under a 2px rule, and if that type moves nothing catches the drift. And **the `env()` half is currently inert**: without `viewport-fit=cover` on the viewport meta the browser already excludes the safe area from the layout viewport, so the inset resolves to `0px` — correct today, and correct on the day someone sets `viewport-fit`, which is exactly why it stays in the sum.

The corollary at the sheet: **a `max-height` measured from `bottom: 0` is not the height it claims.** `70vh` was spending its last 3.5rem on chrome, so it grows by the clearance to go back to meaning 70vh of *usable* panel. And a panel with a pinned action gives the scroll to the **list**, not to itself — the label row and the Done button stay put, a long facet can never push the action below the fold, and the bottom padding stays out of a scrollport, where browsers have a long history of dropping it on a flex column.

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

Each faction's archetype lives in its card component — see `frontend/src/components/taskCard/*TaskCard.tsx`. Every one carries a one-line docstring naming its archetype (metaphor, colors, headline font); that docstring is the source of truth and is edited in the same commit as any redesign. A table here would only cache — and drift from — what those components already state. Colors are CSS variables (§3).

**Singularity** is always dark in both themes — no light variant needed.

"No light variant" is **not** the same as "one value for both themes", and Singularity now shows both shapes at once. Its older families (`--faction-singularity-terminal-*`, the decode strip, the system slab) are genuinely theme-**invariant** and declare no `[data-theme="dark"]` block at all. Its v2 task card's `--faction-singularity-term-*` is a real **two-theme contract whose halves are both near-black**: the chassis stays black and what the cascade flips is the *phosphor*. Say which shape a new block is where you declare it. The failure mode runs both ways — a later editor "completing" an invariant family with a dark half, or flattening a two-theme one on the grounds that the faction is always dark anyway.

**UA Masters** (dormant, deferred to Era 2 per ADR-0004): gazette-article archetype — proper masthead, corner-snipped edges, two columns, UnifrakturCook. No component exists yet, so this line is the only place it lives — and since #1293 that is literally true: the face is not requested and there is no token for it. Building the archetype means adding both back, which is one edit and cheaper than the family costing every visitor a render-blocking download in the meantime.

**Reuse pattern:** The faction card aesthetic should be used as a wrapper for any faction-branded context: profile headers, praxis bylines, proposal form wrappers, podium cards. The card component handles the visual treatment; the parent provides the content.

### A faction's ornament is one primitive at named strengths (#849)

A faction's signature device is drawn **once**, as one parameterized component, and consumed everywhere. It is never re-drawn per surface — a hero with its own hand-tuned rosette and a join card with another is how a faction stops looking like one faction.

Two rules follow, and UA is the worked example:

**A mark is reserved, and reserving it is the point.** UA's ensō (`components/sigil/UaSigil.tsx`) is for the **score** and the **faction mark**. It is never a container border. A mark spent as decoration stops meaning anything; the restraint is the identity.

**Where an ornament may appear is part of its API, including where it may not.** `UaMandala` takes a `strength` of `full` (one surface — the vote control), `texture` (6–22%, behind page backdrop / faction hero / join card) or `absent`, which renders `null`. Dense, text-heavy surfaces — feed rows, comments, task lists, the editor — ask for `absent`. Encoding the third case as a strength rather than as "just don't use it" is deliberate: the ruling survives in the type instead of in a comment someone has to remember.

**That ruling is the mandala's, and it does not travel to the faction's other marks.** UA carries three devices — the mandala, the ensō and the lotus — and each has its own scope. `UaTaskCard` spent a release with no lotus because #851 read the kit's corner-bleed as something "the brief's strength ruling supersedes"; but the lotus is not radial concentric geometry, it is a ground wash, and `UaPraxisCard` (every bit as dense and text-heavy) had been floating one off its left edge the whole time. #1023 puts it back. When a rule names a component, check whether the thing in front of you *is* that component before you apply it — "UA ornament" is not one scope.

**The module is the enforcement, and it arrives late.** UA's devices were components from the start; WOW's were not — its wavy gold→plum rule and its googly-balloon bunch were hand-drawn inside `WowTaskCard` and again inside `WowTaskDetail`, byte-identical and invisible to each other. Nothing catches that: two copies both compile, both lint, and both look right. It surfaced only when a *third* surface wanted them (#1121, the praxis detail), which is the general shape — **duplication is discovered by the next consumer, not by the second one.** So the fix is the same one UA already models: one module per faction holding its whole vocabulary (`components/factionMarks/wowOrnament.tsx`, beside `components/duel/wowLists.tsx` and `components/factionMarks/wowMobile.tsx`), and the extraction happens when the third caller appears rather than being deferred again. Parameterize what genuinely differs and nothing else — WOW's bunch takes a size and a `bob` strength, because a page's live ornament bobs and forty of them in a flex-wrap card grid must not.

Where a mark ships as an inline SVG and where as a masked `public/` asset is a **weight** decision, not a style one — see `components/factionMarks/index.ts`. Both are token-tinted, so both follow the dark cascade. The same faction can legitimately carry two versions of one device at different sizes for different consumers; do not consolidate them on sight.

---

## 7. Components

### Nav Bar

- Frosted glass: `var(--color-nav-bg)` with backdrop blur
- Wordmark: Lora italic over a 2px rule in `var(--faction-default-total-rainbow)` — the spectrum's four-stop cut, drawn as the second layer of a two-layer `backgroundImage` that the page ground masks down to the bottom 2px
- Links: Courier Prime, `--text-base`, uppercase

### Page Title

- Lora italic, `--text-display`
- Per-letter colored underline bars cycling through `--faction-default-stop-1` to `--faction-default-stop-7` — the site's one rainbow, **seven** long (#1220, ADR-0066)

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

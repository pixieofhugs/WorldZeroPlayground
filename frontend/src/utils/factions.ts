/**
 * Shared faction configuration — the JS side of faction identity.
 *
 * It holds NO colour. index.css is the only source of a faction hue, and this
 * module hands out `var()` references into it (factionCssVar / factionFill), so
 * dark mode arrives free via the [data-theme="dark"] cascade and there is no
 * second table to keep in sync.
 *
 * Never reintroduce a JS colour table. A hand-mirrored one cannot be made
 * correct: a hex literal has no dark half by construction, so no amount of
 * mirroring reaches the dark lift, and the mirroring itself drifts silently
 * (#1269). Having no table is what makes that impossible rather than tested.
 *
 * What is left is the slug→theme mapping (CSS_KEY), which is about identity,
 * not colour: which slugs have a theme at all, and which resolve to `default`.
 * Faction NAMES and DESCRIPTIONS live in the factions.json catalog, keyed by
 * slug (ADR-0031, same split as taunts/ranks), resolved via factionName() /
 * factionDescription().
 */
import type { CSSProperties } from "react";
import i18n from "../i18n";
import { hasOwnKey } from "./hasOwnKey";

// Faction slugs are runtime-dynamic, so the catalog keys (`factions:names.<slug>`
// / `factions:descriptions.<slug>`) can't be the typed literals t() expects.
// Resolve through a plain-string view of t — the catalog still owns the words;
// only the compile-time key check is relaxed for these dynamic lookups. Same
// pattern as utils/taunts.ts.
const tString = i18n.t as unknown as (
  key: string,
  options?: Record<string, unknown>,
) => string;

/**
 * The unaffiliated sentinel (ADR-0030 / ADR-0039). Mirrors the backend's
 * `UNAFFILIATED_FACTION_SLUG` (`services/faction_service.py`): a task carrying
 * this slug is generic / cross-faction, owned by no faction. Unaffiliated is a
 * state rather than a faction, so `getAllFactions()` deliberately omits it —
 * surfaces that offer it (the propose-task picker #704, the filter
 * pennant row #921) do so as an explicit extra option, never via `GET /factions`.
 *
 * Lives here, with the other slug/CSS-key knowledge, so both a `ui/` component
 * and a page module can import it without a page→ui dependency (#921).
 */
export const UNAFFILIATED_FACTION_SLUG = "na";

/** What getAllFactions() hands back. Slug only — colour comes from the cascade. */
export interface FactionConfig {
  slug: string;
}

/**
 * Slug-to-CSS-variable-key mapping.
 * Faction slugs use underscores in the DB but CSS variables use hyphens.
 */
const CSS_KEY: Record<string, string> = {
  ua: "ua",
  everymen: "everymen",
  coven: "coven",
  snide: "snide",
  // This ONE line is what themes Warriors of Whimsy (#812), because
  // isKnownFaction tests the mapped VALUE (`!== "default"`), not key presence
  // (#749). Its hue is the chronicle plum (#2068); its SKIN is the
  // cream/gold/plum chronicle, which is a different thing and does not follow
  // the hue (#838, ADR-0050) — the two merely agree on a value now, in light,
  // which is not the same as being one token.
  wow: "wow",
  ephemerists: "ephemerists",
  singularity: "singularity",
  // Albescent is registered but NOT themed (#783). It is a secret society
  // hiding in plain sight, so it points at `default` exactly like `na` below:
  // same neutral scalars, same rainbow through factionFill, and — because the
  // predicate reads the mapped VALUE — isKnownFaction('albescent') === false.
  // That is the intended outcome, not a gap.
  albescent: "default",
  // `na` (unaffiliated) is a state, not a faction: it reads the neutral/rainbow
  // --faction-default-* set (#418), so factionCssVar('na') is grey, never a
  // borrowed `ua` orange. The spectrum reaches fills through factionFill(), and
  // ornament surfaces reach it by branching on isKnownFaction — which returns
  // false for `na` precisely because it lands on `default` (ADR-0039, #749).
  na: "default",
};

/**
 * Resolve a slug to its CSS-variable key. Unknown/unregistered slugs degrade to
 * `default` (neutral grey / rainbow), never impersonate `ua`.
 *
 * The lookup is own-property-only because a plain bracket read broke that
 * contract for the whole of `Object.prototype`: `CSS_KEY["constructor"]` is the
 * `Object` function, which `??` cannot catch, so `factionCssVar` built
 * `var(--faction-function Object() { [native code] })` and the element lost its
 * colour (#1821). Every slug reaching here came from the server until #1744
 * made presence awareness — self-reported by each client and relayed, ADR-0073
 * — a path for a co-member's arbitrary string.
 */
function resolveCssKey(slug: string | null | undefined): string {
  return hasOwnKey(CSS_KEY, slug) ? CSS_KEY[slug] : "default";
}

/**
 * Get a CSS variable reference for a faction property.
 * Use this in inline styles: `style={{ background: factionCssVar('everymen', 'card-bg') }}`
 *
 * Available suffixes:
 *   (none)        — primary color
 *   'light'       — background tint
 *   'border'      — border color
 *   'card-bg'     — card background
 *   'card-text'   — card text
 *   'card-accent' — card accent (meta text, decorations)
 *   'card-muted'  — card secondary/description text
 *   'card-notice' — cautionary / not-yet-done ink ON the card sheet (#694)
 *   'card-alarm'  — destructive ink ON the card sheet (#1449)
 *   'card-credit' — points-earned ink ON the card sheet (#694)
 *   'card-sheet' / 'card-sheet-blend' / 'card-sheet-clip'
 *                 — the sheet's background LAYER LIST, its per-layer blend and
 *                   its per-layer clip (#2497). A matched triple, only the
 *                   `default` family declares it, and {@link factionSheet} is
 *                   the one thing that should be reading these three names.
 *
 * Exactly one of those is a SURFACE. `card-bg` is the sheet; `light` is a tint
 * wash; everything else is ink meant for `color:`. Reaching for `card-muted` as
 * a `background:` fills a surface with the faction's muted TEXT ink and prints
 * on it at about 1:1 (#694).
 *
 * `card-notice` / `card-alarm` / `card-credit` exist because a shared,
 * faction-themed component paints state colours on eight different sheets, and
 * the global `--color-warning` / `--color-danger` / `--color-success` were
 * measured against the app's near-white surface, never against a warm cream
 * (4.14:1 on UA) or a near-black one (2.07:1 on S.N.I.D.E.). They flip on the
 * SHEET's polarity rather than on the theme, which is exactly why a global
 * token could not cover it. All three are measured in both themes by
 * `utils/__tests__/factionContrast.test.ts` — the first two against
 * `--faction-{key}-card-bg`, and `card-alarm` against the sheet the praxis card
 * actually paints, which for four factions is a different token (#1302).
 *
 * `card-notice` and `card-alarm` are ONE role split in two: cautionary and
 * destructive (#1449). A site reading `card-notice` for a red meaning is a bug
 * to re-check, not a precedent to copy.
 *
 * With no suffix this is also the answer for genuine SCALAR ink on a dynamic
 * slug — the feed actor's name, the invitation letter's link. `na` and
 * `albescent` land on the neutral `--faction-default` there rather than the
 * spectrum, and that is ADR-0039 §2's decision, not a fallback: no single stop
 * of seven is legible as text (#649), and a `background-clip: text` rainbow
 * would cost text selection and high-contrast modes. Both slugs must keep
 * resolving identically or Albescent becomes conspicuous (#783); a FILL still
 * belongs to {@link factionFill}.
 */
export function factionCssVar(
  slug: string | null | undefined,
  suffix?: string,
): string {
  const key = resolveCssKey(slug);
  const prop = suffix ? `--faction-${key}-${suffix}` : `--faction-${key}`;
  return `var(${prop})`;
}

/**
 * Surface geometry a faction FILL can occupy. Determines how `na`'s spectrum is
 * rendered — the wrong shape compiles fine but looks bad (a 7-stop linear on a
 * 10px dot reads as mud), so the call site picks it. See ADR-0039.
 *
 * `"frame"` is the border-only case (#794): a rainbow *ring* for a surface that
 * needs a scalar accent (a selection ring, a card edge) rather than a fill, so
 * na stops falling back to grey there too.
 *
 * `"rule"` is `"bar"` stood on end (#983): the vertical left-edge accent a feed
 * row or a quoted block draws. It is its own shape rather than a caller's
 * problem because the bar's ramp runs 90deg — spend that across a 3px-wide rule
 * and the spectrum lands ~0.4px a stop, which is the same mud `"dot"` exists to
 * avoid. Every faction returns the identical value for `"bar"` and `"rule"`;
 * only na's ramp turns.
 *
 * `"disc"` is `"dot"` grown large enough to hold depth (#1269): the 28px avatar
 * circle a feed row or companion card paints behind a monogram. A real faction
 * gets a 135° two-stop ramp of its own hue rather than the flat fill a 10px dot
 * takes, because at that size a flat disc reads as a sticker. It is a shape
 * here rather than a caller's ramp so that no surface hand-writes it out of an
 * interpolated hex. na is identical to `"dot"`: the conic spectrum, already the
 * right answer at 28px.
 */
export type FactionFillShape = "bar" | "dot" | "disc" | "pill" | "frame" | "rule";

/**
 * A faction FILL as a style object to spread onto the filled element.
 *
 * Every real faction returns its solid hue for every shape (with the paired
 * `--faction-{key}-on-fill` AA ink for `"pill"`, #649). Only `na`/unregistered
 * slugs are shape-dependent, because their identity is a gradient, not a hue
 * (ADR-0039):
 *   - `"bar"`  → the linear rainbow (`--faction-default-rainbow`)
 *   - `"rule"` → the same ramp turned 180deg (`--faction-default-rainbow-vertical`)
 *                for a vertical rule, where the horizontal ramp would compress
 *                seven stops into the rule's ~3px width
 *   - `"dot"`  → the conic rainbow (`--faction-default-rainbow-conic`; a 7-stop
 *                linear is mud at 10–12px). SMOOTH, not wedged: the seven light
 *                stops sit inside a 0.184 luminance band, so hard wedge edges
 *                merge into one dark band (#1127)
 *   - `"pill"` → the rainbow as a *frame* (border-box) around a neutral paper
 *                interior with ink text — no single ink is legible across the
 *                spectrum, so the label never sits on it.
 *   - `"frame"` → the rainbow as a border ring only (the pill's border-box
 *                treatment MINUS the forced ink), for a scalar accent (a
 *                selection ring, a card edge) that would otherwise degrade to
 *                grey. The interior is filled with the neutral card paper rather
 *                than left see-through ON PURPOSE: a rounded gradient border with
 *                a genuinely transparent centre is not expressible as a single
 *                spreadable `background` — a transparent padding-box reveals the
 *                border-box gradient straight through the middle. The pill fills
 *                opaque paper for exactly this reason; `frame` keeps that fill but
 *                drops the ink so the caller owns its own text colour (#794).
 *
 * A scalar `border`/`ring` context asks for `"frame"` rather than reaching for
 * `factionCssVar` and landing on grey. A real faction's `"frame"` is a plain
 * solid `var(--faction-{key})` border, so `factionCssVar` and `"frame"` agree
 * for known factions and only `na`/unregistered slugs differ.
 *
 * Prefer this over `factionCssVar(slug)` for any `background:` that renders a
 * dynamic slug (one that can be `na` at runtime). Genuine single-ink TEXT
 * (`color:`) keeps using `factionCssVar` and stays neutral grey for `na` — no
 * single stop is legible across seven (#649), so that is correct, not a fallback.
 */
export function factionFill(
  slug: string | null | undefined,
  shape: FactionFillShape,
): CSSProperties {
  const key = resolveCssKey(slug);
  const isDefault = key === "default";

  if (shape === "pill") {
    if (isDefault) {
      // Paper interior on padding-box, spectrum on border-box, ink on paper.
      return {
        background:
          "linear-gradient(var(--faction-default-card-bg), var(--faction-default-card-bg)) padding-box, var(--faction-default-rainbow) border-box",
        border: "2px solid transparent",
        color: "var(--faction-default-card-text)",
        boxSizing: "border-box",
      };
    }
    return {
      background: `var(--faction-${key})`,
      color: `var(--faction-${key}-on-fill)`,
    };
  }

  if (shape === "frame") {
    if (isDefault) {
      // The pill's rainbow border-box over an opaque neutral interior, minus the
      // forced ink (see the docblock on why the interior can't be see-through).
      return {
        background:
          "linear-gradient(var(--faction-default-card-bg), var(--faction-default-card-bg)) padding-box, var(--faction-default-rainbow) border-box",
        border: "2px solid transparent",
        boxSizing: "border-box",
      };
    }
    // A real faction degrades to a plain solid border, exactly as the other
    // shapes degrade to a solid background — the caller keeps its own interior.
    return { border: `2px solid var(--faction-${key})` };
  }

  if (isDefault) {
    // bar / rule / dot / disc: one spectrum, three cuts, picked by the geometry
    // the fill lands on rather than by the caller remembering to rotate it.
    if (shape === "dot" || shape === "disc") {
      return { background: "var(--faction-default-rainbow-conic)" };
    }
    if (shape === "rule") {
      return { background: "var(--faction-default-rainbow-vertical)" };
    }
    return { background: "var(--faction-default-rainbow)" };
  }
  if (shape === "disc") {
    // 53% is the `88` alpha suffix the three hand-written copies carried, said
    // about a token instead of about a hex.
    return {
      background: `linear-gradient(135deg, var(--faction-${key}), color-mix(in srgb, var(--faction-${key}) 53%, transparent))`,
    };
  }
  return { background: `var(--faction-${key})` };
}

/**
 * A card SHEET — the ground a `Default*` surface paints itself on (#2497).
 *
 * Spread it wherever a card ground is painted. The rendered result for `na` is
 * byte-identical to `background: factionCssVar(slug, 'card-bg')`; what it buys
 * is a seam. Albescent's kit (#2496) is "the na component plus ornament, never a
 * skin", so its prism sweep (#2499) arrives by overriding three custom
 * properties under its own wrapper class — no component learns anything, and no
 * selector surgery reaches into eight files.
 *
 * FOUR PROPERTIES, NOT ONE, and each earns its place:
 *   `background-color`      the ground the sheet's layers blend AGAINST. A
 *                           `multiply` or `screen` with nothing beneath it is a
 *                           no-op, so this is what makes the prism composite.
 *   `background-image`      the sheet itself — a LIST, one layer for na and up to
 *                           five for Albescent's dark bloom.
 *   `background-blend-mode` per layer, or CSS cycles one value across five.
 *   `background-clip`       ditto — and the trailing `border-box` is deliberate,
 *                           see below.
 *
 * WHY THE TRAILING `border-box`. Per CSS Backgrounds 3 the background COLOUR is
 * clipped by the bottom-most layer's clip value, i.e. the last one written. The
 * sheet's own layers stop at the padding box (`--…-sheet-clip`) so a wash never
 * bleeds under the frame; the colour keeps running to the border box, which is
 * what the dark card needs — `--faction-default-card-line` is
 * `rgba(255,255,255,0.14)` at night and the sheet shows THROUGH that hairline.
 * Drop the `border-box` and every dark card's edge changes colour.
 *
 * A THEMED SLUG IS SAFE AND DELIBERATELY UNCHANGED. Only the `default` family
 * declares the triple, so `--faction-ua-card-sheet` is undefined, all three
 * declarations are invalid at computed-value time, and each falls to its initial
 * (`none` / `normal` / `border-box`) — which is exactly what `background:
 * var(--faction-ua-card-bg)` rendered before. A faction that later wants a sheet
 * of its own declares three names and gets it with no call site edited.
 *
 * The two cards that wear the SPECTRUM BORDER do not call this — they call
 * {@link factionSpectrumSheet} below, which is this composition with one more
 * layer appended to all three lists.
 */
export function factionSheet(slug?: string | null): CSSProperties {
  return {
    backgroundColor: factionCssVar(slug, "card-bg"),
    backgroundImage: factionCssVar(slug, "card-sheet"),
    backgroundBlendMode: factionCssVar(slug, "card-sheet-blend"),
    backgroundClip: `${factionCssVar(slug, "card-sheet-clip")}, border-box`,
  };
}

/**
 * The sheet with the na SPECTRUM PAINTED INTO ITS BORDER BOX (#2499, epic #2496).
 *
 * THE SPECTRUM IS THE BORDER. A gradient cannot be a `border-color`, so the ramp
 * is a background layer under the sheet, the element wears a TRANSPARENT border,
 * and `background-origin: border-box` is what makes the ramp start out at the
 * frame rather than at the padding box. Every caller states the border WIDTH and
 * the corner itself: those are the card's geometry, not the sheet's.
 *
 * WHY IT IS A HELPER AND NOT FIVE LINES TWICE. Both card archetypes now wear the
 * idiom, and the one way to get it wrong is silent: a background list is a list
 * in three properties at once, and CSS CYCLES the short ones rather than padding
 * them. Append the ramp to the image list only and Albescent's dark prism — five
 * radials plus the ground ramp — hands its sixth layer the FIRST blend mode
 * again. It renders; it is simply wrong, in one cascade, on one faction. Saying
 * the append once is what makes the arity right by construction, which is the
 * same argument `--faction-default-card-sheet`'s own note in index.css makes.
 *
 * `--faction-default-rainbow` rather than the loop cut: this ramp does not tile
 * and does not travel, so it wants the seven-stop spectrum, not the seamless
 * one. The Albescent surfaces put a TRAVELLING ring on top of it (`.alb-task-edge`
 * and `.alb-praxis-card-edge`), and that ring carries the loop cut itself.
 */
export function factionSpectrumSheet(slug?: string | null): CSSProperties {
  return {
    backgroundColor: factionCssVar(slug, "card-bg"),
    backgroundImage: `${factionCssVar(slug, "card-sheet")}, var(--faction-default-rainbow)`,
    backgroundBlendMode: `${factionCssVar(slug, "card-sheet-blend")}, normal`,
    backgroundOrigin: "border-box",
    backgroundClip: `${factionCssVar(slug, "card-sheet-clip")}, border-box`,
  };
}

/**
 * Is this slug a real faction with its own theme?
 *
 * Needed because factionCssVar() resolves anything it doesn't know — including
 * `na` and null — to the `default` key, whose scalars are neutral grey. Surfaces
 * that owe the unaffiliated player the spectrum (ADR-0039) must branch *before*
 * asking for a faction variable, then reach for the rainbow themselves
 * (`--faction-default-rainbow` / `--faction-default-rainbow-conic`, or
 * factionFill()).
 *
 * `na` IS a key in CSS_KEY (it maps to `default`, #418) but is deliberately not
 * "known" here: membership means "has a resolvable theme", and `default` is the
 * absence of a faction identity rather than one of them. Testing the mapped
 * value, not key presence, is what keeps those two meanings apart — presence
 * alone reported `na` as a real faction and turned every unaffiliated ornament
 * grey (#749).
 *
 * `albescent` now sits on that same unthemed side (#783), and it is there for a
 * different reason than `na`: it IS a faction, it just refuses to look like one.
 * This is why the value test matters twice over — Albescent is a registered slug
 * with a manifest and a membership roster, and only the mapped `default` keeps
 * it out of the spectrum. Anything that starts testing key presence again will
 * both grey out unaffiliated players AND expose a secret society.
 *
 * The presence half is own-property-only for the same reason resolveCssKey's
 * lookup is (#1821): `in` walks the prototype chain, so `"constructor" in
 * CSS_KEY` was true and its mapped value — the `Object` function — is not
 * `"default"`, which reported every `Object.prototype` member as a real,
 * themed faction.
 */
export function isKnownFaction(slug: string | null | undefined): boolean {
  return hasOwnKey(CSS_KEY, slug) && CSS_KEY[slug] !== "default";
}

/** The secret society's slug (ADR-0027, #390). */
export const ALBESCENT_FACTION_SLUG = "albescent";

/**
 * Whether the signed-in account has been revealed to Albescent.
 *
 * Module-level and mutable, which is the honest cost of the decision in #1891.
 * See `factionName` for why it is paid here rather than threaded through props.
 *
 * Defaults to `false`, so every state this app can be in before `/auth/me`
 * answers — first paint, logged out, a non-React caller, a page nobody has
 * written yet — is the SECRET one. Failing closed is the whole point: a leak
 * here is unrecoverable, and a name withheld for one extra frame is not.
 */
let albescentRevealed = false;

/**
 * Point the mask at the current viewer. Called by `AuthContext` on every change
 * of viewer — sign-in, sign-out, and the `applyUser` hand-off that follows a
 * join (the join IS the reveal, so this is how the word appears).
 *
 * Exported for tests too: the frontend harness is `renderToStaticMarkup` with
 * no DOM, so effects never run and a test cannot reach the provider's closure.
 * Tests MUST reset it — it outlives the case that set it, and a leaked `true`
 * makes a later assertion pass for the wrong reason.
 */
export function setAlbescentRevealed(revealed: boolean): void {
  albescentRevealed = revealed;
}

/**
 * Whether the signed-in account has reached the level at which the eighth row
 * starts being DRAWN at all (#2770, amending ADR-0082).
 *
 * The stage in front of the reveal above, and the same shape for the same
 * reasons — module-level, mutable, set from `AuthContext` on every viewer
 * change, and `false` by default so first paint, logged-out and every non-React
 * caller get the concealed answer. The fail-closed default matters more here
 * than it does above: a leak past the redaction shows a word, a leak past this
 * one shows that there is anything to redact.
 *
 * The server has already resolved reveal-implies-glimpse
 * (`services.albescent_reveal.is_albescent_glimpsed`), so the two flags arrive
 * consistent. `isFactionConcealed` re-checks it anyway — see there for why.
 */
let albescentGlimpsed = false;

/**
 * Point the concealment at the current viewer. Same call site, same contract and
 * the same test obligation as `setAlbescentRevealed` above: tests MUST reset it,
 * because it outlives the case that set it.
 */
export function setAlbescentGlimpsed(glimpsed: boolean): void {
  albescentGlimpsed = glimpsed;
}

/**
 * Whether this viewer must not be shown that the row EXISTS (#2770).
 *
 * Three states, and this predicate is the first cut of the three:
 *
 * | State | Predicate | What the two surfaces draw |
 * |---|---|---|
 * | concealed | `isFactionConcealed` | nothing — no tile, no lane, no gap |
 * | redacted | `isFactionRedacted` | ADR-0082's `[REDACTED]`, control disabled |
 * | real | neither | the ordinary card and lane |
 *
 * ADR-0082's reasoning — *"a row they can see and cannot read is the locked door
 * with no keyhole"* — is not reversed and still governs from the glimpse level
 * up. What #2770 adds is that a player below it is not yet shown the door. That
 * restores ADR-0027's hiding posture for the early game ONLY.
 *
 * **Reveal implies glimpse, re-checked here.** The server resolves it too, so
 * this is belt and braces on the leg where being wrong is unrecoverable: a
 * revealed viewer whose `albescent_glimpsed` somehow read false would lose a
 * faction they are a member of, which is a bug a player reports; the reverse
 * would be a silent leak nobody reports.
 *
 * NOT a filter over `factionName` and NOT a fourth reading of the catalogue.
 * Concealment is a LIST question — does this row get built — so it is answered
 * where the lists are built (`useFactionsDirectory`, `factionStandings`) and the
 * components below never learn there was a third state.
 */
export function isFactionConcealed(slug: string | null | undefined): boolean {
  return (
    slug === ALBESCENT_FACTION_SLUG && !albescentGlimpsed && !albescentRevealed
  );
}

/**
 * Whether this viewer must not be shown Albescent as a CHOICE.
 *
 * The counterpart to the mask, and deliberately not the same answer. Where a
 * name LABELS a thing already on screen, masking it to "Unaffiliated" is right
 * — a blank where every other card has a name advertises that something is
 * being withheld. Where a name builds a CHOOSER, masking is wrong: it hands an
 * unrevealed player two identical "Unaffiliated" rows, which is louder than the
 * leak it replaces. Choosers must DROP the row; this is the predicate they
 * filter on (#1891 ruling 3).
 */
export function isFactionHiddenFromChoosers(
  slug: string | null | undefined,
): boolean {
  return slug === ALBESCENT_FACTION_SLUG && !albescentRevealed;
}

/**
 * What an Albescent-scoped string reads as before the reveal (#2409, ADR-0082).
 *
 * Not in the i18n catalogue, deliberately. It is not copy — it is the ABSENCE
 * of copy, the same mark in every locale, and a translator handed a
 * `redaction.label` key would eventually localise it and give each language its
 * own tell.
 */
export const REDACTED = "[REDACTED]";

/**
 * Catalogue keys that belong to Albescent, in any namespace.
 *
 * The generalisation #2409 asks for: the gate used to know exactly one key
 * (`factions:names.albescent`) and now knows a NAMESPACE —
 * `factions:names.albescent`, `factions:descriptions.albescent` and the
 * `feed:factionSelect.albescent.*` slots the select tile draws. Matching the
 * SEGMENT rather than the substring is what keeps a future
 * `factions:albescentRumour` from being swept in by accident.
 */
const ALBESCENT_SCOPED_KEY = /(?:^|[.:])albescent(?:[.:]|$)/;

/**
 * Whether this viewer reads Albescent's strings as `[REDACTED]`.
 *
 * Exported so a surface can also PAINT the redaction (the `.redacted` class in
 * index.css) and disable the control it sits beside. Both must key off this one
 * answer: #2409 rules that the card un-redacts and unlocks in the same moment,
 * so there is never a readable card with a dead button or a redacted card with
 * a live one.
 *
 * Same impurity, same reason, as `factionName` — see its docblock.
 */
export function isFactionRedacted(slug: string | null | undefined): boolean {
  return slug === ALBESCENT_FACTION_SLUG && !albescentRevealed;
}

/**
 * Read a catalogue string through the redaction gate (#2409, ADR-0082).
 *
 * OPT-IN, AND THAT IS THE WHOLE BOUNDARY. A surface that wants the redaction
 * ASKS for it by calling this; every other reader of the catalogue — including
 * `factionName` and `factionDescription` — goes on saying "Unaffiliated" as
 * #1891 ruled. Exactly two surfaces ask: the Albescent select tile on
 * `/factions`, and the faction race lane on the PLAYERS page. (Not
 * `Leaderboard.tsx`, which contains no redaction at all — the count in this
 * sentence was always right and the location was not, corrected in #2770.) See
 * `factionName`'s docblock for why the split.
 *
 * BOTH OF THOSE SURFACES NOW HAVE A STATE IN FRONT OF THIS ONE. Below the era's
 * glimpse level the row is not built at all, so this function is never reached
 * for it — see `isFactionConcealed`. Nothing here changes: a concealed viewer
 * and a redacted one would get the same answer out of this function, and the
 * difference between them is made where the lists are built, not here.
 *
 * Deliberately NOT a registry, a context or a config. Two call sites do not
 * need a lookup table, and a table is the thing that would quietly grow back
 * into the global rename this was narrowed away from.
 *
 * THE REDACTION IS A RENDERING RULE OVER THE ORDINARY CATALOGUE, never a second
 * set of strings. Albescent's copy is authored exactly as every other faction's
 * is, and this function decides whether the viewer gets to read it — so the
 * moment an account is revealed the real words are already in place, with
 * nothing to swap in and nothing that can be authored in one catalogue and
 * forgotten in the other.
 *
 * Any Albescent-scoped key redacts; every other key is a plain `t()`. That
 * keeps a tile which draws a mixed set of slots from having to know which of
 * them belong to the society.
 */
export function redactableText(
  key: string,
  options?: Record<string, unknown>,
): string {
  if (!albescentRevealed && ALBESCENT_SCOPED_KEY.test(key)) return REDACTED;
  return tString(key, options);
}

/**
 * Get a faction's display name by slug from the factions.json catalog
 * (`names.<slug>`). A null / unrecognized slug falls back to the "Unaffiliated"
 * copy under `names.na`. The backend emits only slugs now — never name prose.
 *
 * THIS FUNCTION IS NOT PURE, AND THAT IS THE DESIGN (#1891). It reads the
 * module-level `albescentRevealed` flag, so the same slug answers differently
 * for two viewers.
 *
 * Albescent is a secret society: a player who was never invited must not
 * encounter the word. The name reaches every surface that labels a thing with
 * its faction — praxis bylines, task cards, metatask seals, the character
 * switcher, a sidebar `aria-label` — about thirty-five call sites, each of
 * which would otherwise need its own gate, and each of which is a place a
 * future page can forget.
 *
 * Putting the gate HERE is what makes a page written next month secret by
 * construction rather than by review. It is also the only version that covers
 * the callers which are not React at all and have no context to read.
 *
 * The look is untouched: Albescent's skins, frames and voices keep rendering
 * (ruling 1). Only the word changes, and it changes to "Unaffiliated" rather
 * than to a blank or a dash — `default` / `na` / Unaffiliated is already one
 * identity here, and a blank advertises the omission.
 *
 * ── THIS IS *NOT* WHERE THE REDACTION LIVES, AND THE SPLIT IS DELIBERATE ────
 *
 * The mask is deliberately not `[REDACTED]` everywhere (ADR-0082, #2409):
 * where a name LABELS a thing already on screen, "Unaffiliated" is right. A
 * byline, a task card, a seal and a switcher row are labels, so this function
 * does not redact.
 *
 * The two surfaces that are ABOUT the society — the `/factions` select tile
 * and the leaderboard's eighth lane — redact instead, by calling
 * `redactableText` / `isFactionRedacted` themselves. Redaction is a mechanic
 * on those two surfaces, not a global rename of the word.
 *
 * If that reads as an inconsistency, it is a ruled one: ADR-0082 §2 records
 * which surfaces do which and why, before you "fix" it here.
 *
 * Not a security boundary. The wire carries the slug, and since ADR-0082 it
 * also carries the `/factions` row. This stops the app from SAYING the name; it
 * does not pretend to stop a reader of the network tab.
 */
export function factionName(slug: string | null | undefined): string {
  const key =
    slug === ALBESCENT_FACTION_SLUG && !albescentRevealed
      ? UNAFFILIATED_FACTION_SLUG
      : slug ?? "";
  if (i18n.exists(`factions:names.${key}`)) {
    return tString(`factions:names.${key}`);
  }
  return i18n.t("factions:names.na");
}

/**
 * Get a faction's description by slug from the factions.json catalog
 * (`descriptions.<slug>`). An unrecognized slug falls back to the shared
 * "No description yet." copy (`detail.descriptionEmpty`).
 *
 * A plain catalogue read, and it stays one: the only page that draws an
 * Albescent description is the faction detail behind `AlbescentGate`, which a
 * revealed account is the only one to reach. See `factionName` for the
 * label-versus-mechanic boundary ADR-0082 §2 draws.
 */
export function factionDescription(slug: string | null | undefined): string {
  const key = slug ?? "";
  if (i18n.exists(`factions:descriptions.${key}`)) {
    return tString(`factions:descriptions.${key}`);
  }
  return i18n.t("factions:detail.descriptionEmpty");
}

/**
 * Every slug that has a theme of its own, in declaration order.
 *
 * Derived from CSS_KEY rather than kept as a second list, which would be the
 * parallel registry #1269 removed. `albescent` and `na` are excluded for free —
 * they map to `default`, and "has a resolvable theme" is exactly what
 * isKnownFaction means.
 */
export function getAllFactions(): FactionConfig[] {
  return Object.keys(CSS_KEY)
    .filter(isKnownFaction)
    .map((slug) => ({ slug }));
}

/**
 * Canonical rainbow display order for faction strips/pennants (issue #352):
 * Everymen → UA → Ephemerists → S.N.I.D.E. → Singularity → Warriors of Whimsy
 * → Cozy Coven. Red, orange, gold, green, blue, plum, pink — the order is the
 * spectrum, so a slug's position is decided by its hue and nothing else.
 *
 * SORTED BY: each `--faction-{slug}` light value's HSL hue angle, read off
 * index.css. LAST RE-SORTED: 2026-08-17 (#2078), following #2068's hue swap.
 * Angles then — everymen 358, ua 18, ephemerists 41, snide 82, singularity 221,
 * wow 274, coven 335. The wheel is cut at RED, which is why `everymen` leads
 * rather than `ua`: #c1272d is h357.7, i.e. −2.3°, straddling the origin (its
 * dark twin #ef5350 is h1.1), so a raw ascending sort of the light values would
 * wrap it to the tail. Move a slug here only after re-reading the hue.
 *
 * The order follows the hues, not the slugs: there is no teal in the spectrum,
 * and green→blue is one long jump. The adjacency it has to carry is UA's sienna
 * beside the Ephemerists' plate brass — a "second brown" pairing — at ΔE2000
 * 31.1 light / 30.3 dark, against 12.4 / 13.5 for everymen|ua, which already
 * ships as the tightest pair. Measured, not assumed — and not assertable here,
 * because this module holds no colour (#1269).
 *
 * Albescent is deliberately absent (#783). It is a secret society hiding in
 * plain sight: /factions omits it server-side until an account is revealed to it
 * (ADR-0027, #390), so any bar built from this array would leak its existence —
 * in its own near-black, no less — to every unrevealed player. Keeping the slug
 * out closes that at the source, for every consumer at once.
 *
 * Consumers must not assume a length, and only one of them paints these fills
 * with a hard edge between them: the mobile factions directory's stripe bar,
 * which distributes stops evenly across whatever is here. `factionStandings`
 * takes this array as the ROSTER of race lanes and then re-sorts by points, and
 * the filter facet lists gapped rows — neither shows an adjacency.
 */
export const FACTION_RAINBOW_ORDER: readonly string[] = [
  "everymen",
  "ua",
  // The gold slot: a plate brass sits between UA's sienna and S.N.I.D.E.'s
  // acid green (#2078).
  "ephemerists",
  "snide",
  "singularity",
  // A plum belongs between the blue and the pink, which is the only index a
  // plum can hold (#2068, #2078).
  "wow",
  // Cozy Coven takes the pink slot, because it took the pink (#784).
  "coven",
];

/**
 * Sort factions into canonical rainbow order without mutating the input.
 * Unknown slugs sort last, preserving their relative (arrival) order.
 */
export function sortFactionsByRainbowOrder<T extends { slug: string }>(
  factions: T[],
): T[] {
  const rankOf = (slug: string): number => {
    const index = FACTION_RAINBOW_ORDER.indexOf(slug);
    return index === -1 ? FACTION_RAINBOW_ORDER.length : index;
  };
  return [...factions].sort(
    (first, second) => rankOf(first.slug) - rankOf(second.slug),
  );
}

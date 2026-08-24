/**
 * Shared faction configuration — the JS side of faction identity.
 *
 * It holds NO colour. index.css is the only source of a faction hue, and this
 * module hands out `var()` references into it (factionCssVar / factionFill), so
 * dark mode arrives free via the [data-theme="dark"] cascade and there is no
 * second table to keep in sync.
 *
 * There used to be one. The docblock here asked humans to mirror every
 * --faction-* value by hand, and it drifted: `ua` sat at #c2541f in JS against
 * #c24a18 in CSS, and #c2541f is verbatim --faction-default-stop-2 — the
 * unaffiliated spectrum's orange. Every JS-sourced surface painted UA in na's
 * hue. Worse, a hex literal has no dark half by construction, so no amount of
 * mirroring could have reached the dark lift. Deleting the table is what makes
 * the drift impossible rather than merely tested (#1269).
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
  // Warriors of Whimsy is themed again (#812) — this is the flip the #784
  // comment anticipated. This ONE line is what re-themes WOW, because
  // isKnownFaction tests the mapped VALUE (`!== "default"`), not key presence
  // (#749). Its colour was the rainbow's yellow and is the chronicle plum since
  // #2068; its SKIN is the cream/gold/plum chronicle, which is a different thing
  // and does not follow the hue (#838, ADR-0050) — the two merely agree on a
  // value now, in light, which is not the same as being one token. WOW still
  // registers only a few manifest surfaces, so the rest fall back to Default*
  // until #840.
  wow: "wow",
  ephemerists: "ephemerists",
  singularity: "singularity",
  // Albescent is registered but NOT themed (#783). It is a secret society
  // hiding in plain sight, so it points at `default` exactly like `na` below:
  // same neutral scalars, same rainbow through factionFill, and — because the
  // predicate reads the mapped VALUE — isKnownFaction('albescent') === false.
  // That is the intended outcome, not a gap. It was first-class (#232) with a
  // 35-declaration --faction-albescent-* block; the block is gone.
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
 * a `background:` is what #694 was — it filled the collab roster's cast row
 * with the faction's muted TEXT ink and printed the accent pill on it at
 * 1.05:1.
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
 * destructive. They existed as a single ink until #1449, which is why anything
 * reading `card-notice` for a red meaning is a site to re-check rather than a
 * precedent to copy.
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
 * takes, because at that size a flat disc reads as a sticker. It exists as a
 * shape because three feed cards had each written that ramp by hand out of an
 * interpolated hex — which is how the JS hue drifted from the CSS one in the
 * first place. na is identical to `"dot"`: the conic spectrum, already the right
 * answer at 28px.
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
 *                linear is mud at 10–12px). SMOOTH, not wedged: the hard-wedge
 *                conic this used to name was deleted in #1127, because its seven
 *                light stops sit inside a 0.184 luminance band and the wedge
 *                edges merged into one dark band
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
 * The scalar (`border/ring`) contexts that used to reach for `factionCssVar` and
 * land on grey now ask for `"frame"` instead. A real faction's `"frame"` is a
 * plain solid `var(--faction-{key})` border, so `factionCssVar` + `"frame"` agree
 * for known factions and only `na`/unregistered slugs change.
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
 * Spread it where `background: factionCssVar(slug, 'card-bg')` used to sit. The
 * rendered result for `na` is byte-identical to that one line; what it buys is a
 * seam. Albescent's kit (#2496) is "the na component plus ornament, never a
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
 * Read a catalogue string through the redaction gate (#2409).
 *
 * THE REDACTION IS A RENDERING RULE OVER THE ORDINARY CATALOGUE, never a second
 * set of strings. Albescent's copy is authored exactly as every other faction's
 * is, and this function decides whether the viewer gets to read it — so the
 * moment an account is revealed the real words are already in place, with
 * nothing to swap in and nothing that can be authored in one catalogue and
 * forgotten in the other.
 *
 * Any Albescent-scoped key redacts; every other key is a plain `t()`. That is
 * why this is safe to reach for anywhere — a surface does not have to know
 * whether the string it is drawing belongs to Albescent.
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
 * encounter the word. The name was leaking through every surface that labels a
 * thing with its faction — praxis bylines, task cards, metatask seals, the
 * character switcher, a sidebar `aria-label` — about thirty-five call sites,
 * each of which would have needed its own gate, and each of which is a place a
 * future page can forget.
 *
 * Putting the gate HERE is what makes a page written next month secret by
 * construction rather than by review. It is also the only version that covers
 * the callers which are not React at all and have no context to read.
 *
 * ── WHAT #2409 CHANGED, AND IT IS ONE SENTENCE ──────────────────────────────
 *
 * This docblock used to end: *"it changes to 'Unaffiliated' rather than to a
 * blank or a dash — a blank advertises the omission."* Advertising the omission
 * is now the feature. The society is present everywhere the other factions are,
 * every string reading `[REDACTED]`, and the mask is a locked door with no
 * keyhole rather than a thing that was never there. That reverses exactly one
 * sentence of #1891.
 *
 * #1891 RULING 1 IS UNTOUCHED AND STILL GOVERNS: the look is untouched.
 * Albescent's skins, frames and voices keep rendering, `factionCssVar` still
 * resolves it to the unaffiliated default, and a redacted card still wears the
 * society's own face. Only the word changes.
 *
 * Not a security boundary, and less of one than it was. The wire has always
 * carried the slug; since #2409 it also carries the `/factions` row (ADR-0082).
 * This stops the app from SAYING the name; it does not pretend to stop a reader
 * of the network tab.
 */
export function factionName(slug: string | null | undefined): string {
  const key = slug ?? "";
  if (i18n.exists(`factions:names.${key}`)) {
    return redactableText(`factions:names.${key}`);
  }
  return i18n.t("factions:names.na");
}

/**
 * Get a faction's description by slug from the factions.json catalog
 * (`descriptions.<slug>`). An unrecognized slug falls back to the shared
 * "No description yet." copy (`detail.descriptionEmpty`).
 *
 * Redacts on the same gate as the name (#2409). `descriptions.albescent` is the
 * owner's PLACEHOLDER today and redacts either way; when the real blurb is
 * written it slots in with no change here, which is the point of redacting the
 * catalogue rather than authoring a redacted one.
 */
export function factionDescription(slug: string | null | undefined): string {
  const key = slug ?? "";
  if (i18n.exists(`factions:descriptions.${key}`)) {
    return redactableText(`factions:descriptions.${key}`);
  }
  return i18n.t("factions:detail.descriptionEmpty");
}

/**
 * Every slug that has a theme of its own, in declaration order.
 *
 * Derived from CSS_KEY rather than kept as a second list: the colour table this
 * used to read was a parallel registry, and a parallel registry is what #1269
 * was. `albescent` and `na` are excluded for free — they map to `default`, and
 * "has a resolvable theme" is exactly what isKnownFaction means.
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
 * #2068 moved two hues and #2075 left this array alone, so it spent one release
 * claiming a spectrum it no longer had: WOW's yellow became a plum and the
 * Ephemerists' teal a plate brass. #2078 is the owner's ruling to follow the
 * hues — `ephemerists` up to index 2, `wow` down to index 5 — accepting the
 * repaint of every surface that reads this order. There is no teal in the
 * spectrum at all now, and green→blue is one long jump rather than two short
 * ones. The adjacency that ruling had to clear is UA's sienna beside the brass,
 * the exact "second brown" pairing the old yellow was tuned deep to avoid:
 * ΔE2000 31.1 light / 30.3 dark, against 34.2 / 31.0 for the yellow it replaces
 * and 12.4 / 13.5 for everymen|ua, which already ships as the tightest pair.
 * Measured, not assumed — and not assertable here, because this module holds no
 * colour (#1269).
 *
 * Albescent is deliberately absent (#783). It is a secret society hiding in
 * plain sight: /factions omits it server-side until an account is revealed to it
 * (ADR-0027, #390), so any bar built from this array would have leaked its
 * existence — in its own near-black, no less — to every unrevealed player.
 * `DefaultFactionsDirectory` worked around that by driving its legend off the
 * visible rows; `Leaderboard` and `DefaultPlayers` did not, and shipped the
 * leak. Removing the slug closes all three at the source.
 *
 * Consumers must not assume a length, and only one of them paints these fills
 * with a hard edge between them: the mobile factions directory's stripe bar,
 * which distributes stops evenly across whatever is here. `factionStandings`
 * takes this array as the ROSTER of race lanes and then re-sorts by points, and
 * the filter facet lists gapped rows — neither shows an adjacency. (The
 * Leaderboard's own bar and `Meadow`'s bloom were the other two touching
 * surfaces until #1868 and #1763 retired them.)
 */
export const FACTION_RAINBOW_ORDER: readonly string[] = [
  "everymen",
  "ua",
  // Took the gold slot when #2068 emptied the teal one, so it moved up from
  // index 4 to sit between UA's sienna and S.N.I.D.E.'s acid green (#2078).
  "ephemerists",
  "snide",
  "singularity",
  // Held index 2 as the yellow from #812; a plum belongs between the blue and
  // the pink, which is the only index a plum can hold (#2068, #2078).
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

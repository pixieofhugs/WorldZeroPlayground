import type { CSSProperties } from "react";

import { factionRoleVar } from "../../utils/factionRoles";

/**
 * The shape of the sign-up affordance across the nine task cards (#2030, task
 * cards v3): **a discrete inset button, with real air under it.**
 *
 * Four skins shipped the sign-up as a full-bleed footer bar — S.N.I.D.E.,
 * Coven, Everymen and the Ephemerists. A bar is the card's own bottom edge, so
 * it never had to answer where it sat; an inset button does, and the design's
 * note on its own conversion is the instruction: once a bar shrinks it can sit
 * flush against the card edge, so give every boxed button real air under it.
 * That is {@link CARD_CTA_ROW}.
 *
 * THE 44px FLOOR IS RE-SOLVED SPACING, NOT A `min-height` DROPPED ON A DRAWING.
 * `docs/agents/design-fidelity.md` names the failure mode by example: 44px hit
 * boxes on star anchors 60px apart overlapped each other and overflowed the
 * plate. Here the geometry that makes it safe is that the button is the ONLY
 * control in its row, centred, with the row's own padding between it and both
 * the card's edge and the card-wide `<Link>` above — the two are siblings and
 * neither is positioned, so no two hit boxes can overlap at any card width.
 * `min-height` alone would be the mistake; `min-height` plus a row that owns
 * the clearance is the port.
 *
 * WHAT DECIDES WHETHER THERE IS A CONTROL AT ALL is `signupAffordance.ts`, and
 * this file must not second-guess it: a card the viewer cannot sign up for
 * still renders nothing (`frontend/CLAUDE.md` — hide unusable controls, don't
 * show them disabled).
 *
 * THE RULE ABOVE THE CTA is per-faction and is NOT drawn here — it is a line in
 * the faction's own hand, so each of the four skins that draws one draws it
 * itself, tagged `data-cta-rule`. The reconciled table (the design's `RULES`
 * map and its skip list contradict each other; this is the owner's
 * reconciliation, #2030):
 *
 * | faction                                  | rule above the CTA                  |
 * |------------------------------------------|-------------------------------------|
 * | `na` / default                           | rainbow hairline, 1px, opacity 0.6  |
 * | `albescent`                              | the same hairline at opacity 0.45   |
 * | `ua`                                     | hairline in `--faction-ua-hair`     |
 * | `ephemerists`                            | double rule in `-plate-brass`       |
 * | `wow` `snide` `singularity` `coven` `everymen` | none — each already draws its own bottom treatment |
 *
 * The design also DEFINES a dotted Coven rule with a `✦` gem and a dashed
 * Everymen one, then skips both in the same pass. They are dead code from an
 * earlier iteration — the braid and the red dashes those cards draw are their
 * own, already there — and they are deliberately not built.
 */

/**
 * Every card's sign-up button, before its faction's paint.
 *
 * The 44px is the touch-target floor and is not negotiable; the flex box is
 * what keeps a label centred once the floor stretches a button past its
 * padding. A skin spreads this first and paints over it.
 */
export const CARD_CTA: CSSProperties = {
  // Geometry, so a raw number (WORLD_ZERO_STYLE §4a) — and the tap floor is a
  // fixed 44, not a rung of a spacing ramp that a redesign could move.
  minHeight: 44,
  boxSizing: "border-box",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

/**
 * The row a converted footer bar now sits in: centred, with the clearance under
 * it that the bar never needed. Read by the four skins that shipped a bar; the
 * five that were already inset take their air from the body padding they sit
 * inside.
 */
export const CARD_CTA_ROW: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  padding: "0 var(--space-lg) var(--space-lg)",
};

/**
 * ONE CTA PAINT PER FACTION, AND THE CARD'S IS THE CANONICAL ONE (#2642, owner
 * ruling 2026-08-24).
 *
 * #2554 put `CardCtaControl` on the task DETAIL as well as the card, so both
 * surfaces already share the element, the affordance and the copy. The paint was
 * still written twice — a style object at the card's call site and an unrelated
 * local constant on the detail (`primaryButton`, `primaryAction`, `pinkButton`,
 * `plateButton(false)`, `primaryBar`, `ctaStyle(false)`) — eighteen
 * hand-maintained paints with nothing forcing a pair to agree. They didn't: na's
 * card CTA was a transparent outlined button and its detail's a solid inverted
 * slab.
 *
 * The eight constants below are that second paint deleted. Both call sites of a
 * faction spread exactly one of them and add nothing, which is what
 * `__tests__/ctaPaintPairs.test.tsx` asserts — per named faction, off the
 * rendered markup of both surfaces.
 *
 * WHY HERE AND NOT IN EACH FACTION'S OWN MODULE. The alternative layout was to
 * export each card's constant from its own `*TaskCard.tsx` and import it into
 * the matching `*TaskDetail.tsx`, putting a faction's paint next to the rest of
 * its paint. It would make a page-sized component the module a detail route
 * imports, and the ornament hanging off those files (`UaMandala`,
 * `BalloonBunch`, the Everymen fist path) would follow it into the detail's
 * chunk for the sake of one object. `cardCta.ts` is already the CTA's home,
 * already imported by all eight cards, and holds nothing else.
 *
 * A SURFACE-PREFIXED ROLE VAR CANNOT TRAVEL, SO NONE IS USED HERE. Three cards
 * read their face through their own root's prefix — `--wow-task-card-face`,
 * `--ev-task-face`, `--sg-task-card-face` — and those prefixes exist only under
 * the card (`frontend/CLAUDE.md`: the prefix is the SURFACE's). A constant
 * spread on two surfaces has to reach the token itself, so it does:
 * `factionRoleVar(slug, 'face')` is the same value the card's own
 * `factionRoleVars` declares, one hop earlier. `--na-task-card-*` keeps its
 * fallback arm for the reason it always had one — for `na` the map is empty and
 * the fallback is the whole paint.
 *
 * WHAT IS DELIBERATELY NOT IN A CONSTANT: `cursor`, which is affordance and
 * belongs to `CardCtaControl`; and the size delta, which is
 * {@link CTA_DETAIL_SIZE}.
 */

/**
 * The one legitimate difference between the two surfaces: the card's CTA sits in
 * a narrow column and the detail's stands alone in a panel.
 *
 * GEOMETRY ONLY, AND DELIBERATELY NOT A TYPE RUNG. Measured before it was
 * written: of the eight details, three set the same `font-size` their card did,
 * two set a smaller one and three a larger. There is no "the detail is a rung
 * up" rule to carry — only the full-bleed width — so a size token that moved
 * type too would be inventing a difference rather than preserving one. A
 * `font-size` sitting beside `font-family`, `font-weight` and `letter-spacing`
 * in the constant is the faction's voice, not its scale.
 *
 * Spread AFTER the faction constant by `CardCtaControl` — the one place that
 * component's "paint last" order is deliberately inverted, because the whole
 * point is that a card's narrow-column padding must not survive into a panel.
 * Keep every declaration here geometric: a colour would silently beat the
 * skin's.
 */
export const CTA_DETAIL_SIZE: CSSProperties = {
  width: "100%",
  padding: "var(--space-md) var(--space-xl)",
};

/** na — and Albescent, which wraps the na card and the na detail alike. */
export const DEFAULT_CARD_CTA: CSSProperties = {
  ...CARD_CTA,
  whiteSpace: "nowrap",
  fontFamily: "var(--font-display)",
  fontWeight: 600,
  fontSize: "var(--text-xl)",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  padding: "var(--space-md) var(--space-2xl)",
  borderRadius: 11,
  color: "var(--na-task-card-ink, var(--faction-default-card-text))",
  background: "transparent",
  border:
    "1px solid color-mix(in srgb, var(--na-task-card-accent, var(--faction-default-card-accent)) 35%, transparent)",
};

/** UA — the chip the mandalas flank on the card, the panel's note on the page. */
export const UA_CARD_CTA: CSSProperties = {
  ...CARD_CTA,
  fontFamily: factionRoleVar("ua", "face"),
  fontWeight: 600,
  fontSize: "var(--text-content)",
  letterSpacing: "0.02em",
  whiteSpace: "nowrap",
  padding: "var(--space-sm) var(--space-xl)",
  borderRadius: 5,
  color: "var(--faction-ua-card-chip-ink)",
  background: "var(--faction-ua-card-chip-bg)",
  border: "1.5px solid var(--faction-ua-card-frame)",
};

/** Coven — the pink box, a rounded 12 rather than a pill (#2033). */
export const COVEN_CARD_CTA: CSSProperties = {
  ...CARD_CTA,
  display: "flex",
  gap: "var(--space-sm)",
  background:
    "linear-gradient(180deg, var(--faction-coven-slip-cta-from), var(--faction-coven-slip-cta-to))",
  color: "var(--faction-coven-slip-cta-ink)",
  fontFamily: "var(--font-faction-rounded)",
  fontWeight: 700,
  fontSize: "var(--text-lg)",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  padding: "var(--space-sm) var(--space-xl)",
  border: "1.5px solid var(--faction-coven-slip-cta-to)",
  borderRadius: 12,
  boxShadow: "0 3px 8px var(--faction-coven-slip-glow)",
};

/**
 * S.N.I.D.E. — the sprayed stencil, halo and all (#2065).
 *
 * THE RING IS LOAD-BEARING, not decoration: `--faction-snide-note-*` flips, and
 * without an OPAQUE edge in the theme-invariant `-acid-deep` the button would be
 * a black rectangle on a black card after dark. It is a `box-shadow` rather than
 * a `border` so it cannot change the box the 44px floor was solved against.
 */
export const SNIDE_CARD_CTA: CSSProperties = {
  ...CARD_CTA,
  background: "var(--faction-snide-note-bar)",
  color: "var(--faction-snide-acid)",
  fontFamily: "var(--faction-snide-font-marker)",
  fontSize: "var(--text-content)",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  padding: "var(--space-sm) var(--space-2xl)",
  border: "none",
  // The halo, at the design's intensity (#2065). It used to put two of its
  // three passes on `--faction-snide-light`, a FIXED 16% tint (12% in dark) — so
  // every pass was capped at 16% however wide the radius, which is why it read
  // muted, and it was dimmer at night, when a sprayed stencil should be
  // loudest. `color-mix` grades the acid itself per layer, so the alphas rise as
  // the radii TIGHTEN, and the last two passes are offset: that asymmetry is
  // what reads as sprayed rather than lit. Still no raw colour anywhere in it.
  textShadow: [
    "0 0 1px color-mix(in srgb, var(--faction-snide-acid) 95%, transparent)",
    "0 0 6px color-mix(in srgb, var(--faction-snide-acid) 70%, transparent)",
    "0 0 16px color-mix(in srgb, var(--faction-snide-acid) 45%, transparent)",
    "1px 2px 0 color-mix(in srgb, var(--faction-snide-note-bar) 65%, transparent)",
    "-2px 1px 5px color-mix(in srgb, var(--faction-snide-acid) 35%, transparent)",
  ].join(", "),
  boxShadow:
    "0 0 0 2px var(--faction-snide-acid-deep), inset 0 0 18px var(--faction-snide-light)",
  transform: "rotate(-1.6deg)",
};

/**
 * Everymen — the struck block off the bill's masthead.
 *
 * `flex: 0 0 auto` is the CARD'S ROW talking: the button is flanked by two marks
 * and must never yield a pixel of the 44px floor to them. It is inert in the
 * detail's block context, and carrying it here is what keeps both call sites a
 * bare spread of one constant.
 */
export const EVERYMEN_CARD_CTA: CSSProperties = {
  ...CARD_CTA,
  flex: "0 0 auto",
  background: "var(--faction-everymen-bill-cta-bg)",
  color: "var(--faction-everymen-bill-cta-ink)",
  fontFamily: factionRoleVar("everymen", "face"),
  fontSize: "var(--text-xl)",
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  padding: "var(--space-sm) var(--space-2xl)",
  border: "2px solid var(--everymen-paper-text)",
  borderRadius: 2,
};

/**
 * Ephemerists — THE ONE PLATE CTA (#2146). Ground, ink and enclosure are NOT
 * here: they come from `.eph-cta` in index.css, because the enclosure changes
 * WIDTH between the cascades and no token can carry that. Every element
 * spreading this must also wear the `.eph-cta` class — an inline `background` or
 * `border` would beat the class and pin the light half in both themes. (Spelt
 * with the leading dot on purpose: `ephemeristsCta.test.tsx` censuses the
 * MOUNTS of that class by grepping for it at a `className`, and a module that
 * only talks about it is not a mount.)
 */
export const EPHEMERISTS_CARD_CTA: CSSProperties = {
  ...CARD_CTA,
  display: "flex",
  gap: "var(--space-md)",
  margin: "var(--space-md) auto",
  padding: "var(--space-sm) var(--space-xl)",
  fontFamily: "var(--font-faction-engraved)",
  fontWeight: 500,
  fontSize: "var(--text-xl)",
  letterSpacing: "0.24em",
  textTransform: "uppercase",
};

/**
 * Singularity — the lit key on the terminal.
 *
 * `gridColumn: 2` is the card's row talking, the same way Everymen's `flex` is:
 * the card centres the key in a `1fr auto 1fr` grid, and the declaration is
 * inert on the detail, which is not a grid child.
 */
export const SINGULARITY_CARD_CTA: CSSProperties = {
  ...CARD_CTA,
  gridColumn: 2,
  whiteSpace: "nowrap",
  fontFamily: factionRoleVar("singularity", "face"),
  fontSize: "var(--text-xl)",
  letterSpacing: "0.02em",
  padding: "var(--space-sm) var(--space-xl)",
  borderRadius: 5,
  color: "var(--faction-singularity-term-cta-ink)",
  background: "var(--faction-singularity-term-cta-bg)",
  border: "1.5px solid var(--faction-singularity-term-bright)",
};

/** Warriors of Whimsy — the plum call the two knights face. */
export const WOW_CARD_CTA: CSSProperties = {
  ...CARD_CTA,
  fontFamily: factionRoleVar("wow", "face"),
  fontSize: "var(--text-content)",
  letterSpacing: "0.04em",
  whiteSpace: "nowrap",
  padding: "var(--space-sm) var(--space-xl)",
  borderRadius: 7,
  color: "var(--faction-wow-on-plum)",
  background: "var(--faction-wow-plum-surface)",
  border: "2px solid var(--faction-wow-plum-surface)",
};

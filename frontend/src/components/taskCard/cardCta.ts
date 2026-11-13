import type { CSSProperties } from "react";

import { factionRoleVar } from "../../utils/factionRoles";
import { CARD_CTA } from "../ctaTapFloor";

/**
 * The task-card sign-up: a discrete inset button with air under it (#2030).
 *
 * The 44px floor is safe because the button is the only control in its row,
 * an unpositioned sibling of the card-wide `<Link>`, so hit boxes cannot
 * overlap at any width (design-fidelity.md). Whether there is a control at all
 * is `signupAffordance.ts`'s call.
 *
 * The rule above the CTA is drawn by each skin (`data-cta-rule`), per #2030:
 * na 1px rainbow hairline at 0.6; albescent the same at 0.45; ua hairline in
 * `--faction-ua-hair`; ephemerists double `-plate-brass` rule; the other five
 * none (they draw their own bottom treatment).
 */

/** Re-exported from `../ctaTapFloor` (#2826), which explains why it lives there. */
export { CARD_CTA } from "../ctaTapFloor";

/** Row for the four skins that once had a footer bar; centred, with clearance. */
export const CARD_CTA_ROW: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  padding: "0 var(--space-lg) var(--space-lg)",
};

/**
 * One CTA paint per faction; the card's is canonical and the task detail
 * spreads the same constant (#2642, held by `ctaPaintPairs.test.tsx`).
 *
 * They live here, not in each `*TaskCard.tsx`, so a detail route doesn't pull
 * the card's ornament into its chunk. Faces use `factionRoleVar(slug, 'face')`,
 * not the card's surface-prefixed var, which doesn't exist on the detail.
 * `cursor` belongs to `CardCtaControl`.
 */

/**
 * Detail-panel geometry, spread AFTER the faction paint so the card's
 * narrow-column padding doesn't survive. Geometry only: details don't share a
 * type-rung delta, and a colour here would silently beat the skin's.
 */
export const CTA_DETAIL_SIZE: CSSProperties = {
  width: "100%",
  padding: "var(--space-md) var(--space-xl)",
};

/**
 * Faction directory tile join-button geometry (#2818); same rules as
 * {@link CTA_DETAIL_SIZE}. No `space-between` here: tiles with a member count
 * put `margin-left: auto` on the count span, so single-child tiles stay centred.
 */
export const CTA_SELECT_SIZE: CSSProperties = {
  width: "100%",
  padding: "var(--space-md) var(--space-lg)",
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
  fontFamily: "var(--font-faction-script)",
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
 * S.N.I.D.E. — the sprayed stencil (#2065). The opaque `-acid-deep` ring keeps
 * it visible on the dark card; a `box-shadow` so it can't change the 44px box.
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
  // Alphas rise as radii tighten; the offset last passes read as sprayed, not lit.
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
 * Everymen — the struck block. `flex: 0 0 auto` keeps the card row's flanking
 * marks from squeezing the 44px floor; inert on the detail.
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
 * Ephemerists plate CTA (#2146). Ground, ink and enclosure come from `.eph-cta`
 * (enclosure width differs per theme); every spreader must wear that class, and
 * an inline `background`/`border` would pin the light half in both themes.
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

/** Singularity — the lit key. `gridColumn: 2` centres it in the card's grid. */
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

/**
 * The only card/detail paint difference, an owner ruling on #2642: Singularity's
 * detail keeps its glow. A named constant so `ctaPaintPairs.test.tsx` can allow
 * exactly these keys; any other exception must be argued for here.
 */
export const SINGULARITY_DETAIL_GLOW: CSSProperties = {
  boxShadow: "var(--faction-singularity-term-cta-glow)",
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

import type { CSSProperties } from "react";

/**
 * Every sign-up button's box, before its faction's paint — the 44px touch-target
 * floor and the flex that keeps a label centred once the floor stretches a
 * button past its own padding.
 *
 * WHY IT IS A FILE OF ITS OWN, AND NOT A LINE IN `taskCard/cardCta.ts` WHERE IT
 * LIVED FROM #2030 TO #2826. Four surfaces spread it now — the task card, the
 * task detail, the faction select tile and, since #2826, the join control — and
 * the fourth is on the CRITICAL PATH: `JoinControl` is reachable from
 * `main.tsx` (through `InvitationLetterPopup`) and from `pages/Settings.tsx`
 * with no chunk boundary in between. `cardCta.ts` also holds the eight
 * per-faction PAINTS, and every one of those sets a faction `font-family`, so a
 * static import of that module from the entry graph strands 62 `@font-face`
 * rules exactly the way `utils/__tests__/factionFaceSplit.test.ts` (#2079)
 * describes: the sheet is only fetched behind a chunk boundary, the type paints
 * in its generic fallback, and nothing throws. That guard caught this import the
 * first time it was written; splitting the geometry off is the fix it asks for,
 * because geometry has no face.
 *
 * `cardCta.ts` re-exports it, so the eight paints and their consumers are
 * unchanged and there is still one name for one box.
 *
 * THE 44px IS RE-SOLVED SPACING WHEREVER IT LANDS, NOT A `min-height` DROPPED ON
 * A DRAWING — `cardCta.ts`'s own docblock carries that argument and the geometry
 * each surface pairs it with. Read it before spreading this into a fifth.
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

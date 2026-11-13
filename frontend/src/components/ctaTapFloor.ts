import type { CSSProperties } from "react";

/**
 * Every sign-up button's box before its faction paint: the 44px tap floor plus
 * centring flex. Its own file because `JoinControl` is on the critical path, and
 * importing `taskCard/cardCta.ts` (faction fonts) from the entry graph strands
 * `@font-face` rules (`factionFaceSplit.test.ts`, #2079). `cardCta.ts` re-exports
 * it and its docblock explains how each surface re-solves spacing around the 44px.
 */
export const CARD_CTA: CSSProperties = {
  // Geometry, so a raw number (§4a); a fixed floor, not a spacing rung.
  minHeight: 44,
  boxSizing: "border-box",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

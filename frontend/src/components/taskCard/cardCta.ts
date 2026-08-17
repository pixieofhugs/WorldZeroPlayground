import type { CSSProperties } from "react";

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

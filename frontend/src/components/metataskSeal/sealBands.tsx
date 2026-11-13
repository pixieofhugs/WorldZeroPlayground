import CardMasthead from "../cardMasthead/CardMasthead";
import { factionRoleVars } from "../../utils/factionRoles";
import { factionName } from "../../utils/factions";

/**
 * na's and Albescent's bands, for the METATASK SEAL ONLY (#2648). Kept out of
 * `cardMasthead/factionBands.tsx` (ADR-0048: a band naming Albescent on a card
 * would disclose it). Allowed here because a seal's copy already names its
 * issuer; a third mount must pass the same test on its own copy. Nothing else
 * may import these.
 *
 * No new paint: both stand on the na card's stock/ink, no `markColor` (#783).
 * They differ by the rule: na's seal already wears a spectrum frame (no second
 * ramp, #2519); Albescent's flat-framed seal gets the travelling
 * `.spectrum-rule` under the `alb-moves` marker (#2500).
 */

/** na's card face — `var(--font-accent)`, the register both seals letter in. */
const NA_FACE = "var(--na-band-face)";
/**
 * Same face under the Albescent band's own prefix (#2672). Spelled out, not
 * interpolated: interpolated role names are invisible to `factionTokensDeclared`.
 */
const ALB_FACE = "var(--alb-band-face)";

/** 2px at 0.55, matching the na plate's hairline and section rules. Geometry, so raw (§4a). */
const RULE_HEIGHT = 2;
const RULE_OPACITY = 0.55;

/** Uppercase is the na seal's register; the name comes from ADR-0038's one source. */
function DefaultBand() {
  return (
    <CardMasthead
      slug="na"
      style={{
        // Role map (#2672); both bands resolve na's family.
        ...factionRoleVars("na", "na-band"),
        background: "var(--na-band-paper)",
        color: "var(--na-band-ink)",
      }}
    >
      <span
        style={{
          fontFamily: NA_FACE,
          fontSize: "var(--text-title)",
          letterSpacing: "0.06em",
          lineHeight: 1,
          textTransform: "uppercase",
        }}
      >
        {factionName("na")}
      </span>
    </CardMasthead>
  );
}

/**
 * Albescent's band — na's, plus the one colour this faction has: a ramp that
 * moves. The strip is `aria-hidden` chrome with no children, so
 * `.alb-moves .spectrum-rule:empty` gives it the clip and the containing block
 * its travelling child resolves against; stranded (reduced motion, or the
 * ornament sheet undelivered) it is the still na spectrum, which is the na
 * surface exactly.
 */
function AlbescentBand() {
  return (
    <>
      <CardMasthead
        slug="albescent"
        style={{
          // `albescent` resolves to `default`: the society stays out of the
          // spectrum (ADR-0048, #783) without this file naming it.
          ...factionRoleVars("albescent", "alb-band"),
          background: "var(--alb-band-paper)",
          color: "var(--alb-band-ink)",
        }}
      >
        <span
          style={{
            fontFamily: ALB_FACE,
            fontSize: "var(--text-title)",
            letterSpacing: "0.06em",
            lineHeight: 1,
            textTransform: "uppercase",
          }}
        >
          {factionName("albescent")}
        </span>
      </CardMasthead>
      <span
        aria-hidden="true"
        className="block spectrum-rule"
        style={{ height: RULE_HEIGHT, opacity: RULE_OPACITY }}
      />
    </>
  );
}

export { AlbescentBand, DefaultBand };

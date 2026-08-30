import CardMasthead from "../cardMasthead/CardMasthead";
import { factionRoleVars } from "../../utils/factionRoles";
import { factionName } from "../../utils/factions";

/**
 * THE EIGHTH AND NINTH BANDS — na's and Albescent's — AND THEY EXIST FOR THE
 * METATASK SEAL ONLY (#2648, owner ruling 2026-08-25).
 *
 * `cardMasthead/factionBands.tsx` exports SEVEN and says why the other two are
 * absent, in as many words: "the Albescent card IS the unaffiliated sheet plus a
 * drift, and a band naming the society would un-hide it" (ADR-0048). That rule
 * is not weakened and that file is not touched — which is the whole reason these
 * two live HERE, in the one family sanctioned to mount them, rather than beside
 * their seven siblings where a card kit could import them by autocomplete.
 *
 * THE EXCEPTION IS SPECIFIC, AND IT IS ABOUT DISCLOSURE, NOT SYMMETRY. A seal's
 * first field has always been its ISSUER, printed in plain sight: until this
 * issue every skin drew `praxis:detail.seal.label` — "Albescent Metatask" —
 * as its own eyebrow. A band naming the society therefore reveals nothing the
 * seal's own copy had not already revealed; it says the same name in the shape
 * the rest of the kit says it in. That is not true of a task card or a praxis
 * card, whose copy names no faction at all, and it is why those two stay
 * bandless.
 *
 * SO THE TEST FOR A THIRD MOUNT IS THE SURFACE'S OWN COPY, not this precedent.
 * If a surface already names Albescent in words it is allowed a band; if it does
 * not, a band would be the disclosure ADR-0048 forbids, and the fact that the
 * seal has one is no argument at all. Nothing else in the tree may import these.
 *
 * NO NEW PAINT (#2648's actual question). Neither band authors a colour: both
 * stand on `--faction-default-card-bg` under `--faction-default-card-text` —
 * the na card's own stock and ink, the pairing both seals already sat on — and
 * neither hands the mark a `markColor`, because na's ring and Albescent's
 * labyrinth are both filled from the unaffiliated conic and carry no hue that
 * could vanish on a ground (#783).
 *
 * WHAT SEPARATES THEM IS THE RULE, WHICH IS THE KIT'S OWN DISTINCTION.
 * `DefaultEditPraxis` records it for the composer — "na's band is the sheet's
 * own spectrum frame now" (#2520) — and the na seal wears exactly that frame, so
 * a second ramp under its wordmark would be two spectra on one small object, the
 * doubling #2519 spent a PR undoing. The Albescent seal has a flat hairline
 * frame instead and drew its ramp as a strip under the label; that strip is this
 * band's rule now, flush and unmoved in paint, still `.spectrum-rule` and still
 * travelling under the `alb-moves` marker its root already carries (#2500).
 */

/** na's card face — `var(--font-accent)`, the register both seals letter in. */
const NA_FACE = "var(--na-band-face)";
/**
 * The same face on the Albescent band, under that band's OWN prefix (#2672).
 * Spelled out rather than interpolated from a `prefix` argument: a role
 * property built by interpolation is invisible to `factionTokensDeclared` and
 * to the migration gate, which is the "looks tokenized, is not" failure class
 * both exist for. Two bands are two surfaces, so two names.
 */
const ALB_FACE = "var(--alb-band-face)";

/**
 * The ramp's cut, matching the na plate's hairline and the task detail's section
 * rules (2px at 0.55, `index.css`). Geometry, so raw (§4a) — and it is the strip
 * `AlbescentSeal` already drew, at the one strength the rest of the kit rules at
 * rather than the 0.35 a lone eyebrow strip could afford.
 */
const RULE_HEIGHT = 2;
const RULE_OPACITY = 0.55;

/**
 * The unaffiliated band. Uppercase because that is the na seal's signature
 * register — `DefaultSeal`'s own condition line is set the same way — and the
 * casing belongs to the lettering, not to the word, so it lives in
 * `textTransform` and the name comes from the one place that owns it (ADR-0038).
 */
function DefaultBand() {
  return (
    <CardMasthead
      slug="na"
      style={{
        // The role map (#2672), off this band's OWN slug — which is the literal
        // above, so it is `{}` and no paint moves. The two bands differ by rule,
        // never by colour ("NO NEW PAINT", above), so both resolve na's family.
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
          // `resolveCssKey` sends `albescent` to `default`, so this declares the
          // same neutral family the na band above does — the society stays out
          // of the spectrum (ADR-0048, ADR-0083, #783) without this file naming
          // it. Before #2690 the map answered `{}` here and the fallback arms
          // said the same thing; the family is unchanged, only its delivery.
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

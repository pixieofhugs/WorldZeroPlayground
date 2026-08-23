/**
 * The seam: what the Ephemerists faction-page hero renders into its own header
 * (#2367).
 *
 * #2210 cut two incised registers of the OLD glyph vocabulary off this hero and
 * put nothing back, and the file grew a comment asserting that nothing was the
 * right answer because the hero "mounts no `EphemeristsMasthead`". That was
 * never the ruling. The owner's law is PAGE-VERSUS-CARD: a page carries the
 * notation band in its header, a card carries it at the call to action. The hero
 * is a page with a header, so the band goes in the header.
 *
 * The harness is `renderToStaticMarkup` — no DOM, no layout, no effects — so the
 * band's own marks CANNOT appear here: `markCount(0)` is 0 by design, and the
 * arithmetic and the seeding are asserted at the function in
 * `ephemeristsNotationBand.test`. What this file can hold is the two things a
 * mount decides and only a mount can get wrong: that the device is worn at all,
 * and that it is worn on the PAGE side of the law rather than a card's.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";

// Initialize the catalog so copy keys resolve to English text.
import "../../../i18n";
import EphemeristsFactionHero from "../EphemeristsFactionHero";

const html = renderToStaticMarkup(
  <EphemeristsFactionHero slug="ephemerists" name="The Ephemerists" members={4} tasks={9} praxes={2} />,
);

describe("the Ephemerists hero wears the notation band (#2367)", () => {
  it("mounts it once, and only once", () => {
    expect(html.match(/data-eph-runes=/g)).toHaveLength(1);
  });

  it("wears the PAGE placement — the band's own slot, not a card's CTA offset", () => {
    // `side` is the whole of the placement law at a mount: "band" is the
    // masthead's slot, ruled off in brass on the plate's night band, which is
    // this hero's ground too. "top" / "bottom" / "divider" bracket a button or a
    // byline, and this header has neither.
    expect(html).toContain('data-eph-runes="band"');
  });

  it("is ornament: hidden from assistive technology", () => {
    // The marks are a drawing with no reading. A screen reader spelling out
    // "integral, sum, therefore" under a faction wordmark would be worse than
    // useless.
    expect(html).toMatch(/aria-hidden="true"[^>]*data-eph-runes/);
  });
});

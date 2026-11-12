/**
 * The Ephemerists hero wears the notation band in its header (#2367): a page
 * wears it in the header, a card at the CTA. Static render draws no marks
 * (`markCount(0)` is 0); arithmetic lives in `ephemeristsNotationBand.test`.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";

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
    // "top" / "bottom" / "divider" bracket a button or byline; none here.
    expect(html).toContain('data-eph-runes="band"');
  });

  it("is ornament: hidden from assistive technology", () => {
    expect(html).toMatch(/aria-hidden="true"[^>]*data-eph-runes/);
  });
});

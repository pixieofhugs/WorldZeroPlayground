/**
 * The Coven tile and its task card name ONE token family (#2325), read off the
 * RENDER: the slip's colour arrives as `covenSlip` JS constants, which only
 * the markup shows resolved. Box + register invariants live in
 * `everySelectTileWearsItsCardsRegister` (#2816).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";

import { CovenSigil } from "../../sigil/CovenSigil";
import { tileMarkup } from "./tileMarkup";

const markup = () => tileMarkup("coven");

describe("the Coven tile wears the spell slip's register (#2325)", () => {
  it("takes the ward family off the tile for good", () => {
    for (const html of markup()) {
      expect(html, "the ward family is the faction DETAIL page's; the slip family is the card's").not.toContain(
        "--faction-coven-ward-",
      );
    }
  });

  it("badges itself with the canonical sigil", () => {
    const sigil = renderToStaticMarkup(<CovenSigil size={34} color="var(--faction-coven-slip-deep)" />);
    for (const html of markup()) expect(html, "the mark is the shared `CovenSigil`, never re-drawn").toContain(sigil);
  });

  it("sets the wordmark at a token, not a raw size, and at no synthesised bold", () => {
    for (const html of markup()) {
      const wordmark = html.match(/<span style="[^"]*">Cozy Coven<\/span>/)?.[0] ?? "";
      expect(wordmark, "the wordmark takes `CovenBand`'s own `--text-title`").toContain("font-size:var(--text-title)");
      expect(wordmark, "Caveat ships at 400 only, so a weight here is a faux bold").not.toContain("font-weight");
    }
  });
});

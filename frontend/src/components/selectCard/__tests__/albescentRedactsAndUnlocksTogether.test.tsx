/**
 * The Albescent tile has exactly TWO states, produced by one answer (#2409,
 * ADR-0082): both redaction and the lock read `isFactionRedacted`, so there's no
 * readable-but-dead or redacted-but-live third state. The reveal flag is
 * module-level, hence the unconditional reset.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, it, expect } from "vitest";

import i18n from "../../../i18n";
import AlbescentSelectCard from "../AlbescentSelectCard";
import { REDACTED, setAlbescentRevealed } from "../../../utils/factions";

/** Every authored slot on the tile, in the catalogue's own words. */
const REAL_COPY = [
  "Albescent",
  "Secrets secrets",
  "Request an audience",
];

const card = (): string =>
  renderToStaticMarkup(<AlbescentSelectCard state="locked" members={3} />);

afterEach(() => setAlbescentRevealed(false));

describe("the Albescent tile redacts and locks on one answer (#2409)", () => {
  it("prints [REDACTED] and NOT the real copy to an unrevealed viewer", () => {
    setAlbescentRevealed(false);
    const html = card();
    // Invisible real strings would still be in the markup and a11y tree.
    expect(html).toContain(REDACTED);
    for (const copy of REAL_COPY) {
      expect(html, `leaked: ${copy}`).not.toContain(copy);
    }
    expect(html.replace(/<[^>]*>/g, "")).not.toMatch(/\d/);
  });

  it("counts a revealed viewer's fellows in the header's noun", () => {
    setAlbescentRevealed(true);
    expect(card().replace(/<[^>]*>/g, "")).toContain(
      `3 ${i18n.t("feed:factionHero.albescent.stats.members", { count: 3 })}`,
    );
  });

  /** The tile is na's tile (#2632); the mark comes from `FactionSigil` (ADR-0083 §1). */
  it("keeps na's face and na's mark while unreadable (#2632)", () => {
    setAlbescentRevealed(false);
    const html = card();
    expect(html, "the vellum register is deleted").not.toContain("--albescent-reveal");
    expect(html).toContain("--faction-default-card-bg");
    expect(html).toContain("labyrinth");
  });

  /**
   * Epic #2496 ruling 8: `[REDACTED]` is painted in its ground's colour, so a
   * redacted tile keeps a FLAT ground; the prism arrives with the reveal.
   */
  it("withholds the prism while redacted and grants it with the reveal", () => {
    setAlbescentRevealed(false);
    expect(card()).not.toContain("alb-prism");
    setAlbescentRevealed(true);
    expect(card()).toContain("alb-prism");
  });

  it("marks the tile so the redaction paints and the sweep skips it", () => {
    setAlbescentRevealed(false);
    const html = card();
    // One exemption: the class paints it, `contrastScan.ts` skips the attribute.
    expect(html).toContain('class="redacted"');
    expect(html).toContain('data-redacted="true"');
  });

  it("renders the control and disables it, rather than dropping it", () => {
    setAlbescentRevealed(false);
    const button = /<button[^>]*>/.exec(card())?.[0] ?? "";
    expect(button).toContain("<button");
    expect(button).toContain("disabled");
  });

  it("says the real words and lives the control in the same moment", () => {
    setAlbescentRevealed(true);
    const html = card();
    for (const copy of REAL_COPY) {
      expect(html, `missing: ${copy}`).toContain(copy);
    }
    expect(html).not.toContain(REDACTED);
    expect(html).not.toContain("data-redacted");
    expect(html).not.toContain("disabled");
  });
});

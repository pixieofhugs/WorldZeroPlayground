/**
 * The Albescent tile has exactly TWO states, and the seam is that one answer
 * produces both of them (#2409, ADR-0082).
 *
 * `/factions` serves the Albescent row to everybody now, so this tile draws in
 * every directory. What separates a revealed viewer from an unrevealed one is
 * no longer whether the card exists — it is whether the card can be READ, and
 * whether its control can be pressed.
 *
 * THE RISK THIS PINS is a third state. The card un-redacts and unlocks in the
 * same moment because both read `isFactionRedacted`; two predicates here would
 * eventually disagree and show a readable card with a dead button (which reads
 * as broken) or a redacted card with a live one (which reads as a way in). Both
 * are asserted below in the same render, so they cannot drift apart silently.
 *
 * `renderToStaticMarkup` only — no jsdom, no effects. The reveal flag is
 * module-level and outlives the case that sets it, hence the unconditional
 * reset.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, it, expect } from "vitest";

import "../../../i18n";
import AlbescentSelectCard from "../AlbescentSelectCard";
import { REDACTED, setAlbescentRevealed } from "../../../utils/factions";

/** Every authored slot on the tile, in the catalogue's own words. */
const REAL_COPY = [
  "World Zero",
  "Albescent",
  "Some work leaves no record",
  "Request an audience",
];

const card = (): string =>
  renderToStaticMarkup(<AlbescentSelectCard state="locked" members={3} />);

afterEach(() => setAlbescentRevealed(false));

describe("the Albescent tile redacts and locks on one answer (#2409)", () => {
  it("prints [REDACTED] and NOT the real copy to an unrevealed viewer", () => {
    setAlbescentRevealed(false);
    const html = card();
    // The mark is in the DOM; the words are not. Painting the real strings
    // invisible would leave them in the markup, in the accessibility tree and
    // in a selection — a redaction that redacts nothing.
    expect(html).toContain(REDACTED);
    for (const copy of REAL_COPY) {
      expect(html, `leaked: ${copy}`).not.toContain(copy);
    }
  });

  it("wears the society's own face while unreadable (#1891 ruling 1)", () => {
    setAlbescentRevealed(false);
    const html = card();
    // Ruling 1 is untouched by #2409: the look stays, only the word goes. If
    // the redaction ever starts hiding the surface rather than the strings,
    // this is what says so.
    expect(html).toContain("--albescent-reveal-surface");
    expect(html).toContain("--albescent-reveal-border");
    expect(html).toContain("labyrinth");
  });

  it("marks the tile so the redaction paints and the sweep skips it", () => {
    setAlbescentRevealed(false);
    const html = card();
    // Two halves of one exemption: the class paints the mark in the sheet's own
    // colour, the attribute is what `src/utils/contrastScan.ts` skips on. Split them
    // and either the mark becomes legible or the nightly sweep goes red on a
    // 1.00:1 pairing that is never going to be fixed.
    expect(html).toContain('class="redacted"');
    expect(html).toContain('data-redacted="true"');
  });

  it("renders the control and disables it, rather than dropping it", () => {
    setAlbescentRevealed(false);
    // The door is visible and shut. An absent button would be the old hiding
    // wearing a different shape.
    expect(card()).toContain("<button");
    expect(card()).toContain("disabled");
  });

  it("says the real words and lives the control in the same moment", () => {
    setAlbescentRevealed(true);
    const html = card();
    for (const copy of REAL_COPY) {
      expect(html, `missing: ${copy}`).toContain(copy);
    }
    expect(html).not.toContain(REDACTED);
    // The pairing, stated as one assertion: no redaction marks anywhere, and
    // nothing disabled. There is no third state between these two cases.
    expect(html).not.toContain("data-redacted");
    expect(html).not.toContain("disabled");
  });
});

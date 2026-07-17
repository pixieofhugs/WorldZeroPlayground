/**
 * FactionSigil dispatcher (#659, ADR-0040). Confirms the map resolves the
 * bespoke sigil per faction slug and falls back to the unaffiliated
 * seven-segment `DefaultSigil` ring for an unknown/null slug — the same
 * fallback contract as `FactionAvatar` (see factionAvatar.test.tsx).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../../i18n";
import FactionSigil from "../FactionSigil";

describe("FactionSigil dispatcher (#659)", () => {
  it("renders the UA heraldic shield for the ua slug", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="ua" />);
    // UaSigil's shield markup marker — a viewBox unique to that sigil.
    expect(html).toContain('viewBox="0 0 100 120"');
    expect(html).toContain("var(--ua-gold)");
  });

  it("renders the S.N.I.D.E. circled-A for the snide slug", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="snide" />);
    expect(html).toContain('viewBox="0 0 48 48"');
    expect(html).toContain("var(--faction-snide-acid)");
  });

  it("renders the Everymen union cog for the everymen slug", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="everymen" />);
    expect(html).toContain("var(--everymen-red)");
    expect(html).toContain("var(--everymen-cream)");
  });

  it("falls back to the unaffiliated ring for an unknown slug", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="totally-unknown" />);
    expect(html).toContain("var(--faction-default-ring)");
    expect(html).not.toContain("var(--faction-snide-acid)");
    expect(html).not.toContain("var(--ua-gold)");
    expect(html).not.toContain("var(--everymen-red)");
  });

  it("falls back to the unaffiliated ring for a null slug", () => {
    const html = renderToStaticMarkup(<FactionSigil slug={null} />);
    expect(html).toContain("var(--faction-default-ring)");
  });
});

/**
 * The ephemeris grid token (#1635). The hero is its live consumer; the
 * `.eph-grid-ground` contract (inert, behind, sized to the box) is invisible
 * to markup, so it is asserted against the stylesheet.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../../i18n";
import EphemeristsFactionHero from "../../factionHero/EphemeristsFactionHero";
import { readIndexCss } from "../../../test/indexCss";

const CSS = readIndexCss();

/** The declaration body of one rule, by selector. */
function ruleFor(selector: string): string {
  const match = CSS.match(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`no rule for ${selector} in index.css`);
  return match[1];
}

describe("the ephemeris grid token", () => {
  it("is declared once, from the plate's own brass rather than a raw hue", () => {
    const declaration = CSS.match(/--faction-ephemerists-grid:([^;]*);/g) ?? [];
    expect(declaration).toHaveLength(1);
    expect(declaration[0]).toContain("var(--faction-ephemerists-plate-brass-light)");
    expect(declaration[0]).not.toContain("opacity");
  });

  it("carries no opacity and no colour of its own, so it costs the critical path nothing", () => {
    // index.css is on every page (`docs/agents/load-time.md`).
    expect(CSS.match(/--faction-ephemerists-grid:[\s\S]*?;/)?.[0].length).toBeLessThan(400);
  });
});

describe("the hero borrows the token back", () => {
  const html = renderToStaticMarkup(
    <EphemeristsFactionHero slug="ephemerists" name="The Ephemerists" members={4} tasks={9} praxes={2} />,
  );

  it("draws its ruled ground from the token, not a hand-typed gradient pair", () => {
    expect(html).toContain("var(--faction-ephemerists-grid)");
    expect(html).not.toContain("repeating-linear-gradient(0deg");
  });
});

describe(".eph-grid-ground — the card contract", () => {
  const ground = ruleFor(".eph-grid-ground::before");

  it("is a ground, not a veil: inert, full-bleed, and behind the card's content", () => {
    expect(ground).toContain("inset: 0");
    expect(ground).toContain("pointer-events: none");
    expect(ground).toContain("opacity: 0.17");
    // The host isolates so the layer can't escape below the card fill.
    expect(ground).toContain("z-index: -1");
    expect(ruleFor(".eph-grid-ground")).toContain("isolation: isolate");
  });

  it("stretches to the box rather than tiling, which is what a warped SVG will need", () => {
    expect(ground).toContain("background-size: 100% 100%");
    expect(ground).toContain("background-repeat: no-repeat");
    expect(ground).toContain("background-image: var(--faction-ephemerists-grid)");
  });
});

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
import UaMandala from "../../factionMarks/UaMandala";

describe("FactionSigil dispatcher (#659)", () => {
  it("renders the UA ensō for the ua slug", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="ua" />);
    // One ensō (#908): the vendored brush drawing, painted through a CSS mask.
    // The two-arc approximation on a 200x200 viewBox is gone, and so is the
    // 100x120 gilt shield it replaced.
    expect(html).toContain("/factionMarks/enso.webp");
    expect(html).not.toContain('viewBox="0 0 200 200"');
  });

  it("delivers the mark as a mask, so the asset stays out of the JS bundle", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="ua" />);
    // The file supplies the ALPHA only; nothing is inlined and no <path> for
    // the mark reaches the markup.
    expect(html).toMatch(/mask-image:url\(\/factionMarks\/enso\.webp\)/);
    // Letterboxed and centred, so non-square callers do not stretch the circle.
    expect(html).toContain("mask-size:contain");
    expect(html).toContain("mask-position:center");
  });

  it("draws the ensō in the ornament token so it follows the dark cascade", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="ua" />);
    // The mask takes its ink from background-color — i.e. from a token.
    expect(html).toContain("background-color:var(--faction-ua-glow)");
    // The salon is dead: no gilt shield, no legacy gold, no raw hex.
    expect(html).not.toMatch(/var\(--ua-[a-z]/); // the whole legacy family, deleted in #853
    expect(html).not.toContain("#");
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

  // #1626. `factions/albescent.ts` registers no `sigil` row — and must not,
  // since its manifest takes only Default-plus-a-flourish surfaces (#783) — so
  // the dispatcher used to hand albescent the unaffiliated ring while its own
  // cross-hair sat one directory over. Resolved HERE, once, rather than by a
  // slug branch in each of the four callers.
  it("renders the surveyor's cross-hair for the albescent slug", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="albescent" />);
    // The four cardinal ticks — the cross-hair's own geometry, and what tells
    // it apart from any ring. Its INK is #1658's business, asserted below.
    expect(html.match(/<line /g), "four cardinal ticks").toHaveLength(4);
    expect(html, "not the unaffiliated ring").not.toContain("var(--faction-default-rainbow-conic)");
  });

  it("falls back to the unaffiliated ring for an unknown slug", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="totally-unknown" />);
    expect(html).toContain("var(--faction-default-rainbow-conic)");
    expect(html).not.toContain("var(--faction-snide-acid)");
    expect(html).not.toMatch(/var\(--ua-[a-z]/); // the whole legacy family, deleted in #853
    expect(html).not.toContain("var(--everymen-red)");
  });

  it("falls back to the unaffiliated ring for a null slug", () => {
    const html = renderToStaticMarkup(<FactionSigil slug={null} />);
    expect(html).toContain("var(--faction-default-rainbow-conic)");
  });
});

/**
 * Albescent has no mark of its own (#1891 ruling 6).
 *
 * This block used to assert the spectrum-stroked cross-hair (#1658, #1630). The
 * mark is deleted, not restyled: an emblem nobody else wears is a tell, and it
 * rendered on surfaces an unrevealed player reads — the filter facet, the
 * players chip row, the requests tray, the credential footer.
 *
 * The seam is still the DISPATCHER's markup, because that is where the decision
 * lives. What it must now produce for `albescent` is exactly what it produces
 * for a slug it has never heard of.
 */
describe("Albescent resolves to the unaffiliated ring (#1891)", () => {
  it("draws the same mark as an unknown slug", () => {
    const albescent = renderToStaticMarkup(<FactionSigil slug="albescent" size={40} />);
    const unknown = renderToStaticMarkup(<FactionSigil slug="not_a_faction" size={40} />);
    expect(albescent).toBe(unknown);
  });

  it("draws the DefaultSigil ring, conic and all", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="albescent" />);
    expect(html).toContain("var(--faction-default-rainbow-conic)");
  });

  it("keeps no trace of the cross-hair or the reveal register", () => {
    // The old mark was seven parts stroked from a `<linearGradient>` built out
    // of the `--faction-default-stop-*` tokens, on `--albescent-reveal-text`.
    // None of that may survive at any mount, coloured or not.
    for (const html of [
      renderToStaticMarkup(<FactionSigil slug="albescent" />),
      renderToStaticMarkup(<FactionSigil slug="albescent" color="var(--albescent-reveal-ink)" />),
    ]) {
      expect(html).not.toContain("<linearGradient");
      expect(html).not.toContain("var(--albescent-reveal-text)");
    }
  });

  it("never puts the word in the markup", () => {
    // A slug-derived id or class would print the society's name into the DOM of
    // every page the mark appears on — the leak #783 closed, restated for the
    // fallback (#1891).
    const html = renderToStaticMarkup(<FactionSigil slug="albescent" />);
    expect(html.toLowerCase()).not.toContain("albescent");
  });
});

/** Count petal paths — every band draws its petals as <path> elements. */
function petalCount(html: string): number {
  return (html.match(/<path/g) ?? []).length;
}

describe("UaMandala primitive (#849)", () => {
  it("renders nothing at all for the absent strength", () => {
    // Dense/text-heavy surfaces ask for `absent` and must get no figure —
    // not a transparent one still costing a hundred paths.
    expect(renderToStaticMarkup(<UaMandala strength="absent" />)).toBe("");
  });

  it("is faint texture at 6-22% by default and solid at full strength", () => {
    const texture = renderToStaticMarkup(<UaMandala />);
    const opacity = Number(texture.match(/opacity:([\d.]+)/)?.[1]);
    expect(opacity).toBeGreaterThanOrEqual(0.06);
    expect(opacity).toBeLessThanOrEqual(0.22);
    expect(renderToStaticMarkup(<UaMandala strength="full" />)).toContain("opacity:1");
  });

  it("draws rings x petals-per-ring petals, both parameterized", () => {
    expect(petalCount(renderToStaticMarkup(<UaMandala rings={3} petalsPerRing={12} />))).toBe(36);
    expect(petalCount(renderToStaticMarkup(<UaMandala rings={5} petalsPerRing={8} />))).toBe(40);
  });

  it("applies rotation to the figure", () => {
    expect(renderToStaticMarkup(<UaMandala rotation={18} />)).toContain("rotate(18 50 50)");
  });

  it("takes its colour from a token, never a hex", () => {
    const html = renderToStaticMarkup(<UaMandala strength="full" />);
    expect(html).toContain("var(--faction-ua-glow)");
    expect(html).not.toContain("#");
  });

  it("keeps motion in the shared reduced-motion-gated class, never inline", () => {
    const still = renderToStaticMarkup(<UaMandala strength="full" />);
    expect(still).not.toContain("ua-mandala-ring");
    const spinning = renderToStaticMarkup(<UaMandala strength="full" spin />);
    expect(spinning).toContain('class="ua-mandala-ring"');
    // The keyframes live in index.css; the component only hands over tempo.
    expect(spinning).not.toContain("animation:");
    expect(spinning).toContain("--ua-spin-dur");
  });
});

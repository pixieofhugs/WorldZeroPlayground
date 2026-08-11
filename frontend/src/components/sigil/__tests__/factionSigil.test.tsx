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
import AlbescentSigil from "../AlbescentSigil";
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
 * Albescent's spectrum-stroked cross-hair (#1658, the last half of #1630).
 *
 * The seam is the markup the DISPATCHER produces, because that is where the
 * decision lives: `AlbescentSigil` still draws whatever ink it is handed, and
 * `CredentialCard` still knows nothing about slugs. The rule the adapter
 * encodes is "a caller with no ink of its own gets the spectrum", so both
 * halves are asserted here — the spectrum when nothing is passed, the caller's
 * colour when something is.
 *
 * `stroke` cannot take a CSS gradient, so the ramp is an in-document
 * `<linearGradient>` rebuilt from the same seven `--faction-default-stop-*`
 * tokens `--faction-default-rainbow` composes from. That is the bridge, and it
 * is what keeps the mark on the dark cascade: the stops flip, the SVG does not
 * have to know.
 */
const STOP_TOKENS = [1, 2, 3, 4, 5, 6, 7].map(
  (index) => `var(--faction-default-stop-${index})`,
);

/** Every gradient id declared in a render, in document order. */
const gradientIds = (html: string) =>
  [...html.matchAll(/<linearGradient[^>]*\bid="([^"]+)"/g)].map((match) => match[1]);

describe("AlbescentSigil spectrum strokes (#1658)", () => {
  it("strokes the dispatched mark in the spectrum, not a flat ink", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="albescent" />);
    for (const token of STOP_TOKENS) {
      expect(html, `${token} stop`).toContain(`stop-color="${token}"`);
    }
    const [id] = gradientIds(html);
    expect(id, "one gradient declared").toBeTruthy();
    // Every stroke AND the centre dot read the ramp — a single flat ink left
    // anywhere is the half-done version of this change.
    // Two rings, four ticks and the centre dot — a single flat ink left
    // anywhere is the half-done version of this change.
    expect(html.match(new RegExp(`url\\(#${id}\\)`, "g")), "seven painted parts").toHaveLength(7);
    expect(html, "the flat reveal ink").not.toContain("var(--albescent-reveal-text)");
    // Not an eighth rainbow, and not the conic either: the conic is the
    // unaffiliated RING's ramp and counting it is how CredentialCard tells the
    // two marks apart.
    expect(html, "the na ring's conic").not.toContain("var(--faction-default-rainbow-conic)");
  });

  it("leaves a direct mount on the reveal register", () => {
    // The invitation letter passes no colour and must NOT go spectrum: the
    // decision is the dispatcher's, so the primitive's own default is untouched.
    const html = renderToStaticMarkup(<AlbescentSigil size={44} />);
    expect(html).toContain("var(--albescent-reveal-text)");
    expect(html).not.toContain("<linearGradient");
  });

  it("spans the ramp across the whole mark, not per stroke", () => {
    // objectBoundingBox is the default and it is a trap here: the horizontal
    // ticks have a zero-height box, and SVG does not render an element whose
    // gradient box is degenerate. userSpaceOnUse also gets what the design
    // draws — one sweep over the mark rather than seven private ones.
    const html = renderToStaticMarkup(<FactionSigil slug="albescent" size={40} />);
    expect(html).toContain('gradientUnits="userSpaceOnUse"');
    expect(html).toContain('x2="40"');
  });

  it("still honours an explicit colour at every other mount", () => {
    // The faction filter facet passes `factionCssVar(slug)`; the invitation and
    // the faction-select tile mount the sigil directly on the reveal register.
    const html = renderToStaticMarkup(
      <FactionSigil slug="albescent" color="var(--albescent-reveal-ink)" />,
    );
    expect(html).toContain("var(--albescent-reveal-ink)");
    expect(html, "no gradient where a colour was given").not.toContain("<linearGradient");
  });

  it("gives every sigil on a page its own gradient id", () => {
    // The mobile players chip row and the FieldDesk roster both draw the mark
    // many times over; duplicate ids would make every later sigil read the
    // first one's ramp.
    const html = renderToStaticMarkup(
      <>
        <FactionSigil slug="albescent" />
        <FactionSigil slug="albescent" />
        <FactionSigil slug="albescent" />
      </>,
    );
    const ids = gradientIds(html);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size, "collided ids").toBe(3);
    // And no id names the society: an `id="…albescent…"` would put the word in
    // the markup of every page the mark appears on (#783).
    for (const id of ids) expect(id).not.toContain("albescent");
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

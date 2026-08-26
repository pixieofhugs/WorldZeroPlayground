/**
 * THE SEAM: the WOW banner's scatter is DRAWN FROM A SEED, not from the page
 * (#2727).
 *
 * The defect was a moire. Four surfaces paint the same 135° gilt hatch and the
 * hero was the only one at a different pitch — `20px 22px` under the page
 * backdrop's `22px 24px` — so the banner shimmered against the wallpaper behind
 * it. The ruling deletes the hero's hatch layer outright: a repeating grid over
 * a repeating grid cannot be repaired by choosing a third pitch, so nothing that
 * repeats on a grid replaces it.
 *
 * What replaces it is a seeded confetti scatter and the Court's own balloons,
 * and the seed is the whole testable claim. Same seed in, same geometry out:
 * a scatter redrawn at render would twitch whenever anything unrelated moved on
 * the page and no screenshot of it would ever reproduce, which makes a visual
 * regression on this banner unassertable. `Math.random()` is therefore banned
 * from both modules and the ban is checked here, at the source, because a
 * generator that is random only sometimes still looks perfectly plausible.
 *
 * The harness is `renderToStaticMarkup` — no DOM, no layout, no effects — which
 * is exactly right for a device that must be decided before paint. The one
 * thing it cannot see is a stylesheet, so the "nothing animates" clause is
 * checked against the sheets as text: `BalloonBunch`'s bob is opted out at the
 * mount, but the googly pupils inside it ride `.wow-balloon-eye`, which no prop
 * reaches.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";

// Initialize the catalog so copy keys resolve to English text.
import "../../../i18n";
import WowFactionHero from "../WowFactionHero";
import { drawWowConfetti, WOW_CONFETTI_SEED } from "../../factionMarks/wowOrnament";

const source = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const render = () =>
  renderToStaticMarkup(
    <WowFactionHero slug="wow" name="Warriors of Whimsy" members={7} tasks={12} praxes={3} />,
  );

const html = render();

describe("the hero plate no longer hatches (#2727)", () => {
  it("draws no repeating gradient at all", () => {
    // The moire, at its root: not "a different pitch", NONE. Whichever pitch the
    // page backdrop settles on, this plate can no longer beat against it.
    expect(html).not.toContain("repeating-linear-gradient");
  });

  it("keeps the plum court-glow, which never repeated", () => {
    expect(html).toContain("radial-gradient");
    expect(html).toContain("--faction-wow-court-glow");
  });
});

describe("the scatter is seeded, and the seed is the faction (#2727)", () => {
  it("draws the same geometry from the same seed, every time", () => {
    expect(drawWowConfetti(WOW_CONFETTI_SEED)).toEqual(drawWowConfetti(WOW_CONFETTI_SEED));
  });

  it("is a draw and not a stride — a different seed is a different scatter", () => {
    expect(drawWowConfetti("ephemerists")).not.toEqual(drawWowConfetti(WOW_CONFETTI_SEED));
  });

  it("renders byte-identically across renders", () => {
    // The acceptance criterion, at the mount: two independent renders of the
    // banner are the same bytes, so a screenshot of it reproduces.
    expect(render()).toBe(html);
  });

  it("carries no render-time randomness in either module", () => {
    expect(source("../WowFactionHero.tsx")).not.toContain("Math.random");
    expect(source("../../factionMarks/wowOrnament.tsx")).not.toContain("Math.random");
  });

  it("is not a lattice", () => {
    // What was wrong with the hatch was that it repeated. A scatter whose marks
    // sat at an even pitch would be the same defect wearing rounded corners, so
    // the gaps between neighbours must differ.
    const lefts = drawWowConfetti(WOW_CONFETTI_SEED)
      .map((flake) => flake.left)
      .sort((a, b) => a - b);
    const gaps = lefts.slice(1).map((left, index) => Number((left - lefts[index]).toFixed(2)));
    expect(new Set(gaps).size, "evenly spaced marks are a lattice").toBeGreaterThan(
      gaps.length / 2,
    );
  });

  it("inks every flake with a token, in both themes", () => {
    // §3: colour values live in index.css, and the two flake inks alias the
    // washes this plate already wore — so the dark half arrives through the
    // cascade rather than through a `dark ? a : b` here.
    for (const flake of drawWowConfetti(WOW_CONFETTI_SEED)) {
      expect(flake.ink).toMatch(/^var\(--faction-wow-banner-flake-(gold|plum)\)$/);
    }
    const inks = new Set(drawWowConfetti(WOW_CONFETTI_SEED).map((flake) => flake.ink));
    expect(inks.size, "gold and plum both appear").toBe(2);
  });
});

describe("the Court's balloons hang still on the banner (#2727)", () => {
  it("mounts the shared bunch rather than a second drawing of it", () => {
    // `--faction-wow-balloon-string` is drawn by nothing else, so counting it
    // counts bunches — and that it is present at all is the "no new vocabulary"
    // clause: this is `BalloonBunch`, not a hand-rolled balloon.
    expect(html.match(/--faction-wow-balloon-string/g)).toHaveLength(3);
  });

  it("does not bob", () => {
    // A slowly moving background behind a wordmark reads as a rendering fault.
    expect(html).not.toContain("wow-balloon-bunch");
  });

  it("stills the googly pupils, which no prop reaches", () => {
    // `bob={false}` turns off the bunch's own animation and nothing else. The
    // pupils ride `.wow-balloon-eye` from `motion.ornament.css`, so the layer
    // opts out where that rule lives — same sheet, higher specificity, and it
    // arrives with the animation it cancels rather than a frame later.
    expect(html).toContain("wow-banner-scatter");
    const motion = source("../../../motion.ornament.css");
    expect(motion).toMatch(/\.wow-banner-scatter \.wow-balloon-eye\s*\{[^}]*animation:\s*none/);
  });

  it("writes no inline animation on the plate", () => {
    expect(html).not.toContain("animation:");
  });
});

/**
 * The WOW banner's scatter is seeded (#2727). The hero's hatch beat (moiré)
 * against the wallpaper's, so nothing repeating replaces it. Same seed, same
 * geometry, so screenshots reproduce; `Math.random` is banned at the source.
 * "Nothing animates" is checked against the stylesheets as text.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";

import "../../../i18n";
import WowFactionHero from "../WowFactionHero";
import { drawWowConfetti, WOW_CONFETTI_SEED } from "../../factionMarks/wowOrnament";

const source = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

/** Comments stripped: the ban is on code, not prose naming it. */
const code = (relative: string) =>
  source(relative).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const render = () =>
  renderToStaticMarkup(
    <WowFactionHero slug="wow" name="Warriors of Whimsy" members={7} tasks={12} praxes={3} />,
  );

const html = render();

describe("the hero plate no longer hatches (#2727)", () => {
  it("draws no repeating gradient at all", () => {
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
    expect(render()).toBe(html);
  });

  it("carries no render-time randomness in either module", () => {
    expect(code("../WowFactionHero.tsx")).not.toContain("Math.random");
    expect(code("../../factionMarks/wowOrnament.tsx")).not.toContain("Math.random");
    // Proves the strip leaves code behind.
    expect(code("../../factionMarks/wowOrnament.tsx")).toContain("seededRandom");
  });

  it("is not a lattice", () => {
    // An even pitch would be the same moiré defect.
    const lefts = drawWowConfetti(WOW_CONFETTI_SEED)
      .map((flake) => flake.left)
      .sort((a, b) => a - b);
    const gaps = lefts.slice(1).map((left, index) => Number((left - lefts[index]).toFixed(2)));
    expect(new Set(gaps).size, "evenly spaced marks are a lattice").toBeGreaterThan(
      gaps.length / 2,
    );
  });

  it("inks every flake with a token, in both themes", () => {
    // Existing tokens only (§3, #1609), so both themes come via the cascade.
    for (const flake of drawWowConfetti(WOW_CONFETTI_SEED)) {
      expect(flake.ink).toMatch(/^var\(--faction-wow-(hatch|court-glow)\)$/);
    }
    const inks = new Set(drawWowConfetti(WOW_CONFETTI_SEED).map((flake) => flake.ink));
    expect(inks.size, "gold and plum both appear").toBe(2);
  });
});

describe("the Court's balloons hang still on the banner (#2727)", () => {
  it("mounts the shared bunch rather than a second drawing of it", () => {
    // Only `BalloonBunch` draws `--faction-wow-balloon-string`.
    expect(html.match(/--faction-wow-balloon-string/g)).toHaveLength(3);
  });

  it("does not bob", () => {
    expect(html).not.toContain("wow-balloon-bunch");
  });

  it("stills the googly pupils, which no prop reaches", () => {
    // `bob={false}` misses `.wow-balloon-eye`; the opt-out lives in its sheet.
    expect(html).toContain("wow-banner-scatter");
    const motion = source("../../../motion.ornament.css");
    expect(motion).toMatch(/\.wow-banner-scatter \.wow-balloon-eye\s*\{[^}]*animation:\s*none/);
  });

  it("writes no inline animation on the plate", () => {
    expect(html).not.toContain("animation:");
  });
});

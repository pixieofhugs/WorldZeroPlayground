/**
 * #1215 — the favicon's hand-copied palette must equal the tokens it copies.
 * `public/favicon.svg` sits outside the cascade, so its colours are literals.
 * Not policed: gradient direction and geometry. Light theme throughout — the
 * browser gives no site-theme signal and the asset brings its own ground.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { readThemes, resolveVar } from "../utils/__tests__/cssVars";
import { readIndexCss } from "../test/indexCss";

const FAVICON = readFileSync(fileURLToPath(new URL("../../public/favicon.svg", import.meta.url)), "utf8");
const THEMES = readThemes(readIndexCss());

/** Light-theme value; fails loudly if undeclared. */
function lightValue(token: string): string {
  const value = resolveVar(token, "light", THEMES);
  expect(value, `${token} is not declared in the :root block of index.css`).not.toBeNull();
  return (value as string).trim().toLowerCase();
}

/** The `<stop>` elements of `#wzRainbow`, in document order. */
function faviconStops(): { offset: string; color: string }[] {
  const gradient = /<linearGradient id="wzRainbow"[^>]*>([\s\S]*?)<\/linearGradient>/.exec(FAVICON);
  expect(gradient, "favicon.svg no longer declares a #wzRainbow linearGradient").not.toBeNull();
  return [...(gradient as RegExpExecArray)[1].matchAll(/<stop\s+offset="([^"]+)"\s+stop-color="([^"]+)"/g)].map(
    (match) => ({ offset: match[1], color: match[2].trim().toLowerCase() }),
  );
}

/** The `(colour, position)` pairs of a `linear-gradient(...)` token. */
function rampStops(token: string): { percent: number; color: string }[] {
  const value = lightValue(token);
  return [...value.matchAll(/(#[0-9a-f]{6})\s+([\d.]+)%/g)].map((match) => ({
    color: match[1],
    percent: Number(match[2]),
  }));
}


const asPercent = (offset: string) => Number(offset) * 100;

describe("favicon.svg hand-copies the na spectrum exactly (#1215)", () => {
  it("paints the seven --faction-default-stop-N hues, in spectrum order", () => {
    const expected = [1, 2, 3, 4, 5, 6, 7].map((index) => lightValue(`--faction-default-stop-${index}`));
    expect(faviconStops().map((stop) => stop.color)).toEqual(expected);
  });

  it("places them at the offsets --faction-default-rainbow uses", () => {
    const ramp = rampStops("--faction-default-rainbow");
    expect(ramp, "--faction-default-rainbow no longer parses as a 7-stop percentage ramp").toHaveLength(7);
    expect(faviconStops().map((stop) => asPercent(stop.offset))).toEqual(ramp.map((stop) => stop.percent));
  });

  it("has no stop that is absent from the spectrum, so a hue cannot be added quietly", () => {
    const spectrum = [1, 2, 3, 4, 5, 6, 7].map((index) => lightValue(`--faction-default-stop-${index}`));
    const strangers = faviconStops()
      .map((stop) => stop.color)
      .filter((color) => !spectrum.includes(color));
    expect(strangers).toEqual([]);
  });

  it("draws both tiles from the light theme's ink and paper", () => {
    // Default tile = ink, OS-dark alternate = paper: inverted so it contrasts the tab bar.
    const fills = [...FAVICON.matchAll(/\.tile\s*\{\s*fill:\s*(#[0-9a-fA-F]{6});/g)].map((match) =>
      match[1].toLowerCase(),
    );
    expect(fills, "favicon.svg no longer declares exactly two .tile fills").toHaveLength(2);
    expect(fills).toEqual([lightValue("--color-text-primary"), lightValue("--color-bg-page")]);
  });

  it("reads a non-empty gradient, so the guard cannot pass by finding nothing", () => {
    expect(faviconStops()).toHaveLength(7);
  });
});

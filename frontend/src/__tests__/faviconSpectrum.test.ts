/**
 * #1215 — the favicon's hand-copied palette must equal the tokens it copies.
 *
 * WHY THIS EXISTS. `public/favicon.svg` is the one rainbow in the repo that
 * can never read a custom property: it is a standalone document fetched by
 * browser chrome, served from `public/`, outside the bundle and outside the
 * cascade. So its colours are literals, and literals drift. Three of its seven
 * stops were off the na spectrum — an orange found nowhere else in the repo, a
 * violet the palette does not contain, a purple endpoint where the spectrum
 * ends magenta, and no teal at all — for as long as anyone can remember,
 * because the only thing asserting they were the spectrum was a comment
 * *saying* they were the spectrum. A claim is not a check. This is the check.
 *
 * WHAT IT CATCHES. Repointing `--faction-default-stop-N`, resequencing the
 * spectrum, or editing a stop in the SVG by hand. Any of those turns this red
 * with the token name and both values, which is the signal the comment cannot
 * give: come back to the asset, the palette moved without you.
 *
 * WHAT IT DELIBERATELY DOES NOT POLICE. The gradient's `x1/y1 -> x2/y2`
 * diagonal — direction is a design decision about the glyph, not a palette
 * question (#1215 says so explicitly) — and the geometry of the mark.
 *
 * WHY THE LIGHT THEME. Browser chrome hands us no site-theme signal; the SVG's
 * own `prefers-color-scheme` query reads the OS scheme, and its flip runs
 * *opposite* to the site's (an OS dark scheme swaps in the pale tile). So the
 * asset copies one theme on both tiles, and the canonical one is `:root`; the
 * `[data-theme="dark"]` block is a brightening for dark page grounds, and this
 * asset brings its own ground. Both tile fills come from the light theme too,
 * so the whole file follows a single rule this test can state.
 *
 * NOTE ON LEGIBILITY. Whether seven true stops read at 16px is an eyeball
 * question no node test can answer (#1219: "each one owes a human eyeball").
 * This test proves the values are right, not that the mark is clear.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { readThemes, resolveVar } from "../utils/__tests__/cssVars";
import { readIndexCss } from "../test/indexCss";

const FAVICON = readFileSync(fileURLToPath(new URL("../../public/favicon.svg", import.meta.url)), "utf8");
const THEMES = readThemes(readIndexCss());

/** Resolve a light-theme token, failing loudly rather than comparing against null. */
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

/**
 * The `(colour, position)` pairs of a `linear-gradient(...)` token, so the
 * favicon's offsets are measured against the ramp rather than a copied number.
 */
function rampStops(token: string): { percent: number; color: string }[] {
  const value = lightValue(token);
  return [...value.matchAll(/(#[0-9a-f]{6})\s+([\d.]+)%/g)].map((match) => ({
    color: match[1],
    percent: Number(match[2]),
  }));
}

/** A fractional SVG offset as the percentage the CSS ramp states it in. */
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
    // Default tile = the site's ink; the `prefers-color-scheme: dark` alternate
    // = the site's paper. Inverted against the site on purpose, so the mark
    // always contrasts the tab bar rather than matching it.
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

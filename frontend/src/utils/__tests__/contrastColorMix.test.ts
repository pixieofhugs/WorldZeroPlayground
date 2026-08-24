/**
 * `parseColor` and the one `color-mix()` shape it models (#2301).
 *
 * CSS gives a custom property exactly one way to say "that token, at an alpha"
 * — `color-mix(in srgb, var(--x) N%, transparent)` — and the Albescent letter's
 * night ink and hairlines are written that way so nothing freezes a copy of the
 * na card's text colour. The VALUE-level contrast sweep reads `index.css` in
 * node with no browser to resolve anything, so before this it saw those tokens
 * as unparseable and failed the row it could not measure.
 *
 * Both halves matter and the second is the load-bearing one: `null` is a
 * FAILURE to every caller, never a skip, so widening the parser can only add
 * measurements — but only as long as it stays narrow enough that a shape it
 * does NOT model keeps returning null rather than a plausible wrong answer.
 */
import { describe, expect, it } from "vitest";

import { contrastRatio, parseColor } from "../contrast";

describe("parseColor: color-mix fade to transparent", () => {
  it("reads a fade as the base colour carrying that percentage as alpha", () => {
    // Premultiplied sRGB mixing with `transparent` leaves the channels alone,
    // so this is exactly rgba(240, 230, 208, 0.74) — the letter's night ink.
    expect(parseColor("color-mix(in srgb, #f0e6d0 74%, transparent)")).toEqual({
      r: 240,
      g: 230,
      b: 208,
      a: 0.74,
    });
  });

  it("agrees with the rgba() spelling of the same colour, to the ratio", () => {
    const sheet = parseColor("#1c1b24")!;
    const mixed = parseColor("color-mix(in srgb, #f0e6d0 74%, transparent)")!;
    const rgba = parseColor("rgba(240, 230, 208, 0.74)")!;
    expect(contrastRatio(mixed, sheet)).toBeCloseTo(contrastRatio(rgba, sheet), 10);
  });

  it("resolves a nested spelling of the base colour", () => {
    expect(parseColor("color-mix(in srgb, rgb(255 255 255) 30%, transparent)")).toEqual({
      r: 255,
      g: 255,
      b: 255,
      a: 0.3,
    });
  });

  it.each([
    // A mix of two REAL colours is not a fade — the channels move, and this
    // parser does no mixing math.
    "color-mix(in srgb, #f0e6d0 74%, #1c1b24)",
    // Another colour space does not interpolate the same way.
    "color-mix(in oklab, #f0e6d0 74%, transparent)",
    // A translucent base would need real premultiplied compositing.
    "color-mix(in srgb, rgba(240, 230, 208, 0.5) 74%, transparent)",
    // Not a colour at all.
    "color-mix(in srgb, var(--never-declared) 74%, transparent)",
  ])("returns null for %s rather than guessing", (value) => {
    expect(parseColor(value)).toBeNull();
  });
});

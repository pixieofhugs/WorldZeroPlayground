/**
 * THE GROUND S.N.I.D.E.'S NOTE ACTUALLY STANDS ON (#2450).
 *
 * WHY THIS FILE EXISTS. `factionContrast.test.ts` measures the flyposted wall
 * as FOUR FLAT READINGS — the two stops of the `-wall`/`-wall-deep` ramp and
 * the two corner washes — and deliberately does not model the raster or the
 * scanline, on the argument that a 2px stripe is a texture and not a surface.
 * That argument holds for the stripes and not for the stack: a glyph stands on
 * one pixel, and that pixel carries every layer that covers it. Measured flat,
 * `-note-muted` cleared AA. Measured on the pixel, it was 3.87:1, and that gap
 * was 36 of the nightly rendered sweep's 39 failures — one surface (the
 * S.N.I.D.E. tile on `/factions`, which every faction's route list visits),
 * counted nine times over two themes and two viewports.
 *
 * THE FACT THAT CLOSED IT, and the one three rounds of walking this family
 * missed: **the base of the composite is the wall ramp, not
 * `--faction-snide-note-paper`.** `WALL` is five layers and the bottom one is
 * `WALL_PLAIN`. Compositing the four washes onto `-note-paper` predicts
 * rgb(206,195,173); onto the ramp it predicts what the browser paints, to
 * fractions of a unit. `-note-paper` has had no consumer since #2065.
 *
 * THERE IS NO SINGLE GROUND. Two of the five layers are `repeating-linear-
 * gradient` stripes with duty cycles (grain 2-on/5-off, scan 1-on/3-off) and
 * two are positional radials, so the composite varies by pixel. What a contrast
 * gate wants is the WORST pixel, and worst runs in opposite directions per
 * cascade because the inks do: light inks are dark on a light ground, so worst
 * is the DARKEST composite; dark inks are light on a dark ground, so worst is
 * the LIGHTEST one — which is also why the scanline drops out of the dark model
 * (1-on/3-off leaves most pixels unhelped by it).
 *
 * WHAT THIS FILE IS NOT. It is not a second contrast manifest.
 * `factionContrast.test.ts` still owns the flat readings and every other
 * S.N.I.D.E. pairing; this owns one thing the flat readings cannot express, so
 * the next person does not have to rediscover the ramp underneath.
 *
 * ponytail: gates the three inks the NOTE prints on this ground. The composer's
 * tiers stand on the same composite and two of them miss there —
 * `-composer-faint` at 3.82:1 light / 3.94:1 dark, and `-composer-alarm` /
 * `--faction-snide-wall-alarm` at 4.15:1 light. Neither is on the swept routes
 * and walking them is a design call the 2026-08-27 ruling did not make; they are
 * reported on #2450 for a follow-up. Add their rows here when it lands.
 */

import { describe, expect, it } from "vitest";

import {
  AA_NORMAL,
  compositeOver,
  contrastRatio,
  formatRatio,
  parseColor,
  relativeLuminance,
  type Rgba,
} from "../contrast";
import { WALL, WALL_PLAIN } from "../../components/factionMarks/snideAtoms";
import { readThemes, resolveVar, type Theme } from "./cssVars";
import { readIndexCss } from "../../test/indexCss";

const THEMES = readThemes(readIndexCss());

/**
 * The worst pixel, per cascade: which ramp stop is under it and which of the
 * printed layers cover it, BOTTOM-TO-TOP (the order a painter applies them, ie.
 * the reverse of the order `WALL` lists them in).
 */
interface Stack {
  /** The ramp stop `WALL_PLAIN` supplies at that pixel. */
  base: string;
  layers: string[];
}

const WORST: Record<Theme, Stack> = {
  // Darkest: the ramp's deep stop, with all four printed layers over it.
  light: {
    base: "--faction-snide-wall-deep",
    layers: [
      "--faction-snide-note-wash-pink",
      "--faction-snide-note-wash-acid",
      "--faction-snide-note-scan",
      "--faction-snide-note-grain",
    ],
  },
  // Lightest: the ramp's top stop, the two washes and the (cream) grain — and
  // NO scanline, which is the only layer that darkens in this cascade and is
  // absent from three pixels in four.
  dark: {
    base: "--faction-snide-wall",
    layers: [
      "--faction-snide-note-wash-pink",
      "--faction-snide-note-wash-acid",
      "--faction-snide-note-grain",
    ],
  },
};

/** The three inks the clipping prints straight on that ground. */
const NOTE_INKS = [
  "--faction-snide-note-ink",
  "--faction-snide-note-muted",
  "--faction-snide-note-pink-ink",
] as const;

/** The four flat readings `factionContrast.test.ts` measures, for comparison. */
const FLAT: Stack[] = [
  { base: "--faction-snide-wall", layers: [] },
  { base: "--faction-snide-wall-deep", layers: [] },
  { base: "--faction-snide-wall", layers: ["--faction-snide-note-wash-acid"] },
  { base: "--faction-snide-wall-deep", layers: ["--faction-snide-note-wash-pink"] },
];

function color(name: string, theme: Theme): Rgba {
  const raw = resolveVar(name, theme, THEMES);
  expect(raw, `${name} (${theme}) is not declared`).not.toBeNull();
  const parsed = parseColor(raw!);
  expect(parsed, `${name} (${theme}) resolved to "${raw}" — not a solid color`).not.toBeNull();
  return parsed!;
}

function paint(stack: Stack, theme: Theme): Rgba {
  return stack.layers.reduce((ground, layer) => compositeOver(color(layer, theme), ground), color(stack.base, theme));
}

/** `rgb(r, g, b)` at the rounding a browser reports, so a failure reads like the runner's log. */
function show(ground: Rgba): string {
  return `rgb(${[ground.r, ground.g, ground.b].map((channel) => Math.round(channel)).join(", ")})`;
}

/** Split a `background` shorthand into its layers — commas inside `()` are not separators. */
function layersOf(background: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < background.length; index += 1) {
    const character = background[index];
    if (character === "(") depth += 1;
    else if (character === ")") depth -= 1;
    else if (character === "," && depth === 0) {
      parts.push(background.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(background.slice(start).trim());
  return parts;
}

describe("the S.N.I.D.E. wall's worst-case composite", () => {
  /**
   * THE ANCHOR. Every other assertion here trusts the model; this one proves it,
   * against numbers no one in this repo chose — the two grounds the nightly's
   * browser read off the element, quoted on #2450, with the alphas that shipped
   * before this fix. If a refactor breaks the model, this goes red with it.
   */
  it("reproduces the grounds the rendered sweep measured, from the alphas that shipped before #2450", () => {
    const composite = (base: string, layers: string[]) =>
      layers.reduce((ground, layer) => compositeOver(parseColor(layer)!, ground), parseColor(base)!);

    const light = composite("#e0ddd1", [
      "rgba(190, 24, 93, 0.1)",
      "rgba(111, 174, 0, 0.14)",
      "rgba(20, 17, 11, 0.05)",
      "rgba(20, 17, 11, 0.045)",
    ]);
    expect(show(light)).toBe("rgb(188, 181, 155)");
    expect(contrastRatio(parseColor("#545143")!, light)).toBeCloseTo(3.87, 1);
    expect(contrastRatio(parseColor("#9d174d")!, light)).toBeCloseTo(3.83, 1);

    const dark = composite("#0a0a0b", [
      "rgba(255, 45, 139, 0.14)",
      "rgba(182, 255, 46, 0.13)",
      "rgba(244, 241, 232, 0.05)",
    ]);
    expect(show(dark)).toBe("rgb(71, 56, 41)");
    expect(contrastRatio(parseColor("#ff69ac")!, dark)).toBeCloseTo(4.22, 1);
  });

  /**
   * The model above names layers; `snideAtoms` paints them. This is the seam
   * between the two, and it is where the model would rot silently — a sixth
   * layer, or a re-ordering, and every ratio below would measure a ground the
   * app stopped painting.
   */
  it("still describes the stack snideAtoms paints", () => {
    const painted = layersOf(WALL);
    expect(painted).toHaveLength(5);
    expect(painted[4], "the BASE of the stack is the ramp — that is the whole finding of #2450").toBe(WALL_PLAIN);
    // `WALL` lists top-to-bottom; the model lists bottom-to-top.
    expect(painted.slice(0, 4).map((layer) => /--faction-snide-note-[\w-]+/.exec(layer)?.[0])).toEqual(
      [...WORST.light.layers].reverse(),
    );
    expect(WALL_PLAIN).toContain(WORST.light.base);
    expect(WALL_PLAIN).toContain(WORST.dark.base);
  });

  it("is the DARKEST reading in light and the LIGHTEST in dark", () => {
    const flatLight = FLAT.map((stack) => relativeLuminance(paint(stack, "light")));
    expect(relativeLuminance(paint(WORST.light, "light"))).toBeLessThan(Math.min(...flatLight));

    const flatDark = FLAT.map((stack) => relativeLuminance(paint(stack, "dark")));
    expect(relativeLuminance(paint(WORST.dark, "dark"))).toBeGreaterThan(Math.max(...flatDark));
  });

  for (const theme of ["light", "dark"] as Theme[]) {
    describe(theme, () => {
      for (const ink of NOTE_INKS) {
        it(`${ink} clears AA on the composite`, () => {
          const ground = paint(WORST[theme], theme);
          const ratio = contrastRatio(color(ink, theme), ground);
          expect(
            ratio,
            `${ink} (${resolveVar(ink, theme, THEMES)}) on ${show(ground)} = ${formatRatio(ratio)}, needs ${AA_NORMAL}:1. ` +
              `Both the ink and the washes may move — see the ruling on #2450.`,
          ).toBeGreaterThanOrEqual(AA_NORMAL);
        });
      }
    });
  }
});

/**
 * The worst-pixel ground S.N.I.D.E.'s note stands on (#2450). A glyph stands on
 * one pixel carrying every layer of `WALL`, whose base is the wall ramp
 * (`WALL_PLAIN`), not `-note-paper`. Worst is the darkest composite in light and
 * the lightest in dark. `factionContrast.test.ts` keeps the flat readings.
 *
 * ponytail: gates only the note's three inks; `-composer-faint` and
 * `-composer-alarm` miss on this ground (reported on #2450). Add rows when ruled.
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

/** The worst pixel per cascade; layers BOTTOM-TO-TOP (reverse of `WALL`). */
interface Stack {
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
  // Lightest: no scanline (the only darkening layer, absent 3 pixels in 4).
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
  /** Anchors the model to the grounds the browser measured (quoted on #2450). */
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

  /** The seam between the model and what `snideAtoms` paints. */
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

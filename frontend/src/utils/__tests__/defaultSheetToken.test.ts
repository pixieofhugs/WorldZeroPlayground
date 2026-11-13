/**
 * The na SHEET token (#2497). Image, blend and clip are one layer list; CSS
 * CYCLES short lists, so their arity must match (silent at na's one layer, wrong
 * at Albescent's five, #2499). And na's sheet must stay a flat card-bg paint.
 */
import { describe, expect, it } from "vitest";
import { factionSheet, factionSpectrumSheet } from "../factions";
import { readThemes, resolveVar, type Theme } from "./cssVars";
import { readIndexCss } from "../../test/indexCss";

const CSS = readIndexCss();
const THEMES = readThemes(CSS);
const CASCADES: Theme[] = ["light", "dark"];

const SHEET = "--faction-default-card-sheet";
const BLEND = "--faction-default-card-sheet-blend";
const CLIP = "--faction-default-card-sheet-clip";

/** Split on TOP-LEVEL commas only (a naive split counts gradient args). */
function layers(value: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of value) {
    if (ch === "(") depth += 1;
    else if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim() !== "") out.push(current.trim());
  return out;
}

function resolved(name: string, theme: Theme): string {
  const value = resolveVar(name, theme, THEMES);
  expect(value, `${name} is undeclared in ${theme}`).not.toBeNull();
  return value as string;
}

describe("the sheet is a matched triple (#2497)", () => {
  for (const theme of CASCADES) {
    it(`${theme}: image, blend and clip declare the same number of layers`, () => {
      const count = layers(resolved(SHEET, theme)).length;
      expect(count, "the sheet declares no layers at all").toBeGreaterThan(0);
      expect(
        layers(resolved(BLEND, theme)).length,
        "blend would CYCLE across the sheet's layers rather than pad",
      ).toBe(count);
      expect(
        layers(resolved(CLIP, theme)).length,
        "clip would CYCLE across the sheet's layers rather than pad",
      ).toBe(count);
    });
  }
});

describe("na's sheet is today's paint, byte-identical by construction (#2497)", () => {
  for (const theme of CASCADES) {
    it(`${theme}: an opaque card-bg ramp that blends with nothing`, () => {
      const ground = resolved("--faction-default-card-bg", theme);
      expect(resolved(SHEET, theme).replace(/\s+/g, " ")).toBe(
        `linear-gradient(${ground}, ${ground})`,
      );
      expect(resolved(BLEND, theme)).toBe("normal");
      // Wash stops at padding box; `factionSheet` adds the colour's `border-box`.
      expect(resolved(CLIP, theme)).toBe("padding-box");
    });
  }
});

describe("factionSheet() is the only reader of the triple (#2497)", () => {
  it("na composes all four properties, colour clipped to the border box", () => {
    expect(factionSheet("na")).toEqual({
      backgroundColor: "var(--faction-default-card-bg)",
      backgroundImage: "var(--faction-default-card-sheet)",
      backgroundBlendMode: "var(--faction-default-card-sheet-blend)",
      // Trailing `border-box`: the dark card's translucent hairline shows it.
      backgroundClip: "var(--faction-default-card-sheet-clip), border-box",
    });
  });

  it("albescent resolves to the same family, so the two stay indistinguishable", () => {
    expect(factionSheet("albescent")).toEqual(factionSheet("na"));
    expect(factionSheet(null)).toEqual(factionSheet("na"));
  });

  it("appends the spectrum ramp to all THREE lists, never just the image", () => {
    // Image-only append would cycle the blend list on Albescent's dark prism (#2499).
    const ramped = factionSpectrumSheet();
    const flat = factionSheet();
    for (const [property, tail] of [
      ["backgroundImage", ", var(--faction-default-rainbow)"],
      ["backgroundBlendMode", ", normal"],
    ] as const) {
      expect(ramped[property], `${property} must gain exactly one layer`).toBe(
        `${flat[property]}${tail}`,
      );
    }
    // The clip already ends in `border-box`, where the ramp paints.
    expect(ramped.backgroundClip).toBe(flat.backgroundClip);
    expect(ramped.backgroundOrigin).toBe("border-box");
  });

  it("a themed slug names its OWN family and never inherits na's cream", () => {
    const ua = factionSheet("ua");
    expect(ua.backgroundColor).toBe("var(--faction-ua-card-bg)");
    expect(ua.backgroundImage).toBe("var(--faction-ua-card-sheet)");
    // Undeclared on purpose: falls to `none` / `normal` / `border-box`.
    for (const theme of CASCADES) {
      expect(resolveVar("--faction-ua-card-sheet", theme, THEMES)).toBeNull();
    }
  });
});

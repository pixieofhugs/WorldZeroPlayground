/**
 * The na SHEET token, and the two promises it has to keep (#2497, epic #2496).
 *
 * THE SEAM IS THE TOKEN'S ARITY, not any component's render. `--faction-default-card-sheet`
 * is a background LAYER LIST, and a background list is a list in three properties
 * at once — image, blend, clip. CSS CYCLES the short ones rather than padding
 * them, so a triple whose three members disagree on length is silently wrong: it
 * happens to be right at one layer (which is all na has) and mis-blends the
 * moment Albescent's dark prism arrives with five (#2499). Nothing renders that
 * defect today, so nothing but this file can fail on it.
 *
 * The second promise is the acceptance criterion of the whole issue: an
 * unaffiliated player sees NO CHANGE. That is checked by construction rather
 * than by eye — na's sheet must resolve to an opaque `card-bg` → `card-bg` ramp
 * over a `card-bg` colour with `normal` blending, which is the flat sheet the
 * eight `Default*` mounts painted before, in both cascades.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { factionSheet, factionSpectrumSheet } from "../factions";
import { readThemes, resolveVar, type Theme } from "./cssVars";

const CSS = readFileSync(
  fileURLToPath(new URL("../../index.css", import.meta.url)),
  "utf8",
);
const THEMES = readThemes(CSS);
const CASCADES: Theme[] = ["light", "dark"];

const SHEET = "--faction-default-card-sheet";
const BLEND = "--faction-default-card-sheet-blend";
const CLIP = "--faction-default-card-sheet-clip";

/**
 * Split a background list on its TOP-LEVEL commas — the ones between layers,
 * never the ones inside a `linear-gradient(…)`'s own argument list. A naive
 * `split(",")` reports na's single one-layer ramp as three layers and would pass
 * the arity check for entirely the wrong reason.
 */
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
      // `normal` composites the layer straight on: the ramp IS the ground, so
      // the rendered pixel is the flat sheet it replaced.
      expect(resolved(BLEND, theme)).toBe("normal");
      // The sheet stops at the padding box so a wash never bleeds under a
      // frame; `factionSheet` appends the `border-box` that keeps the COLOUR
      // running out to the edge. See the token's note in index.css.
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
      // The trailing `border-box` is what the dark card's TRANSLUCENT hairline
      // shows the sheet through. Dropping it repaints every dark card edge.
      backgroundClip: "var(--faction-default-card-sheet-clip), border-box",
    });
  });

  it("albescent resolves to the same family, so the two stay indistinguishable", () => {
    expect(factionSheet("albescent")).toEqual(factionSheet("na"));
    expect(factionSheet(null)).toEqual(factionSheet("na"));
  });

  it("appends the spectrum ramp to all THREE lists, never just the image", () => {
    // The one silent way to get the spectrum border wrong, and the reason both
    // cards call one helper (#2499). A background list is a list in three
    // properties at once and CSS CYCLES the short ones: append the ramp to the
    // image only and Albescent's SIX-layer dark prism hands its seventh layer
    // the first blend mode again. It renders. It is simply wrong, in one
    // cascade, on one faction — which is the defect nothing else here can fail
    // on, because na's sheet is one layer and cycling one value is a no-op.
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
    // The clip already carried its trailing `border-box` — that is where the
    // ramp paints, and it is the layer the colour is clipped by.
    expect(ramped.backgroundClip).toBe(flat.backgroundClip);
    // And the ramp only reaches the frame if the origin says so.
    expect(ramped.backgroundOrigin).toBe("border-box");
  });

  it("a themed slug names its OWN family and never inherits na's cream", () => {
    const ua = factionSheet("ua");
    expect(ua.backgroundColor).toBe("var(--faction-ua-card-bg)");
    expect(ua.backgroundImage).toBe("var(--faction-ua-card-sheet)");
    // Undeclared on purpose: the three declarations go invalid at
    // computed-value time and fall to `none` / `normal` / `border-box`, which
    // is exactly what `background: var(--faction-ua-card-bg)` rendered before.
    for (const theme of CASCADES) {
      expect(resolveVar("--faction-ua-card-sheet", theme, THEMES)).toBeNull();
    }
  });
});

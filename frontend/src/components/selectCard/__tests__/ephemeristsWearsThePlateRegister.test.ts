/**
 * The Ephemerists tile grounds on a SHEET, not the band (#2323). Band and plate
 * share one family, so a family sweep passes the bug. Pinned: (1) the ground
 * FLIPS between cascades (`-plate-band` deliberately doesn't); (2) no band ink
 * on a card with no band. The tile spells colour via `eph.*` exports, so every
 * check resolves those through `ephemeristsPlate` first.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import { readThemes, resolveVar, stripComments } from "../../../utils/__tests__/cssVars";
import { readIndexCss } from "../../../test/indexCss";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

/** Comments cite retired roles on purpose. */
const code = (relative: string): string => stripComments(read(relative));

const TILE = "../EphemeristsSelectCard.tsx";
const PLATE_MODULE = "../../factionMarks/ephemeristsPlate.tsx";

/** `ephemeristsPlate.tsx`'s palette, `{ EXPORT_NAME: '--custom-property' }`. */
function paletteExports(): Map<string, string> {
  const source = code(PLATE_MODULE);
  const map = new Map<string, string>();
  for (const [, name, prop] of source.matchAll(
    /export const (\w+) = "var\((--[\w-]+)\)";/g,
  )) {
    map.set(name, prop);
  }
  expect(map.size, "no palette exports parsed out of ephemeristsPlate.tsx").toBeGreaterThan(10);
  return map;
}

/** Every `eph.X` the tile names, resolved to the custom property behind it. */
function tokensNamedByTile(): Map<string, string> {
  const source = code(TILE);
  const palette = paletteExports();
  const used = new Map<string, string>();
  for (const [, name] of source.matchAll(/\beph\.(\w+)\b/g)) {
    const prop = palette.get(name);
    if (prop !== undefined) used.set(name, prop);
  }
  return used;
}

/** Box + register invariants live in `everySelectTileWearsItsCardsRegister` (#2816). */
describe("the Ephemerists tile wears the plate's register (#2323)", () => {
  it("grounds on a sheet that FLIPS, not on the theme-invariant band", () => {
    // Anchored on `<SelectCardFrame` so it can't hit the sigil chip's dark ground.
    const source = code(TILE);
    const root = source.slice(source.indexOf("<SelectCardFrame"));
    const ground = /background: eph\.(\w+),/.exec(root)?.[1];
    expect(ground, "no `background: eph.X` on the tile's root box").toBeDefined();

    const prop = paletteExports().get(ground!);
    expect(prop, `eph.${ground} is not a palette export`).toBeDefined();

    const themes = readThemes(readIndexCss());
    const [light, dark] = (["light", "dark"] as const).map((theme) =>
      resolveVar(prop!, theme, themes),
    );
    expect(light, `${prop} is undeclared in the light cascade`).not.toBeNull();
    expect(
      dark,
      `${prop} resolves to ${light} in BOTH cascades — it is a ground that does
not flip, which is the whole defect #2323 exists to fix. The tile spent this
epic on \`-plate-band\` (#12151f, the cornice masthead), so it was not failing
to flip; it was wearing a band where a sheet belongs. Take the sheet the task
card paints (\`eph.PLATE\`), not a band, and re-measure every ink on it.`,
    ).not.toBe(light);
  });

  it("names no ink that is only ever measured on the band", () => {
    const strays = [...tokensNamedByTile().keys()].filter((name) =>
      ["BAND", "BAND_INK", "BAND_QUIET"].includes(name),
    );
    expect(
      strays,
      `These inks are measured on \`-plate-band\` and on nothing else. This tile
paints no band, so each one is an ink measured against a ground the surface
does not have — the shape that made the old tile look correct while it was
dark-only. Find the PLATE role that answers the same question (\`INK\`,
\`QUIET\`, \`CAPTION\`), not a wider test.`,
    ).toEqual([]);
  });

  it("leaves no `--eph-*` codex consumer in the tile", () => {
    // Retired codex family: declared, but with no dark override for the plate.
    expect(code(TILE)).not.toMatch(/--eph-/);
  });

  it("sets no ground, ink or border inline over `.eph-cta`", () => {
    // `.eph-cta` (#2146) inverts per cascade; inline paint would pin light.
    const source = code(TILE);
    const cta = source.slice(source.indexOf('className="eph-cta"'));
    const button = cta.slice(0, cta.indexOf("}}"));
    for (const property of ["background", "color", "border"]) {
      expect(button, `\`${property}\` inline beats .eph-cta`).not.toMatch(
        new RegExp(`\\b${property}:`),
      );
    }
  });
});

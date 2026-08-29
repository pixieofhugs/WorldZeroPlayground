/**
 * THE SEAM: the Ephemerists tile grounds on a SHEET, not on the band (#2323).
 *
 * A source sweep, not a ratio, for the reason #2322 gives — but sharpened,
 * because this faction's defect is not S.N.I.D.E.'s and the sibling test next
 * door would pass the bug.
 *
 * S.N.I.D.E. had a FORKED FAMILY: two `--faction-snide-*` families, one of which
 * flips, so "does the tile name a family its task card does not?" finds it. The
 * Ephemerists' band and plate are the SAME family — `--faction-ephemerists-plate-*`
 * — and both are named by the task card, which paints a band at its head and a
 * plate under it. So #2321's acceptance as literally worded is VACUOUSLY TRUE of
 * the broken tile: it grounded on `-plate-band`, a token that is dark on purpose
 * in BOTH cascades, and no lint, census, family sweep or contrast row could see
 * that a sheet's job had been handed to a masthead's ground.
 *
 * The invariant one rung sharper, and the two halves this file pins:
 *
 *  1. THE SHEET FLIPS. The tile's ground resolves to different values under
 *     `:root` and `[data-theme="dark"]`. `-plate-bg` does (#eadcb6 / #171a26);
 *     `-plate-band` does not, and its own declaration in index.css says not to
 *     "complete" it. This is the assertion that goes red if anyone acts on
 *     `ephemeristsPlate.tsx`'s STALE claim that the register is theme-invariant
 *     and that dark "declares no plate token at all" — it declares fifteen.
 *  2. NO BAND INK ON A CARD WITH NO BAND. `-plate-band-ink` and
 *     `-plate-band-quiet` are measured on the compass blue and nowhere else. The
 *     tile paints no band ground, so naming either is an ink measured against a
 *     ground this surface does not have. (`-plate-disc` IS the compass blue and
 *     the tile does mount it, under the sigil; if a label is ever struck on that
 *     chip it takes a band ink and this list is what should be edited, with the
 *     reading written down — the disc's own declaration sets out why.)
 *
 * The tile spells its colour through `ephemeristsPlate`'s named exports rather
 * than as `var(--…)` strings, so a literal-only sweep would read ZERO custom
 * properties in it and pass on an empty set. Every check below resolves the
 * `eph.*` identifiers through that module first.
 *
 * No DOM: `renderToStaticMarkup` is the harness's ceiling and nothing here even
 * needs that — reading the sources is enough.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import { readThemes, resolveVar, stripComments } from "../../../utils/__tests__/cssVars";
import { readIndexCss } from "../../../test/indexCss";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

/** Comments are the decision record and cite the retired roles on purpose. */
const code = (relative: string): string => stripComments(read(relative));

const TILE = "../EphemeristsSelectCard.tsx";
const PLATE_MODULE = "../../factionMarks/ephemeristsPlate.tsx";

/**
 * `ephemeristsPlate.tsx`'s palette, as `{ EXPORT_NAME: '--custom-property' }`.
 * Only the one-line `export const X = "var(--…)"` declarations — the module's
 * components and style objects are not colour.
 */
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

/**
 * The two invariants this file used to assert here — the fluid 360x300 box
 * (#732) and "names no token family its own task card does not use" (#2321)
 * — now live in `everySelectTileWearsItsCardsRegister.test.ts`, derived over
 * all nine kits including the `Default`-backed tile this suite could not
 * reach (#2816). This file keeps everything bespoke to the Ephemerists.
 */
describe("the Ephemerists tile wears the plate's register (#2323)", () => {
  it("grounds on a sheet that FLIPS, not on the theme-invariant band", () => {
    // The root style object is the first one in the file, and its `background`
    // is the sheet. Anchored on `maxWidth: 360` so this cannot drift onto the
    // sigil chip's own `background`, which is the dark chip by design.
    const source = code(TILE);
    const root = source.slice(source.indexOf("maxWidth: 360"));
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
    // The retired illuminated codex. Its family is still DECLARED and has no
    // dark override tuned for the plate, so a stray reader is a silent
    // single-cascade paint (`ephemeristsPlate.tsx` states the rule).
    expect(code(TILE)).not.toMatch(/--eph-/);
  });

  it("sets no ground, ink or border inline over `.eph-cta`", () => {
    // The one plate CTA (#2146) inverts between the cascades and its enclosure
    // changes WIDTH, which no token can carry. An inline property at any of its
    // six mounts beats the class and pins the light half in both themes on that
    // surface alone.
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

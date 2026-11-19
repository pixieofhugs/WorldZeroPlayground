/**
 * The Ephemerists tile grounds on a SHEET, not the band (#2323). Band and plate
 * share one family, so a family sweep passes the bug. Pinned on the RENDER:
 * (1) the ground FLIPS between cascades (`-plate-band` deliberately doesn't);
 * (2) no band ink on a card with no band.
 */
import { describe, it, expect } from "vitest";

import { readThemes, resolveVar } from "../../../utils/__tests__/cssVars";
import { readIndexCss } from "../../../test/indexCss";
import { BAND, BAND_INK, BAND_QUIET } from "../../factionMarks/ephemeristsPlate";
import { tileMarkup } from "./tileMarkup";

const markup = () => tileMarkup("ephemerists");

/** The element opened by the first tag carrying `marker`. */
const tagWith = (html: string, marker: string): string => {
  const at = html.indexOf(marker);
  expect(at, `no ${marker} in the tile`).toBeGreaterThan(-1);
  return html.slice(html.lastIndexOf("<", at), html.indexOf(">", at) + 1);
};

describe("the Ephemerists tile wears the plate's register (#2323)", () => {
  it("grounds on a sheet that FLIPS, not on the theme-invariant band", () => {
    const themes = readThemes(readIndexCss());
    for (const html of markup()) {
      const prop = /background:var\((--[\w-]+)\)/.exec(tagWith(html, "data-select-frame"))?.[1];
      expect(prop, "no `background: var(--…)` on the tile's root box").toBeDefined();
      const [light, dark] = (["light", "dark"] as const).map((theme) => resolveVar(prop!, theme, themes));
      expect(light, `${prop} is undeclared in the light cascade`).not.toBeNull();
      expect(
        dark,
        `${prop} resolves to ${light} in BOTH cascades — a ground that does not flip, the defect #2323 exists to fix. Take the sheet the task card paints (\`eph.PLATE\`), not a band.`,
      ).not.toBe(light);
    }
  });

  it("names no ink that is only ever measured on the band", () => {
    for (const html of markup()) {
      for (const ink of [BAND, BAND_INK, BAND_QUIET]) {
        expect(html, `${ink} is measured on a band this tile does not paint`).not.toContain(ink);
      }
    }
  });

  it("leaves no `--eph-*` codex consumer in the tile", () => {
    for (const html of markup()) expect(html).not.toMatch(/--eph-/);
  });

  it("sets no ground, ink or border inline over `.eph-cta`", () => {
    // `.eph-cta` (#2146) inverts per cascade; inline paint would pin light.
    for (const html of markup()) {
      const style = /style="([^"]*)"/.exec(tagWith(html, 'class="eph-cta"'))?.[1] ?? "";
      expect(style).not.toMatch(/(?:^|;)(?:background|color|border):/);
    }
  });
});

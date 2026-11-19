/**
 * The WOW tile names no TOKEN its own task card does not (#2328). WOW had no
 * forked family, only stray names (chip/gilt/avatar plates, `-chronicle-border`)
 * inside shared ones, all live and AA-passing. Read off the render, so paint
 * handed over by interpolation (`factionRoleVars`) or a mark is seen too.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";

import { factionRoleVar } from "../../../utils/factionRoles";
import { readThemes, resolveVar } from "../../../utils/__tests__/cssVars";
import { readIndexCss } from "../../../test/indexCss";
import { WowSigil } from "../../sigil/WowSigil";
import { tileMarkup } from "./tileMarkup";

const markup = () => tileMarkup("wow");

describe("the WOW tile wears the quest decree's register (#2328)", () => {
  it("takes the page kit's and the avatar's plates off the tile for good", () => {
    for (const html of markup()) {
      expect(
        html.match(/--faction-wow-(?:chip|gilt|avatar|plate|ground)-[\w-]*/g) ?? [],
        "those families belong to the faction PAGE and the avatar; the chronicle families are the card's",
      ).toEqual([]);
    }
  });

  it("proves the frame synonym rather than waiving it", () => {
    const themes = readThemes(readIndexCss());
    for (const theme of ["light", "dark"] as const) {
      expect(
        resolveVar("--faction-wow-chronicle-border", theme, themes),
        `${theme}: the frame swap is only a no-op while these two resolve equal`,
      ).toBe(resolveVar("--faction-wow-chronicle-gold", theme, themes));
    }
  });

  it("badges itself with the canonical crest, never a re-drawn one", () => {
    const crest = renderToStaticMarkup(<WowSigil size={88} />);
    for (const html of markup()) expect(html).toContain(crest);
  });

  it("sets the call in the decree's own face and size", () => {
    expect(factionRoleVar("wow", "face"), "the `face` role is MedievalSharp").toBe("var(--faction-wow-card-font)");
    for (const html of markup()) {
      const call = html.match(/<button[^>]*data-select-slot="call"[^>]*>/)?.[0] ?? "";
      expect(call).toContain("font-family:var(--faction-wow-card-font)");
      expect(call, "the decree's CTA IS `--text-content`").toContain("font-size:var(--text-content)");
    }
  });
});

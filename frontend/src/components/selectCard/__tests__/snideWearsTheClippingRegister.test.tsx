/**
 * The S.N.I.D.E. tile and its task card name ONE token family (#2322): the tile
 * sat on the old non-flipping `--snide-*` family while the card moved to
 * `--faction-snide-note-*`. Both pass contrast; only the named paint shows the fork.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";

import FactionSelectCard from "../FactionSelectCard";
import { surfaceMap } from "../../../factions";
import { readIndexCss } from "../../../test/indexCss";
import { tileMarkup } from "./tileMarkup";

const markup = () => tileMarkup("snide");

describe("the S.N.I.D.E. tile wears the clipping's register (#2322)", () => {
  it("spells the faces as the faction's own font tokens, not the global names", () => {
    for (const html of markup()) {
      for (const [global, faction] of [
        ["--font-faction-anton", "--faction-snide-font-black"],
        ["--font-faction-typewriter", "--faction-snide-font-type"],
        ["--font-faction-marker", "--faction-snide-font-marker"],
      ] as const) {
        expect(html, `${global} is the raw family; ${faction} is the ROLE`).not.toContain(global);
      }
      expect(html).toContain("--faction-snide-font-black");
      expect(html).toContain("--faction-snide-font-marker");
    }
  });

  it("leaves no bare `--snide-*` consumer on any tile or the dispatcher", () => {
    const everyTile = Object.keys(surfaceMap("factionSelectCard")).flatMap(tileMarkup);
    everyTile.push(renderToStaticMarkup(<FactionSelectCard faction="snide" state="eligible" />));
    for (const html of everyTile) expect(html, "a tile still reads the retired family").not.toMatch(/--snide-/);
  });

  it("keeps the retired names undeclared, which is what stops the fork returning", () => {
    const css = readIndexCss();
    for (const name of ["--snide-acid", "--snide-ink", "--snide-paper", "--snide-pink"]) {
      expect(css, `${name} is declared again in index.css`).not.toMatch(new RegExp(`^\\s*${name}\\s*:`, "m"));
    }
  });
});

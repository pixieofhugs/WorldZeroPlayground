/**
 * The Everymen tile and its task card name ONE register (#2327). Asked of the
 * NAME: `--everymen-field` equals the bill's red in light and diverges only in
 * dark, so a value check passes too. Read off the render.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";

import { readThemes, resolveVar } from "../../../utils/__tests__/cssVars";
import { readIndexCss } from "../../../test/indexCss";
import EverymenFactionHero from "../../factionHero/EverymenFactionHero";
import { EverymenSigil } from "../../sigil/EverymenSigil";
import { EverymenCog } from "../../factionMarks/everymenCogs";
import { tileMarkup } from "./tileMarkup";

const markup = () => tileMarkup("everymen");
const themes = readThemes(readIndexCss());

describe("the Everymen tile wears the bill's register (#2327)", () => {
  it("leaves the poster FIELD register off the tile for good", () => {
    for (const html of markup()) {
      for (const forked of ["--everymen-field", "--everymen-field-deep", "--everymen-cream"]) {
        expect(html, `${forked} is the poster field; the bill prints on the paper`).not.toContain(forked);
      }
      expect(html, "the bill's ink is `--everymen-paper-text`, which flips with the paper").not.toMatch(
        /--everymen-ink\b/,
      );
    }
  });

  it("retires nothing: the field register keeps its own reader", () => {
    const hero = renderToStaticMarkup(
      <EverymenFactionHero slug="everymen" name="Everymen" members={3} tasks={2} praxes={1} />,
    );
    expect(hero).toContain("--everymen-field");
  });

  it("wears the card's poster face, and it is still Bebas in both cascades", () => {
    // Per cascade: a bare-`:root` alias resolves once (#1839).
    for (const theme of ["light", "dark"] as const) {
      expect(
        resolveVar("--faction-everymen-card-font", theme, themes),
        `the bill's poster face is no longer Bebas in ${theme}`,
      ).toBe('"Bebas Neue", Impact, sans-serif');
    }
    for (const html of markup()) {
      expect(html, "the card names the faction's ROLE token").toContain("--faction-everymen-card-font");
      expect(html, "--font-faction-poster is retired").not.toContain("var(--font-faction-poster)");
    }
  });

  it("mounts the shared burst and draws no second one — #2393", () => {
    for (const html of markup()) {
      expect(html.match(/class="em-burst"/g)).toHaveLength(1);
      expect(html, "never a new transcription of the burst").not.toContain("repeating-conic-gradient");
    }
  });

  it("mounts the shared marks, each once", () => {
    const sigil = renderToStaticMarkup(<EverymenSigil size={30} color="var(--faction-everymen-bill-mast-ink)" />);
    const cog = renderToStaticMarkup(<EverymenCog size={15} fill="var(--everymen-red)" hub="var(--everymen-paper)" />);
    for (const html of markup()) {
      expect(html.split(sigil)).toHaveLength(2);
      expect(html.split(cog), "a tile that draws the cog itself spells it twice").toHaveLength(2);
    }
  });
});

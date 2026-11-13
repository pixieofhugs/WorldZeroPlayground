/**
 * The select-card contract (#3130, #3139): seven slots, in one order, on every
 * tile, in every state — read off the blocks' `data-select-*` markup, so a
 * hand-authored tree shows up as no slots. The reveal flag is module-level,
 * hence the unconditional reset.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, it, expect } from "vitest";

import FactionSelectCard, { type SelectState } from "../FactionSelectCard";
import { surfaceMap } from "../../../factions";
import { stripComments } from "../../../utils/__tests__/cssVars";
import {
  ALBESCENT_FACTION_SLUG,
  REDACTED,
  setAlbescentRevealed,
} from "../../../utils/factions";

const STATES: readonly SelectState[] = ["locked", "eligible", "member"];

/** The three zones and the seven slots, in the one order a tile may draw them. */
const WITH_HEADCOUNT = [
  "slot:band",
  "zone:body",
  "slot:motto",
  "slot:pitch",
  "slot:ornament",
  "zone:footer",
  "slot:standing",
  "slot:headcount",
  "slot:call",
];
const WITHOUT_HEADCOUNT = WITH_HEADCOUNT.filter((entry) => entry !== "slot:headcount");

const SLUGS = Object.keys(surfaceMap("factionSelectCard"));
const tile = (slug: string, state: SelectState, members?: number): string =>
  renderToStaticMarkup(<FactionSelectCard faction={slug} state={state} members={members} />);

// ponytail: document order stands in for nesting (no DOM); parse the markup if
// a tile ever needs a true containment check.
const layout = (html: string): string[] =>
  [...html.matchAll(/data-select-(slot|zone)="([a-z]+)"/g)].map(([, kind, name]) => `${kind}:${name}`);

/** The element opened by the tag carrying `marker`, through its matching close. */
function element(html: string, marker: string): string {
  const at = html.indexOf(marker);
  if (at === -1) return "";
  const start = html.lastIndexOf("<", at);
  const tag = html.slice(start + 1).match(/^[a-z0-9]+/)![0];
  let depth = 0;
  for (const match of html.slice(start).matchAll(new RegExp(`<(/?)${tag}\\b[^>]*>`, "g"))) {
    depth += match[1] ? -1 : 1;
    if (depth === 0) return html.slice(start, start + match.index! + match[0].length);
  }
  return html.slice(start);
}

const text = (html: string): string => html.replace(/<[^>]*>/g, "");

afterEach(() => setAlbescentRevealed(false));

describe.each(SLUGS)("the %s tile keeps the seven slots (#3130)", (slug) => {
  // Only Albescent reads the flag; running both keeps the loop faction-blind.
  describe.each([
    ["revealed", true],
    ["unrevealed", false],
  ])("%s", (_label, revealed) => {
    it.each(STATES)("draws all seven, in order, when %s", (state) => {
      setAlbescentRevealed(revealed);
      expect(layout(tile(slug, state, 12))).toEqual(WITH_HEADCOUNT);
    });

    it.each(STATES)("draws no headcount and no separator when the count is unknown (%s)", (state) => {
      setAlbescentRevealed(revealed);
      const html = tile(slug, state);
      expect(layout(html)).toEqual(WITHOUT_HEADCOUNT);
      // The separator leaves with the headcount.
      const row = element(html, 'data-select-row="standing"');
      expect(row).not.toBe("");
      expect(text(row)).toBe(text(element(html, 'data-select-slot="standing"')));
    });

    it("takes the height a stretched row hands it, through every wrapper", () => {
      setAlbescentRevealed(revealed);
      const html = tile(slug, "eligible");
      // Root to frame, every box grows and every wrapper is a column (#3139).
      const chain = html.slice(0, html.indexOf(">", html.indexOf("data-select-frame")) + 1).match(/<[^>]+>/g)!;
      for (const box of chain) expect(box).toContain("flex-grow:1");
      for (const wrapper of chain.slice(0, -1)) {
        expect(wrapper).toContain("display:flex");
        expect(wrapper).toContain("flex-direction:column");
      }
    });

    it.each(STATES)("draws the seal for a member and for nobody else (%s)", (state) => {
      setAlbescentRevealed(revealed);
      const html = tile(slug, state, 12);
      const seal = element(html, "data-select-seal");
      if (state !== "member") {
        expect(seal).toBe("");
        return;
      }
      expect(element(html, 'data-select-slot="band"')).toContain(seal);
      expect(seal).toContain('aria-hidden="true"');
      expect(text(seal)).toBe("");
    });

    it("keeps the headcount out of the call, and the call last", () => {
      setAlbescentRevealed(revealed);
      const html = tile(slug, "member", 12);
      const call = element(html, 'data-select-slot="call"');
      expect(call.startsWith("<button")).toBe(true);
      expect(text(call)).not.toMatch(/\d/);
      expect(call).toMatch(/^<button[^>]*>[^<]+<\/button>$/);
      expect(text(html).endsWith(text(call))).toBe(true);
    });

    it("hides the ornament from assistive tech", () => {
      setAlbescentRevealed(revealed);
      const ornament = element(tile(slug, "eligible", 12), 'data-select-slot="ornament"');
      expect(ornament).toContain('aria-hidden="true"');
      expect(text(ornament)).toBe("");
    });
  });
});

describe("a redacted tile leaves every slot standing (#3130, ADR-0082)", () => {
  it("blanks the copy, keeps the seal, and shuts the call rather than dropping it", () => {
    setAlbescentRevealed(false);
    const html = tile(ALBESCENT_FACTION_SLUG, "member", 12);
    expect(layout(html)).toEqual(WITH_HEADCOUNT);
    for (const slot of ["band", "motto", "pitch", "standing", "headcount", "call"]) {
      const copy = text(element(html, `data-select-slot="${slot}"`));
      expect(copy, `${slot} is redacted`).toContain(REDACTED);
      expect(copy.replaceAll(REDACTED, "").replace(/[\s·]/g, ""), `${slot} leaks nothing`).toBe("");
    }
    expect(element(html, "data-select-seal")).not.toBe("");
    expect(element(html, 'data-select-slot="call"')).toMatch(/^<button[^>]*\bdisabled\b/);
  });
});

describe("the blocks branch on no faction (ADR-0090)", () => {
  // Read inside each case, so a missing file fails two cases and not the suite.
  const blocks = (): string =>
    stripComments(
      readFileSync(fileURLToPath(new URL("../selectCardBlocks.tsx", import.meta.url)), "utf8"),
    );

  it("reads no slug and reaches for no faction helper", () => {
    const source = blocks();
    // A seam that takes no slug cannot grow a slug branch (#2660).
    expect(source).not.toMatch(/slug/i);
    expect(source).not.toMatch(/utils\/faction/);
    expect(source).not.toMatch(/--faction-/);
    for (const slug of SLUGS) {
      expect(source, `the blocks name ${slug}`).not.toMatch(new RegExp(`["'\`]${slug}["'\`]`));
    }
  });

});

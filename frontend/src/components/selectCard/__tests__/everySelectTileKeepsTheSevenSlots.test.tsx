/**
 * THE SELECT-CARD CONTRACT (#3130, built by #3139): seven slots, in one order,
 * on every tile, in every state. A faction never adds one and never skips one.
 *
 * THE SEAM is the rendered markup of each tile the `factionSelectCard` surface
 * map dispatches, reached through `FactionSelectCard` the way both mount sites
 * reach it. The layout blocks in `../selectCardBlocks.tsx` stamp each slot and
 * zone with a data attribute, so the order is read off the markup rather than
 * off any tile's source — a tile that hand-authors its own tree shows up here
 * as a tile with no slots at all.
 *
 * `renderToStaticMarkup` only — no jsdom. The reveal flag is module-level and
 * outlives the case that sets it, hence the unconditional reset.
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

/**
 * NOT YET ON THE BLOCKS. One faction per entry, and each faction's own issue
 * deletes ITS OWN ENTRY LINE and nothing else in this file.
 *
 * The bare `//` lines are spacers and stay: git merges two deletions cleanly
 * only when an unchanged line stands between them, and seven children land in
 * parallel. When the last entry goes, the close-out deletes the array and the
 * `pending` arm below.
 *
 * A pending tile is asserted to be OFF the contract, not merely skipped, so a
 * converted tile that forgets its line fails here instead of rotting the list.
 */
const PENDING: readonly string[] = [
  //
  "coven",
  //
  "ephemerists",
  //
  "everymen",
  //
  "singularity",
  //
  "snide",
  //
  "ua",
  //
  "wow",
  //
];

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
// Both ranges are the surface map's (#2815): PENDING only sorts its tiles into
// two piles, so a tenth kit joins the live loop by registering a tile.
const LIVE = SLUGS.filter((slug) => !PENDING.includes(slug));
const WAITING = SLUGS.filter((slug) => PENDING.includes(slug));

const tile = (slug: string, state: SelectState, members?: number): string =>
  renderToStaticMarkup(<FactionSelectCard faction={slug} state={state} members={members} />);

// ponytail: document order stands in for nesting — a slot drawn after its
// zone's opening tag and before the next zone's is taken to be inside it. The
// harness has no DOM; if a tile ever needs a true containment check, parse it.
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

describe("the pending list names real tiles", () => {
  it("lists only factions the surface map dispatches, once each", () => {
    expect(new Set(PENDING).size).toBe(PENDING.length);
    for (const slug of PENDING) expect(SLUGS, `${slug} is not a dispatched tile`).toContain(slug);
  });

  it.each(WAITING)("%s is still off the blocks — delete its PENDING line when it converts", (slug) => {
    expect(layout(tile(slug, "member", 12))).not.toEqual(WITH_HEADCOUNT);
  });
});

describe.each(LIVE)("the %s tile keeps the seven slots (#3130)", (slug) => {
  // Albescent is the one tile with a second reading; every other slug ignores
  // the flag, so running both costs nothing and names no faction in the loop.
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
      // The separator is the headcount's own, so it leaves with it.
      expect(text(html)).not.toContain("·");
    });

    it.each(STATES)("draws the seal for a member and for nobody else (%s)", (state) => {
      setAlbescentRevealed(revealed);
      const html = tile(slug, state, 12);
      const seal = element(html, "data-select-seal");
      if (state !== "member") {
        expect(seal).toBe("");
        return;
      }
      // In the band, hidden from assistive tech, and a drawing: no copy in it.
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
      // Its label and nothing else: one text node, no child elements.
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

  it("owns the fluid 360x300 box every tile used to spell (#732)", () => {
    const source = blocks();
    expect(source).toContain('width: "100%"');
    expect(source).toContain("maxWidth: 360");
    expect(source).toContain("minHeight: 300");
  });
});

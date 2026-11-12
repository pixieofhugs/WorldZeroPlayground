/**
 * The notation band (#2143), with the rune strip merged in (#2230).
 *
 *  • The count, `clamp(round(width / 52), 7, 34)`: SSR renders an empty band,
 *    so it's checked at the function.
 *  • The seeded draw: same seed same row, different seed different row (the
 *    screenshot criterion, checked at `drawNotation`).
 *  • `space-between` at every mount.
 *  • The two stylesheets: reduced-motion gate and deferred split, invisible
 *    in markup.
 *  • "Drawn once", keyed on the pool and generator rather than the name, since
 *    a renamed copy (`DRIFT`, #2341) evaded a name census before.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import {
  EphemeristsNotationBand,
  drawNotation,
  markCount,
  type NotationSide,
} from "../EphemeristsNotationBand";
import { ruleBodies, stripComments } from "../../../utils/__tests__/cssVars";
import { sourceFiles, toRelative } from "../../../test/sourceScan";
import { readIndexCss } from "../../../test/indexCss";

const BAND = fileURLToPath(new URL("../EphemeristsNotationBand.tsx", import.meta.url));
const sheet = (name: string): string =>
  stripComments(readFileSync(fileURLToPath(new URL(`../../../${name}`, import.meta.url)), "utf8"));
const CSS = stripComments(readIndexCss());
const MOTION = sheet("motion.ornament.css");
const GATE = "@media (prefers-reduced-motion: no-preference)";

/** Comments stripped: the docblock may name the traps it avoids. */
const CODE = readFileSync(BAND, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");

const SIDES: NotationSide[] = ["band", "top", "bottom", "divider"];

/** The head of `MARKS` as written: survives any renaming (#2341). */
const POOL_HEAD = '"∫", "∑", "∏", "√", "∮"';

describe("the count is measured, and it is the same arithmetic everywhere", () => {
  it("takes one mark per 52px, which is the owner's halving of the design's 26", () => {
    expect(markCount(676)).toBe(13);
    expect(markCount(416)).toBe(8);
    expect(markCount(690)).toBe(13); // rounds down
    expect(markCount(702)).toBe(14); // rounds up
  });

  it("floors at seven so a phone card is a band and not a row of bullets", () => {
    expect(markCount(260)).toBe(7);
    expect(markCount(1)).toBe(7);
  });

  it("ceilings at the pool's own size, so no band outruns the draw", () => {
    expect(markCount(30_000)).toBe(34);
    expect(drawNotation("any")).toHaveLength(34);
  });

  it("draws nothing at all before it has been measured", () => {
    // Not the floor: painting 7 then jumping to 13 is a twitch.
    expect(markCount(0)).toBe(0);
    for (const side of SIDES) {
      expect(
        renderToStaticMarkup(<EphemeristsNotationBand seed="task:1" side={side} />),
        side,
      ).not.toMatch(/<span/);
    }
  });
});

describe("the draw is seeded per surface AND per side", () => {
  const row = (seed: string) =>
    drawNotation(seed).map((mark) => `${mark.frames.join("")}${mark.size}/${mark.peak}/${mark.delay}`);

  it("hands the same seed the same row every time", () => {
    expect(row("praxis:41:divider")).toEqual(row("praxis:41:divider"));
  });

  it("hands three neighbouring surfaces three different rows", () => {
    const rows = ["task:1:top", "task:2:top", "task:3:top"].map((seed) => row(seed).join(""));
    expect(new Set(rows).size).toBe(3);
  });

  it("folds the side in, so the two strips bracketing one button differ", () => {
    expect(row("task:41:top")).not.toEqual(row("task:41:bottom"));
    expect(row("praxis:41:top")).not.toEqual(row("praxis:41:divider"));
  });

  it("varies the size across the whole 11/13/15/17 cycle", () => {
    const sizes = new Set(drawNotation("task:7").map((mark) => mark.size));
    expect([...sizes].sort((a, b) => a - b)).toEqual([11, 13, 15, 17]);
  });

  it("draws the fade PER MARK, inside the design's peak and phase ranges", () => {
    // Neither strided nor shared phase (#2230).
    const marks = drawNotation("task:7");
    expect(marks.every((mark) => mark.peak >= 0.34 && mark.peak <= 0.79)).toBe(true);
    expect(marks.every((mark) => mark.delay >= 0 && mark.delay <= 11.5)).toBe(true);
    const delays = marks.slice(0, 8).map((mark) => mark.delay);
    expect(new Set(delays).size, delays.join()).toBeGreaterThan(6);
  });

  it("gives every mark two frames, which is what lets the row turn at all", () => {
    expect(drawNotation("task:7").every((mark) => mark.frames.length === 2)).toBe(true);
  });

  it("grows at the tail, so a resize appends marks rather than redrawing them", () => {
    const full = drawNotation("task:9");
    const narrow = full.slice(0, markCount(260));
    const wide = full.slice(0, markCount(676));
    expect(narrow).toHaveLength(7);
    expect(wide).toHaveLength(13);
    expect(wide.slice(0, narrow.length)).toEqual(narrow);
  });

  it("holds no randomness of its own", () => {
    expect(CODE).not.toContain("Math.random");
  });
});

describe("one drawing at four mounts (#2230)", () => {
  const opened = (side: NotationSide): string => {
    const html = renderToStaticMarkup(<EphemeristsNotationBand seed="task:41" side={side} />);
    return html.slice(0, html.indexOf(">"));
  };

  it("spreads `space-between` at EVERY side, which is the whole of the issue", () => {
    for (const side of SIDES) expect(opened(side), side).toContain("justify-content:space-between");
  });

  it("names its side, so the stylesheet can offset it", () => {
    for (const side of SIDES) expect(opened(side), side).toContain(`data-eph-runes="${side}"`);
  });

  it("rules only the masthead in brass, and only the masthead reads the band ink", () => {
    // `-plate-quiet` would be ~1.4:1 on the band.
    expect(opened("band")).toContain("border-top:1px solid var(--faction-ephemerists-plate-brass-rule)");
    expect(opened("band")).toContain("3px double var(--faction-ephemerists-plate-brass-rule)");
    expect(opened("band")).toContain("color:var(--faction-ephemerists-plate-band-ink)");
    for (const side of ["top", "bottom", "divider"] as const) {
      expect(opened(side), side).not.toContain("brass-rule");
      expect(opened(side), side).toContain("color:var(--faction-ephemerists-plate-quiet)");
    }
  });

  it("fills its container at every mount, and insets at none (#2724)", () => {
    for (const side of SIDES) {
      expect(opened(side), side).toContain("width:100%");
      expect(opened(side), side).not.toContain("calc(100% -");
      expect(opened(side), side).not.toContain("* -1)");
    }
  });

  it("is decoration, and carries no reachable text", () => {
    for (const side of SIDES) {
      const html = renderToStaticMarkup(<EphemeristsNotationBand seed="task:41" side={side} />);
      expect(html, side).toContain('aria-hidden="true"');
      expect(html, side).not.toContain("aria-label");
      expect(html, side).not.toContain("sr-only");
    }
  });

  it("declares no animation inline — the stylesheets own the motion", () => {
    // #911. Also on source: unmeasured markup is empty and passes vacuously.
    for (const side of SIDES) {
      expect(
        renderToStaticMarkup(<EphemeristsNotationBand seed="task:41" side={side} />),
        side,
      ).not.toContain("animation");
    }
    expect(CODE).not.toMatch(/animation:/);
  });

  it("paints from tokens only", () => {
    expect(CODE).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe("the two sheets: resting frame here, motion over there", () => {
  it("declares the keyframes in the DEFERRED sheet, not the blocking one", () => {
    // #2073's split.
    expect(MOTION).toContain("@keyframes eph-rune-shift");
    expect(MOTION).toContain("@keyframes eph-rune-turn");
    expect(CSS).not.toContain("@keyframes eph-rune-");
  });

  it("adds both animations only under `prefers-reduced-motion: no-preference`", () => {
    // The design's way round, reduced-motion readers would get a zero trough.
    const gated = ruleBodies(MOTION, GATE).join("\n");
    expect(ruleBodies(gated, ".eph-rune").join("\n")).toContain("animation: eph-rune-shift");
    expect(ruleBodies(gated, ".eph-rune > span").join("\n")).toContain("animation: eph-rune-turn");
    const ungated = MOTION.split(GATE)[0];
    expect(ungated, "an ungated `.eph-rune` animation").not.toMatch(/\.eph-rune[^}]*animation:/);
  });

  it("cuts the frame at ZERO opacity — the turn is exactly twice the shimmer (#2725)", () => {
    // Both halves needed: trough 0 at 0%/100%, and turn = 2× shimmer so the
    // cuts (0%/100%, 50%) always land on a trough. A shared `--epg-delay`
    // keeps that alignment per mark.
    const shift = ruleBodies(MOTION, "@keyframes eph-rune-shift").join("");
    expect(shift, "the shimmer's trough").toMatch(/0%,\s*100%\s*\{\s*opacity:\s*0;/);

    const gated = ruleBodies(MOTION, GATE).join("\n");
    const seconds = (selector: string, name: string): number => {
      const found = new RegExp(`animation:\\s*${name}\\s+([\\d.]+)s`).exec(
        ruleBodies(gated, selector).join("\n"),
      );
      expect(found, `${selector} names no ${name} duration`).not.toBeNull();
      return Number(found![1]);
    };
    expect(seconds(".eph-rune > span", "eph-rune-turn")).toBe(
      seconds(".eph-rune", "eph-rune-shift") * 2,
    );

    for (const name of ["eph-rune-turn", "eph-rune-turn-back"]) {
      expect(ruleBodies(MOTION, `@keyframes ${name}`).join(""), name).toMatch(/50%,\s*100%/);
    }
    for (const selector of [".eph-rune", ".eph-rune > span"]) {
      expect(ruleBodies(gated, selector).join("\n"), selector).toContain("--epg-delay");
    }
  });

  it("leaves a stilled row whole and legible", () => {
    // The stilled base must be in the blocking sheet, not the deferred one.
    expect(ruleBodies(CSS, ".eph-rune").join("\n")).toContain("opacity: var(--epg-op");
    expect(ruleBodies(CSS, ".eph-rune > span").join("\n")).toContain("grid-area: 1 / 1");
    expect(ruleBodies(CSS, ".eph-rune > span + span").join("\n")).toContain("opacity: 0");
  });

  it("keeps the three CTA offsets in the sheet, where raw lengths belong", () => {
    for (const rule of ["top", "bottom", "divider"]) {
      expect(CSS, rule).toContain(`[data-eph-runes="${rule}"]`);
    }
  });

  it("no longer sizes or stretches a mark from the sheet (#2230)", () => {
    // The draw carries the size.
    expect(CSS).not.toContain(".eph-rune:nth-child");
    expect(ruleBodies(CSS, ".eph-rune").join("\n")).not.toContain("flex:");
    expect(ruleBodies(CSS, ".eph-rune").join("\n")).not.toContain("font-size");
  });
});

describe("it is drawn ONCE — keyed on the drawing, not the name (#2230, #2341)", () => {
  const files: [string, string][] = sourceFiles().map((path) => [path, readFileSync(path, "utf8")]);

  it("declares the mark pool in exactly one file", () => {
    const found = files.filter(([, source]) => source.includes(POOL_HEAD)).map(([path]) => path);
    expect(found).toEqual([BAND]);
  });

  it("holds no second copy of the seeded generator", () => {
    const found = files
      .filter(([, source]) => source.includes("0x6d2b79f5"))
      .map(([path]) => toRelative(path));
    expect(found).toEqual(["components/factionMarks/ephemeristsPlate.tsx"]);
  });

  it("leaves no second row breathing on the same two custom properties", () => {
    const found = files
      .filter(([path, source]) => path !== BAND && /--epg-(op|delay)/.test(source))
      .map(([path]) => toRelative(path));
    expect(found).toEqual([]);
  });

  it("is mounted at the two page headers, the three CTA surfaces and the praxis byline", () => {
    // Page wears it in its header, card at its CTA (#2367). Field desk doesn't
    // bracket its CTA (#2067); the feed frame wraps others' content, so none.
    // A new entry is a design decision.
    const mounts = files
      .filter(([, source]) => source.includes("<EphemeristsNotationBand"))
      .map(([path]) => toRelative(path));
    expect(mounts.sort()).toEqual([
      "components/factionHero/EphemeristsFactionHero.tsx",
      "components/factionMarks/EphemeristsMasthead.tsx",
      "components/praxisCard/desktop/EphemeristsPraxisCard.tsx",
      "components/taskCard/EphemeristsTaskCard.tsx",
      "pages/editPraxis/archetypes/EphemeristsEditPraxis.tsx",
      "pages/taskDetail/archetypes/EphemeristsTaskDetail.tsx",
    ]);
  });

  it("leaves no `EphemeristsRuneStrip` module behind", () => {
    expect(files.map(([path]) => path).filter((path) => path.includes("RuneStrip"))).toEqual([]);
  });
});

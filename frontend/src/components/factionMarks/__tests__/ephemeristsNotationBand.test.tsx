/**
 * THE NOTATION BAND (#2143), WITH THE RUNE STRIP INSIDE IT (#2230).
 *
 * Two components became one, so this file absorbs `ephemeristsRuneStrip.test`'s
 * live seams as well. FIVE of them, and the first two exist because the harness
 * cannot see the thing that matters:
 *
 *  • THE COUNT. `n = clamp(round(width / 52), 7, 34)`, measured off a real
 *    element. This repo has no jsdom — `renderToStaticMarkup` only, effects
 *    never run, nothing can be measured — so a rendered band here is an EMPTY
 *    band by construction and the arithmetic can only be checked at the
 *    function. A `/ 26` that survives review renders a plausible band at twice
 *    the count on every surface.
 *  • THE DRAW IS SEEDED, which is the whole reason the seed exists, and it is
 *    also the acceptance criterion #2230 states that nobody here can screenshot:
 *    *"three task cards captured twice: rows differ from each other, identical
 *    between captures."* Same seed same row, different seed different row,
 *    asserted at `drawNotation` where it is visible without a browser.
 *  • THE SPACING, at EVERY mount. `space-between` and a measured count is the
 *    whole of #2230; a mount that came back with the strip's old `flex: auto`
 *    row would look almost right and be the exact bug reported.
 *  • THE TWO STYLESHEETS, for the reduced-motion gate and the deferred split.
 *    The design writes the shimmer always-on with `opacity: .16` as the base,
 *    which stills to an unreadable row; the repo's inversion cannot be asserted
 *    from markup, because the markup is identical either way. And an inline
 *    `animation:` sits outside every media query, so it would defeat the gate
 *    while rendering perfectly.
 *  • THE SOURCE TREE, for "drawn once". #2230's own finding, from #2341: *a
 *    census keyed on the component NAME cannot see a re-transcription; key it on
 *    the drawing.* That is how `DRIFT` survived #2210 and #2067 — it was never
 *    called a rune strip. So the guard below is keyed on the POOL and on the
 *    generator, which a copy must carry however it is renamed, inlined or split
 *    up, and the mount census is a separate, looser thing.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
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

const SRC = fileURLToPath(new URL("../../..", import.meta.url));
const BAND = fileURLToPath(new URL("../EphemeristsNotationBand.tsx", import.meta.url));
const sheet = (name: string): string =>
  stripComments(readFileSync(fileURLToPath(new URL(`../../../${name}`, import.meta.url)), "utf8"));
const CSS = sheet("index.css");
const MOTION = sheet("motion.ornament.css");
const GATE = "@media (prefers-reduced-motion: no-preference)";

/** The component's source with its comments stripped. Every source-text guard
 *  below reads this rather than the file: the docblock quotes the traps it
 *  avoids — an inline `animation:`, the two measured hex grounds — and a guard a
 *  prose mention can trip is a guard nobody keeps. */
const CODE = readFileSync(BAND, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");

/** The four places the device is worn. */
const SIDES: NotationSide[] = ["band", "top", "bottom", "divider"];

/**
 * THE SIGNATURE OF THE DRAWING, and it is the pool's own source text — the head
 * of `MARKS` exactly as it is written. Not the component's name: #2341's finding
 * is that a name-keyed census is blind to a re-transcription, which is how the
 * praxis card's `DRIFT` row survived two unification rulings. These five marks
 * are the same five characters however they are smuggled.
 */
const POOL_HEAD = '"∫", "∑", "∏", "√", "∮"';

describe("the count is measured, and it is the same arithmetic everywhere", () => {
  it("takes one mark per 52px, which is the owner's halving of the design's 26", () => {
    // 676 = 13 x 52, the page masthead's own neighbourhood.
    expect(markCount(676)).toBe(13);
    // 416 = 8 x 52, the card's. A `/ 26` renders 26 and 16 here.
    expect(markCount(416)).toBe(8);
    expect(markCount(690)).toBe(13); // rounds down
    expect(markCount(702)).toBe(14); // rounds up
  });

  it("floors at seven so a phone card is a band and not a row of bullets", () => {
    // 260px / 52 is exactly 5.
    expect(markCount(260)).toBe(7);
    expect(markCount(1)).toBe(7);
  });

  it("ceilings at the pool's own size, so no band outruns the draw", () => {
    expect(markCount(30_000)).toBe(34);
    expect(drawNotation("any")).toHaveLength(34);
  });

  it("draws nothing at all before it has been measured", () => {
    // Not the floor: a band that paints seven marks and then jumps to thirteen
    // is the twitch the seeding exists to remove, arriving by another door.
    // It is also why every assertion in this file that could have been made
    // against markup is made against `drawNotation` instead.
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
    // #2230's acceptance is a screenshot comparison nobody in this harness can
    // take: "identical between captures". This is that claim, at the seam.
    expect(row("praxis:41:divider")).toEqual(row("praxis:41:divider"));
  });

  it("hands three neighbouring surfaces three different rows", () => {
    // "Rows differ from each other" — three task cards side by side. The fixed
    // sequence #2230 retired drew all three identically.
    const rows = ["task:1:top", "task:2:top", "task:3:top"].map((seed) => row(seed).join(""));
    expect(new Set(rows).size).toBe(3);
  });

  it("folds the side in, so the two strips bracketing one button differ", () => {
    // Folded inside the component, not at the call site, so no mount can forget
    // it: the composer and the praxis card both draw `praxis:${id}`.
    expect(row("task:41:top")).not.toEqual(row("task:41:bottom"));
    expect(row("praxis:41:top")).not.toEqual(row("praxis:41:divider"));
  });

  it("varies the size across the whole 11/13/15/17 cycle", () => {
    // A draw that only varied the glyph would still pass every test above; the
    // spread is what makes the row read as a hand rather than a font sample.
    const sizes = new Set(drawNotation("task:7").map((mark) => mark.size));
    expect([...sizes].sort((a, b) => a - b)).toEqual([11, 13, 15, 17]);
  });

  it("draws the fade PER MARK, inside the design's peak and phase ranges", () => {
    // #2230: "a fade, seeded per mark so neighbours do not breathe together".
    // A strided phase would march a wave down the row and one shared phase would
    // pulse the band as a block; both would pass every other test here.
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
    // The draw takes no count — the band slices it — which is what makes the
    // narrow row a PREFIX of the wide one. A `drawNotation(seed, n)` that
    // reseeded per length would break this and nothing else.
    const full = drawNotation("task:9");
    const narrow = full.slice(0, markCount(260));
    const wide = full.slice(0, markCount(676));
    expect(narrow).toHaveLength(7);
    expect(wide).toHaveLength(13);
    expect(wide.slice(0, narrow.length)).toEqual(narrow);
  });

  it("holds no randomness of its own", () => {
    // `Math.random()` anywhere in this module is the failure the seed exists to
    // prevent, and it would pass every other assertion in this file. Comments
    // are stripped first: the docblock names the trap it avoids, and a guard a
    // prose mention can trip is a guard nobody keeps.
    expect(CODE).not.toContain("Math.random");
  });
});

describe("one drawing at four mounts (#2230)", () => {
  const opened = (side: NotationSide): string => {
    const html = renderToStaticMarkup(<EphemeristsNotationBand seed="task:41" side={side} />);
    return html.slice(0, html.indexOf(">"));
  };

  it("spreads `space-between` at EVERY side, which is the whole of the issue", () => {
    // The masthead band was the wide even row and the CTA strip was the cramped
    // one. There is no variant left that can bring `flex: auto` back.
    for (const side of SIDES) expect(opened(side), side).toContain("justify-content:space-between");
  });

  it("names its side, so the stylesheet can offset it", () => {
    for (const side of SIDES) expect(opened(side), side).toContain(`data-eph-runes="${side}"`);
  });

  it("rules only the masthead in brass, and only the masthead reads the band ink", () => {
    // #2230 makes the rules a property of WHERE IT SITS. The ink goes with them
    // and is not a second knob: `-plate-band` is #12151f and does not flip, so
    // the sheet's `-plate-quiet` (#3a4257 by day) would be ~1.4:1 on it.
    expect(opened("band")).toContain("border-top:1px solid var(--faction-ephemerists-plate-brass-rule)");
    expect(opened("band")).toContain("3px double var(--faction-ephemerists-plate-brass-rule)");
    expect(opened("band")).toContain("color:var(--faction-ephemerists-plate-band-ink)");
    for (const side of ["top", "bottom", "divider"] as const) {
      expect(opened(side), side).not.toContain("brass-rule");
      expect(opened(side), side).toContain("color:var(--faction-ephemerists-plate-quiet)");
    }
  });

  it("fills its container at every mount, and insets at none (#2724)", () => {
    // The device carries neither an inset nor a bleed: the CONTAINER decides
    // the width. Under #2312 a mount inside a padded box bled itself back out
    // to the border box; #2724 retires that — a rune row is the width of the
    // thing above it, and the inset belongs to the surface's content column.
    for (const side of SIDES) {
      expect(opened(side), side).toContain("width:100%");
      expect(opened(side), side).not.toContain("calc(100% -");
      expect(opened(side), side).not.toContain("* -1)");
    }
  });

  it("is decoration, and carries no reachable text", () => {
    // Thirty-four mathematical symbols read aloud between a brief and its
    // sign-up button would be worse than useless.
    for (const side of SIDES) {
      const html = renderToStaticMarkup(<EphemeristsNotationBand seed="task:41" side={side} />);
      expect(html, side).toContain('aria-hidden="true"');
      expect(html, side).not.toContain("aria-label");
      expect(html, side).not.toContain("sr-only");
    }
  });

  it("declares no animation inline — the stylesheets own the motion", () => {
    // #911's rule, and the reason the reduced-motion gate below can exist at
    // all: an inline `animation:` is outside every media query. Asserted on the
    // SOURCE as well as the markup, because the markup is empty until measured
    // and an unmeasured row would pass this vacuously.
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
    // #2073's split. A late `@keyframes` shifts no layout and flashes nothing;
    // the row simply begins moving a beat later.
    expect(MOTION).toContain("@keyframes eph-rune-shift");
    expect(MOTION).toContain("@keyframes eph-rune-turn");
    expect(CSS).not.toContain("@keyframes eph-rune-");
  });

  it("adds both animations only under `prefers-reduced-motion: no-preference`", () => {
    // Written the design's way round — the animation unconditional and the
    // shimmer's trough as the base — a reader who asked for less motion gets a
    // row that is not there at all, since #2725 dropped that trough to zero.
    const gated = ruleBodies(MOTION, GATE).join("\n");
    expect(ruleBodies(gated, ".eph-rune").join("\n")).toContain("animation: eph-rune-shift");
    expect(ruleBodies(gated, ".eph-rune > span").join("\n")).toContain("animation: eph-rune-turn");
    const ungated = MOTION.split(GATE)[0];
    expect(ungated, "an ungated `.eph-rune` animation").not.toMatch(/\.eph-rune[^}]*animation:/);
  });

  it("cuts the frame at ZERO opacity — the turn is exactly twice the shimmer (#2725)", () => {
    // THE SEAM #2725 turns on, and the only place it can be checked without a
    // person watching a row for fifteen seconds. The swap used to land while a
    // mark was LIT: a shimmer that bottomed out at 0.16 and never went dark,
    // against a turn whose 9.4s was picked to be COPRIME with the shimmer's
    // 5.2s. Both halves are asserted, because either one alone puts the cut
    // back in the light:
    //
    //  • the shimmer's trough is 0, and it sits at 0%/100% — the cycle boundary
    //    is the only phase the turn's own cuts can be aligned to;
    //  • the turn's period is EXACTLY twice the shimmer's, so its two cut points
    //    (the 0%/100% wrap and 50%) land on a trough at every repeat, forever.
    //
    // Both animations read `--epg-delay`, which carries the alignment to every
    // mark whatever its phase: at delay d the troughs fall at d + 5.2k and the
    // cuts fall at d + 5.2k as well.
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

    // The cut points themselves, and the shared phase that carries them.
    for (const name of ["eph-rune-turn", "eph-rune-turn-back"]) {
      expect(ruleBodies(MOTION, `@keyframes ${name}`).join(""), name).toMatch(/50%,\s*100%/);
    }
    for (const selector of [".eph-rune", ".eph-rune > span"]) {
      expect(ruleBodies(gated, selector).join("\n"), selector).toContain("--epg-delay");
    }
  });

  it("leaves a stilled row whole and legible", () => {
    // The base state IS the stilled state: `opacity: var(--epg-op)` on the mark
    // and frame one showing in it. Both must be in the BLOCKING sheet — a viewer
    // who never receives the deferred one has to land in the reduced-motion
    // frame rather than on an empty strip.
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
    // The strip's 9/10/11px `nth-child` cycle and its `flex: auto` are what made
    // the CTA row cramped and even where the masthead's was spread and varied.
    // The draw carries the size now, so a selector saying it again would be a
    // second opinion about the same mark.
    expect(CSS).not.toContain(".eph-rune:nth-child");
    expect(ruleBodies(CSS, ".eph-rune").join("\n")).not.toContain("flex:");
    expect(ruleBodies(CSS, ".eph-rune").join("\n")).not.toContain("font-size");
  });
});

describe("it is drawn ONCE — keyed on the drawing, not the name (#2230, #2341)", () => {
  /** Every source file under `src/`, tests excluded. */
  const files: [string, string][] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "__tests__") continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name)) files.push([full, readFileSync(full, "utf8")]);
    }
  };
  walk(SRC);

  it("declares the mark pool in exactly one file", () => {
    // THE guard #2230 asks for. `DRIFT` was a 32-mark array on `.epg-glyph` in
    // the praxis card and it answered to no component name, which is why it
    // outlived #2210 and #2067 and needed #2312 to find it. A pool is the one
    // thing a transcription cannot leave behind.
    const found = files.filter(([, source]) => source.includes(POOL_HEAD)).map(([path]) => path);
    expect(found).toEqual([BAND]);
  });

  it("holds no second copy of the seeded generator", () => {
    // A second PRNG can be tuned in one file and not the other and the drift is
    // invisible — both rows still look random.
    const found = files
      .filter(([, source]) => source.includes("0x6d2b79f5"))
      .map(([path]) => path.slice(SRC.length).replace(/\\/g, "/"));
    expect(found).toEqual(["components/factionMarks/ephemeristsPlate.tsx"]);
  });

  it("leaves no second row breathing on the same two custom properties", () => {
    // `--epg-op` / `--epg-delay` are this motif's peak and phase. Anything else
    // setting them is either this row transcribed or a second device wearing its
    // clock, and both are worth failing on.
    const found = files
      .filter(([path, source]) => path !== BAND && /--epg-(op|delay)/.test(source))
      .map(([path]) => path.slice(SRC.length).replace(/\\/g, "/"));
    expect(found).toEqual([]);
  });

  it("is mounted at the two page headers, the three CTA surfaces and the praxis byline", () => {
    // Six files, seven rows: the task card and the task page each bracket their
    // button with two. `EphemeristsPraxisDetail` gets none — no button to
    // bracket; the field desk paints the plate CTA (it wears `.eph-cta`) but
    // does not bracket it, which is #2067's separate ruling about where the
    // MOTIF lives. A seventh file appearing here is a design decision that
    // should fail rather than land quietly.
    //
    // THE LAW THIS LIST OBEYS is page-versus-card (#2367): a PAGE wears the band
    // in its header — the masthead surfaces, and the faction hero, which heads
    // itself and mounts no masthead — and a CARD wears it at the call to action.
    // `EphemeristsFeedFrame` is the one deliberate absence: it wraps a stream of
    // OTHER players' items, so a faction ornament row there would be the faction
    // stamping itself on content that is not its own.
    const mounts = files
      .filter(([, source]) => source.includes("<EphemeristsNotationBand"))
      .map(([path]) => path.slice(SRC.length).replace(/\\/g, "/"));
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
    // It retired INTO the band (#2230); a file that came back would be the
    // second implementation this issue exists to end.
    expect(files.map(([path]) => path).filter((path) => path.includes("RuneStrip"))).toEqual([]);
  });
});

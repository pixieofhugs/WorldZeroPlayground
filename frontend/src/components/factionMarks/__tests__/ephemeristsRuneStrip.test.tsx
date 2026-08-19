/**
 * THE RUNE STRIP (#2067) — the Ephemerists' glyph motif off the masthead and
 * onto the call to action — HALVED AND SEEDED (#2146).
 *
 * FOUR SEAMS, because the failure modes are in four different places and no one
 * of them can see the others:
 *
 *   • the strip's own RENDERED MARKUP (`renderToStaticMarkup`; this repo has no
 *     jsdom, so effects never run and geometry is out of reach) — the slot
 *     count, the two frames per slot, the two inks, the two per-slot custom
 *     properties, and the fact that it is decoration;
 *   • the DRAW, which is the one piece of arithmetic here. A row that has
 *     quietly stopped varying, or that re-randomises on every render, still
 *     renders perfectly — the owner's ruling is that a screenshot of this
 *     ornament must reproduce, and only a same-seed/different-seed comparison
 *     can hold that;
 *   • the TWO STYLESHEETS, for the reduced-motion gate and for the split. The
 *     design writes the shimmer always-on with `opacity: .16` as the base, which
 *     stills to an unreadable row; the repo's inversion cannot be asserted from
 *     markup, because the markup is identical either way. And since #2146 the
 *     motion lives in the DEFERRED sheet while the resting frame stays in
 *     index.css — a rule that slipped back would put ornament motion on the
 *     critical path;
 *   • the SOURCE TREE, for "drawn once, mounted three times". That is the ruling
 *     this component exists to satisfy, and a transcription into a fourth file
 *     would render perfectly, pass every assertion above, and drift the first
 *     time the strip is redrawn.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../i18n";

const mocks = vi.hoisted(() => ({ formFactor: "desktop" as "mobile" | "desktop" }));

vi.mock("../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));

// Imported after the mock is registered.
import EphemeristsRuneStrip, { drawRunes } from "../EphemeristsRuneStrip";
import EphemeristsTaskCard from "../../taskCard/EphemeristsTaskCard";
import { aTask } from "../../../test/fixtures";
import { ruleBodies, stripComments } from "../../../utils/__tests__/cssVars";

const SRC = fileURLToPath(new URL("../../..", import.meta.url));
const sheet = (name: string): string =>
  stripComments(readFileSync(fileURLToPath(new URL(`../../../${name}`, import.meta.url)), "utf8"));
const CSS = sheet("index.css");
const MOTION = sheet("motion.ornament.css");
const GATE = "@media (prefers-reduced-motion: no-preference)";
const STRIP = fileURLToPath(new URL("../EphemeristsRuneStrip.tsx", import.meta.url));

/** No hex may reach the markup — every colour is a token. */
const HEX = /#[0-9a-fA-F]{3,8}\b/;

/** The head of the design's pool: the signature a transcription cannot lose. */
const SEQUENCE_HEAD = "∇ × Ψ ≡ ∂";

/** Sixteen slots — half of the thirty-two the row marched before #2146. */
const SLOTS = 16;
/** Two marks stacked per slot, which is what lets a slot change at all. */
const FRAMES = 2;

const TASK = aTask({ in_progress_count: 2 });

function card(formFactor: "mobile" | "desktop"): string {
  mocks.formFactor = formFactor;
  return renderToStaticMarkup(
    <MemoryRouter>
      <EphemeristsTaskCard
        task={TASK}
        basePoints={TASK.point_value}
        multiplier={1}
        inProgressCount={TASK.in_progress_count}
        onSignup={() => {}}
      />
    </MemoryRouter>,
  );
}

describe("the rune strip's own drawing (#2067, halved by #2146)", () => {
  const html = renderToStaticMarkup(<EphemeristsRuneStrip side="top" seed="task:41" />);

  it("marches sixteen slots, each holding two marks", () => {
    // Owner, on a screenshot of the CTA: "there are at least twice as many
    // symbols as there should be". Sixteen is the row; the second mark in each
    // slot is the one it turns to and is hidden at rest, so this counts both —
    // a silently truncated row looks plausible at any length.
    expect(html.match(/class="eph-rune"/g)).toHaveLength(SLOTS);
    expect(html.match(/<span><\/?span|<span>./g)).toBeTruthy();
    const marks = [...html.matchAll(/<span>(.)<\/span>/g)].map((match) => match[1]);
    expect(marks).toHaveLength(SLOTS * FRAMES);
  });

  it("draws every mark from the design's own pool", () => {
    // The vocabulary is what survives the seeding — the ORDER was the drawing
    // until #2146 and is now the generator's. The design's replacement pool
    // (seven planetary metals plus eight alchemical signs) is rejected: the
    // alchemical block is U+1F700 and is in no common system font.
    const pool = new Set(SEQUENCE_HEAD.split(" ").concat("∮ ψ Θ ∝ Σ μ ν ⊗ Δ λ ≥ ϖ ∫ ρ Φ ∕ τ · ⟨ ⟩ ‖".split(" ")));
    for (const mark of [...html.matchAll(/<span>(.)<\/span>/g)].map((m) => m[1])) {
      expect(pool.has(mark), mark).toBe(true);
    }
  });

  it("is decoration, and carries no reachable text", () => {
    // Sixteen mathematical symbols read aloud between the brief and the sign-up
    // button would be worse than useless.
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("aria-label");
    expect(html).not.toContain("sr-only");
  });

  it("names its side, so the stylesheet can offset it", () => {
    expect(html).toContain('data-eph-runes="top"');
    expect(
      renderToStaticMarkup(<EphemeristsRuneStrip side="bottom" seed="task:41" />),
    ).toContain('data-eph-runes="bottom"');
  });

  it("paints from tokens only, with every third slot in the caption gold", () => {
    expect(html).not.toMatch(HEX);
    const inks = [...html.matchAll(/color:var\(--faction-ephemerists-plate-(\w+)\)/g)].map(
      (match) => match[1],
    );
    expect(inks).toHaveLength(SLOTS);
    // The cycle runs over the SLOT, not the draw, so the gold stays evenly
    // spread however the seeded marks happen to fall.
    expect(inks.filter((ink) => ink === "caption")).toHaveLength(6);
    expect(new Set(inks)).toEqual(new Set(["caption", "quiet"]));
  });

  it("declares no animation inline — the stylesheets own the motion", () => {
    // #911's rule, and the reason the reduced-motion gate below can exist at
    // all: an inline `animation:` is outside every media query.
    expect(html).not.toContain("animation");
  });

  it("stays inside the design's peak and phase ranges", () => {
    const peaks = [...html.matchAll(/--epg-op:([\d.]+)/g)].map((match) => Number(match[1]));
    const delays = [...html.matchAll(/--epg-delay:([\d.]+)s/g)].map((match) => Number(match[1]));
    expect(peaks).toHaveLength(SLOTS);
    expect(delays).toHaveLength(SLOTS);
    expect(Math.min(...peaks)).toBeGreaterThanOrEqual(0.34);
    expect(Math.max(...peaks)).toBeLessThanOrEqual(0.79);
    expect(Math.min(...delays)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...delays)).toBeLessThanOrEqual(11.5);
  });
});

describe("seeded, and STABLE — the owner's second requirement (#2146)", () => {
  it("draws one row per seed, forever", () => {
    // The whole point of a seed. A row redrawn on every render twitches when a
    // vote lands or a filter moves, and a screenshot of it never reproduces —
    // which is what this epic's visual QA runs on.
    expect(drawRunes("task:41:top")).toEqual(drawRunes("task:41:top"));
    expect(renderToStaticMarkup(<EphemeristsRuneStrip side="top" seed="task:41" />)).toEqual(
      renderToStaticMarkup(<EphemeristsRuneStrip side="top" seed="task:41" />),
    );
  });

  it("draws a different row per surface, and per side of one button", () => {
    // Two identical rows bracketing one button is the "fixed sequence" this
    // replaces, printed twice. The side is folded into the seed inside the
    // component so no mount can forget it.
    expect(drawRunes("task:41:top")).not.toEqual(drawRunes("task:42:top"));
    expect(drawRunes("task:41:top")).not.toEqual(drawRunes("task:41:bottom"));
  });

  it("holds no randomness of its own", () => {
    // `Math.random()` anywhere in this module is the failure the seed exists to
    // prevent, and it would pass every other assertion in this file. Comments
    // are stripped first: this file's own docblock names the trap it avoids,
    // and a guard that a prose mention can trip is a guard nobody keeps.
    const code = readFileSync(STRIP, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");
    expect(code).not.toContain("Math.random");
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
    // Written the design's way round — the animation unconditional and
    // `opacity: .16` as the base — a reader who asked for less motion gets a
    // row at 16% and reads nothing.
    const gated = ruleBodies(MOTION, GATE).join("\n");
    expect(ruleBodies(gated, ".eph-rune").join("\n")).toContain("animation: eph-rune-shift");
    expect(ruleBodies(gated, ".eph-rune > span").join("\n")).toContain("animation: eph-rune-turn");
    const ungated = MOTION.split(GATE)[0];
    expect(ungated, "an ungated `.eph-rune` animation").not.toMatch(/\.eph-rune[^}]*animation:/);
  });

  it("leaves a stilled strip a whole legible row", () => {
    // The base state IS the stilled state: `opacity: var(--epg-op)` on the slot
    // and mark one showing in it. Both must be in the BLOCKING sheet — a viewer
    // who never receives the deferred one has to land in the reduced-motion
    // frame, not on a blank 12px band.
    expect(ruleBodies(CSS, ".eph-rune").join("\n")).toContain("opacity: var(--epg-op");
    expect(ruleBodies(CSS, ".eph-rune > span").join("\n")).toContain("grid-area: 1 / 1");
    expect(ruleBodies(CSS, ".eph-rune > span + span").join("\n")).toContain("opacity: 0");
  });

  it("carries the size cycle, so no site needs a suppression", () => {
    // 9 / 10 / 11 / 9 / 10 per slot. Only 9 and 11 are rungs (--text-sm,
    // --text-md), so inline this would be ornament type off the ramp behind an
    // `eslint-disable` at every site. Three selectors say it in the sheet.
    expect(CSS).toMatch(/\.eph-rune\s*{[^}]*font-size: 9px/);
    expect(CSS).toContain(".eph-rune:nth-child(5n + 3) { font-size: 11px; }");
  });
});

describe("it is drawn once and mounted where a plate CTA is (#2067)", () => {
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

  it("declares the pool in exactly one file", () => {
    // The pool is the sharp half: a copy can be renamed, split up or inlined,
    // and a component-name sweep misses every one of those. These five marks
    // are the same five characters however they are smuggled.
    const found = files.filter(([, source]) => source.includes(SEQUENCE_HEAD)).map(([path]) => path);
    expect(found).toEqual([STRIP]);
  });

  it("holds no second copy of the seeded generator", () => {
    // #2143 wrote it for the notation band; #2146 moved it into the kit on the
    // second reader. A second PRNG can be tuned in one file and not the other
    // and the drift is invisible — both rows still look random.
    const found = files
      .filter(([, source]) => source.includes("0x6d2b79f5"))
      .map(([path]) => path.slice(SRC.length).replace(/\\/g, "/"));
    expect(found).toEqual(["components/factionMarks/ephemeristsPlate.tsx"]);
  });

  it("is mounted on the CTA surfaces and the praxis byline, and no others", () => {
    // #2067's ruling named the three that paint a plate CTA. #2312 adds the
    // FOURTH, and it is the one that brackets nothing: the praxis card's byline
    // divider, where the strip replaces a generic dashed rule rather than
    // framing a button. `EphemeristsComment` reads the same token as an ACCENT
    // rather than as a button; the faction page and the field desk do draw the
    // button (both wear `.eph-cta` since #2146) but neither brackets it — where
    // the MOTIF lives is #2067's separate ruling. A fifth mount appearing here
    // is a design decision that should fail rather than land quietly.
    //
    // The detector reads SOURCE TEXT, so a prose mention counts as a mount. That
    // is deliberate — a re-transcription can be renamed but not un-named — and
    // it is why `praxisCard/desktop/shared.tsx` documents the slot without
    // naming the component.
    const mounts = files
      .filter(([path, source]) => path !== STRIP && source.includes("EphemeristsRuneStrip"))
      .map(([path]) => path.slice(SRC.length).replace(/\\/g, "/"));
    expect(mounts.sort()).toEqual([
      "components/praxisCard/desktop/EphemeristsPraxisCard.tsx",
      "components/taskCard/EphemeristsTaskCard.tsx",
      "pages/editPraxis/archetypes/EphemeristsEditPraxis.tsx",
      "pages/taskDetail/archetypes/EphemeristsTaskDetail.tsx",
    ]);
  });
});

describe("the task card's restrained masthead (#2067)", () => {
  it("brackets the sign-up button with both strips, at both form factors", () => {
    for (const factor of ["desktop", "mobile"] as const) {
      const html = card(factor);
      expect(html, factor).toContain('data-eph-runes="top"');
      expect(html, factor).toContain('data-eph-runes="bottom"');
      // Two strips, not four: `bottom` also has to appear exactly once, or a
      // second CTA block has quietly grown a pair.
      expect(html.match(/data-eph-runes=/g), factor).toHaveLength(2);
    }
  });

  it("no longer marches the registers or crowns the band with the winged disc", () => {
    const html = card("desktop");
    expect(html, "the winged disc's own wing geometry").not.toContain(
      'viewBox="-88 -20 176 40"',
    );
    expect(html, "the band's glyph registers").not.toContain("epg-glyph");
    expect(html, "the registers' own hairlines").not.toContain("M8 24 H332");
  });

  it("grounds the band on the disc, keeps the band ink, and rules it in brass", () => {
    const html = card("desktop");
    const band = html.slice(html.indexOf('data-card-masthead="ephemerists"'));
    const opened = band.slice(0, band.indexOf(">"));
    expect(opened).toContain("background:var(--faction-ephemerists-plate-disc)");
    expect(opened).toContain("color:var(--faction-ephemerists-plate-band-ink)");
    expect(opened).toContain("border:1px solid var(--faction-ephemerists-plate-brass)");
    // `border-box`, or the 2px of border pushes the band wider than the card
    // and the article's `overflow: hidden` shaves the right-hand rule off.
    expect(opened).toContain("box-sizing:border-box");
  });

  it("lets the band find its own height on both form factors", () => {
    // The 110/98 canvas existed for the registers. A size-set field creeping
    // back would pin the band to a number again, and roughly 75px of the ~75px
    // this issue reclaims is exactly that field.
    for (const factor of ["desktop", "mobile"] as const) {
      const band = card(factor);
      const opened = band
        .slice(band.indexOf('data-card-masthead="ephemerists"'))
        .slice(0, 400);
      expect(opened.slice(0, opened.indexOf(">")), factor).not.toMatch(/height:\s*\d/);
    }
  });
});

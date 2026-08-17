/**
 * THE RUNE STRIP (#2067) — the Ephemerists' glyph motif off the masthead and
 * onto the call to action.
 *
 * THREE SEAMS, because the failure modes are in three different places and no
 * one of them can see the others:
 *
 *   • the strip's own RENDERED MARKUP (`renderToStaticMarkup`; this repo has no
 *     jsdom, so effects never run and geometry is out of reach) — the sequence,
 *     the two inks, the two per-instance custom properties, and the fact that it
 *     is decoration;
 *   • `index.css` AS TEXT, for the reduced-motion gate. The design writes the
 *     animation always-on with `opacity: .16` as the base, which stills to an
 *     unreadable row; the repo's inversion cannot be asserted from markup,
 *     because the markup is identical either way;
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
import EphemeristsRuneStrip from "../EphemeristsRuneStrip";
import EphemeristsTaskCard from "../../taskCard/EphemeristsTaskCard";
import { aTask } from "../../../test/fixtures";

const SRC = fileURLToPath(new URL("../../..", import.meta.url));
const CSS = readFileSync(fileURLToPath(new URL("../../../index.css", import.meta.url)), "utf8");
const STRIP = fileURLToPath(new URL("../EphemeristsRuneStrip.tsx", import.meta.url));

/** No hex may reach the markup — every colour is a token. */
const HEX = /#[0-9a-fA-F]{3,8}\b/;

/** The head of the design's sequence: the signature a transcription cannot lose. */
const SEQUENCE_HEAD = "∇ × Ψ ≡ ∂";

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

describe("the rune strip's own drawing (#2067)", () => {
  const html = renderToStaticMarkup(<EphemeristsRuneStrip side="top" />);

  it("marches the design's whole sequence, one span per mark", () => {
    // The issue says "31 spans" and lists 32 marks. The sequence is the drawing
    // and the count is a number written beside it, so the sequence wins — but a
    // silently TRUNCATED row would look plausible at any length, which is why
    // this counts rather than eyeballing.
    expect(html.match(/class="eph-rune"/g)).toHaveLength(32);
    expect(html).toContain("∇");
    expect(html).toContain("ϖ");
  });

  it("is decoration, and carries no reachable text", () => {
    // Thirty-two mathematical symbols read aloud between the brief and the
    // sign-up button would be worse than useless.
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("aria-label");
    expect(html).not.toContain("sr-only");
  });

  it("names its side, so the stylesheet can offset it", () => {
    expect(html).toContain('data-eph-runes="top"');
    expect(renderToStaticMarkup(<EphemeristsRuneStrip side="bottom" />)).toContain(
      'data-eph-runes="bottom"',
    );
  });

  it("paints from tokens only, with every third mark in the caption gold", () => {
    expect(html).not.toMatch(HEX);
    const inks = [...html.matchAll(/color:var\(--faction-ephemerists-plate-(\w+)\)/g)].map(
      (match) => match[1],
    );
    expect(inks).toHaveLength(32);
    expect(inks.filter((ink) => ink === "caption")).toHaveLength(11);
    expect(new Set(inks)).toEqual(new Set(["caption", "quiet"]));
  });

  it("declares no animation inline — the stylesheet owns the motion", () => {
    // #911's rule, and the reason the reduced-motion gate below can exist at
    // all: an inline `animation:` is outside every media query.
    expect(html).not.toContain("animation");
  });

  it("stays inside the design's peak and phase ranges", () => {
    const peaks = [...html.matchAll(/--epg-op:([\d.]+)/g)].map((match) => Number(match[1]));
    const delays = [...html.matchAll(/--epg-delay:([\d.]+)s/g)].map((match) => Number(match[1]));
    expect(peaks).toHaveLength(32);
    expect(delays).toHaveLength(32);
    expect(Math.min(...peaks)).toBeCloseTo(0.34);
    expect(Math.max(...peaks)).toBeCloseTo(0.79);
    expect(Math.min(...delays)).toBe(0);
    expect(Math.max(...delays)).toBeCloseTo(11.5);
  });
});

describe("index.css owns the shimmer, and opting in is the point", () => {
  it("declares the keyframe", () => {
    expect(CSS).toContain("@keyframes eph-rune-shift");
  });

  it("adds the animation only under `prefers-reduced-motion: no-preference`", () => {
    // The whole gate: every `.eph-rune` rule carrying `animation` must sit
    // inside a no-preference block. Written the design's way round — the
    // animation unconditional and `opacity: .16` as the base — a reader who
    // asked for less motion gets a row at 16% and reads nothing.
    const gated = CSS.slice(CSS.indexOf("@keyframes eph-rune-shift"));
    const blocks = gated.split("@media (prefers-reduced-motion: no-preference)");
    expect(blocks[0], "an ungated `.eph-rune` animation").not.toMatch(
      /\.eph-rune[^}]*animation:/,
    );
    expect(blocks[1], "the gated rule").toMatch(/\.eph-rune\s*{[^}]*animation: eph-rune-shift/);
  });

  it("leaves a stilled strip visible at its own peak", () => {
    // The base state IS the stilled state. `opacity: var(--epg-op)` outside the
    // media query is what makes a reduced-motion strip a static row of marks
    // rather than a blank 12px band.
    expect(CSS).toMatch(/\.eph-rune\s*{[^}]*opacity: var\(--epg-op/);
  });

  it("carries the size cycle, so no site needs a suppression", () => {
    // 9 / 10 / 11 / 9 / 10 per mark. Only 9 and 11 are rungs (--text-sm,
    // --text-md), so inline this would be ornament type off the ramp behind an
    // `eslint-disable` at 32 sites. Three selectors say it in the sheet instead.
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

  it("declares the sequence in exactly one file", () => {
    // The sequence is the sharp half: a copy can be renamed, split up or
    // inlined, and a component-name sweep misses every one of those. These
    // five marks are the same five characters however they are smuggled.
    const found = files.filter(([, source]) => source.includes(SEQUENCE_HEAD)).map(([path]) => path);
    expect(found).toEqual([STRIP]);
  });

  it("is mounted on the three surfaces that paint the plate CTA, and no others", () => {
    // The owner's ruling names these three. `EphemeristsComment` reads the same
    // token as an ACCENT rather than as a button, and `EphemeristsPraxisDetail`
    // has no button at all — neither is a mount, and a fourth one appearing
    // here is a design decision that should fail rather than land quietly.
    const mounts = files
      .filter(([path, source]) => path !== STRIP && source.includes("EphemeristsRuneStrip"))
      .map(([path]) => path.slice(SRC.length).replace(/\\/g, "/"));
    expect(mounts.sort()).toEqual([
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

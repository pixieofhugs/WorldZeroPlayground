/**
 * THE ENGRAVED MASTHEAD (#1634), and the COLOPHON that #2143 split off it.
 *
 * The seam is the components' rendered markup given props — neither has any
 * behaviour, so what can be wrong about them is what they emit. The claims worth
 * a test rather than an eyeball, and the first two are the ones a screenshot
 * would pass:
 *
 *  • THE TWO SCALES MUST DIFFER. `page` and `card` are one prop apart and every
 *    value in both tables is a `var()`, so a table typo renders a perfectly
 *    plausible masthead at the wrong size on half the surfaces. Pin the sigil's
 *    emitted box, which is a NUMBER and therefore the one thing here a
 *    stylesheet cannot silently absorb.
 *  • THE CLOSING SIGIL MUST TAKE THE REDUCED CUT. Both inline sizes (14 and 12)
 *    sit under #1635's 20px threshold, so the mark must arrive without its
 *    crossed axes. A full cut at 12px still renders — as a smudge — which is
 *    exactly what no markup assertion catches unless it counts.
 *  • THE COORDINATES ARE FIXED, THE DATE IS THE SURFACE'S, AND THEY ARE NOW
 *    LABELLED. The easter egg is only an egg if both cells point at the same
 *    real place on every surface. #2124 then reversed the "never label it" half:
 *    a bare coordinate pair reads as belonging to whatever byline is near it, so
 *    the line must name the PLATE as whose station it is. An unlabelled
 *    provenance line is the defect that issue was filed about.
 *  • AND THE COORDINATES MUST HAVE LEFT THE MASTHEAD. The whole of #2124's fix
 *    is placement; a masthead that still prints them has moved nothing.
 *
 * SSR-only harness (renderToStaticMarkup, no DOM, effects never run) — which is
 * why the notation band renders EMPTY here and is tested at its own arithmetic
 * in `ephemeristsNotationBand.test.tsx`.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../../i18n";
import { EphemeristsColophon, EphemeristsMasthead } from "../EphemeristsMasthead";

/** The v2 kite's opening move — the swept sail, first of its six shapes. */
const SAIL = "M19.1 30.8";
const render = (scale: "page" | "card") =>
  renderToStaticMarkup(<EphemeristsMasthead slug="ephemerists" scale={scale} seed="task:1" />);
const colophon = (scale: "page" | "card", date?: string | null) =>
  renderToStaticMarkup(<EphemeristsColophon scale={scale} date={date} />);

describe("EphemeristsMasthead — the two scales", () => {
  it("hands the sigil one number and gets a square box back at each scale", () => {
    // Sigil Studies v2 draws the kite square. It used to hand back the design's
    // 486:560 frame (54x62 and 38x44), which is what made these two mounts one
    // prop apart; they are still one prop apart, and now they are square.
    expect(render("page")).toContain('width="62" height="62"');
    expect(render("card")).toContain('width="44" height="44"');
  });

  it("carries the wordmark at a different rung on each scale", () => {
    expect(render("page")).toContain("font-size:var(--text-title)");
    expect(render("card")).toContain("font-size:var(--text-content)");
  });

  it("draws ONE mark, because the second one left with the datum row", () => {
    // #2143 moved the datum row and its closing sigil to the foot of the sheet.
    // Two marks in a masthead now means the colophon has been mounted inside it.
    for (const scale of ["page", "card"] as const) {
      expect(render(scale).match(new RegExp(SAIL, "g")) ?? []).toHaveLength(1);
    }
  });
});

describe("EphemeristsMasthead — the notation band", () => {
  const html = render("page");

  it("keeps the datum row's two brass rules, which the band inherits", () => {
    expect(html).toContain("border-top:1px solid var(--faction-ephemerists-plate-brass-rule)");
    expect(html).toContain("border-bottom:3px double var(--faction-ephemerists-plate-brass-rule)");
  });

  it("opens the datum row's lead from 5px to 9px", () => {
    // The ruled asymmetry only works if the rules clear the marks' ascenders
    // and descenders; `var(--space-sm)` (8px) is the value this replaced and is
    // what a well-meaning tokenizing pass would put back.
    expect(html).toContain("padding:9px 0");
  });

  it("hides the band from assistive technology entirely", () => {
    // The marks are ornament with no reading. A screen reader spelling out
    // "integral, sum, therefore" on every Ephemerists surface is noise.
    expect(html).toMatch(/aria-hidden="true"[^>]*style="display:flex;align-items:baseline/);
  });

  it("prints no coordinate at all — they left for the foot of the sheet", () => {
    for (const scale of ["page", "card"] as const) {
      expect(render(scale)).not.toContain("8ʰ 13ᵐ");
      expect(render(scale)).not.toContain("+44° 03′");
    }
  });
});

describe("EphemeristsColophon — the plate's provenance", () => {
  it("points both coordinates at one place, at both scales", () => {
    // 44.0534 N / 123.3704 W — the fairgrounds. Never varied.
    for (const scale of ["page", "card"] as const) {
      expect(colophon(scale, "2026-08-02T09:00:00Z")).toContain("8ʰ 13ᵐ");
      expect(colophon(scale, "2026-08-02T09:00:00Z")).toContain("+44° 03′");
    }
  });

  it("names whose station it is, so it cannot read as the author's position", () => {
    // #2124's whole ruling: the value is a constant and leaks nothing, but a
    // bare coordinate pair beside a byline reads as belonging to that byline.
    // A regression that drops the label is invisible to every other assertion
    // in this file, because the figures would still be right.
    // Both keys, because the dated one opens with the striking and the undated
    // one opens with the station — the label may not be a casualty of the
    // branch that drops the date.
    for (const html of [colophon("page", "2026-08-02T09:00:00Z"), colophon("card")]) {
      expect(html).toMatch(/[Ss]tation of the Ephemerists/);
    }
  });

  it("prints the surface's own date and drops the clause when there is none", () => {
    expect(colophon("page", "2026-08-02T09:00:00Z")).toContain("2026");
    expect(colophon("page")).not.toContain("2026");
    expect(colophon("page", null)).not.toContain("2026");
  });

  it("prints nothing rather than 'Invalid Date' for a timestamp it cannot read", () => {
    // The owner's ruling is that the date is REAL or the clause is absent, and
    // `formatDate` renders an unparseable value as that literal string — an
    // invention, on the one line a player would read as data.
    for (const bad of ["", "not a date"]) {
      expect(colophon("page", bad)).not.toContain("Invalid Date");
    }
  });

  it("closes with the datum row's own mark, at its own inline size", () => {
    expect(colophon("page")).toContain('width="14" height="14"');
    expect(colophon("card")).toContain('width="12" height="12"');
  });

  it("takes the SHEET's inks, not the band's", () => {
    // §3: a component's inks belong to the sheet they were measured on, and
    // this one left the compass blue. `-plate-gold` reads 1.02:1 on the vellum
    // and `-plate-band-ink` was never measured on a sheet at all.
    const html = colophon("page", "2026-08-02T09:00:00Z");
    expect(html).toContain("--faction-ephemerists-plate-quiet");
    expect(html).toContain("--faction-ephemerists-plate-brass)");
    expect(html).not.toContain("--faction-ephemerists-plate-gold");
    expect(html).not.toContain("--faction-ephemerists-plate-band-ink");
  });
});

/**
 * THE REGISTER IS GONE (#1909), and this block is what says so.
 *
 * It used to assert the four kanji and their glossed `title=`. All EIGHT of its
 * strings are on the copy audit's CUT list — the marks AND the English — because
 * no other faction had a register row and the audit ruled the masthead a shared
 * surface. Kept as an ABSENCE rather than deleted: the way a faction-only band
 * comes back onto a settled surface is a later voice pass, and only a negative
 * assertion can fail on that.
 */
describe("EphemeristsMasthead — the register, deleted", () => {
  const html = render("page");

  it("sets no kanji, at either scale", () => {
    for (const mark of ["星", "暦", "観", "録"]) {
      expect(html).not.toContain(mark);
      expect(render("card")).not.toContain(mark);
    }
  });

  it("carries no glossed abbreviation at all", () => {
    expect(html).not.toContain('class="eph-gloss"');
    expect(html).not.toContain("</abbr>");
  });
});

describe("EphemeristsMasthead — ink", () => {
  it("hardcodes no colour", () => {
    const html = render("card");
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    // The retired illuminated-codex family may never reach a plate surface.
    expect(html).not.toMatch(/--eph-[a-z]/);
    // Every ink is a band-measured token; nothing on the band flips with the
    // theme, and #2141 narrowed the reason without changing the fact.
    expect(html).toContain("--faction-ephemerists-plate-band-ink");
    expect(html).toContain("--faction-ephemerists-plate-brass-rule");
  });
});

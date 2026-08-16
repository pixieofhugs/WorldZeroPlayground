/**
 * THE ENGRAVED MASTHEAD (#1634).
 *
 * The seam is the component's rendered markup given props — a masthead has no
 * behaviour, so what can be wrong about it is what it emits. Four claims are
 * worth a test rather than an eyeball, and the first two are the ones a
 * screenshot would pass:
 *
 *  • THE TWO SCALES MUST DIFFER. `page` and `card` are one prop apart and every
 *    value in both tables is a `var()`, so a table typo renders a perfectly
 *    plausible masthead at the wrong size on half the surfaces. Pin the sigil's
 *    emitted box, which is a NUMBER and therefore the one thing here a
 *    stylesheet cannot silently absorb.
 *  • THE DATUM ROW'S INLINE SIGIL MUST TAKE THE REDUCED CUT. Both inline sizes
 *    (14 and 12) sit under #1635's 20px threshold, so the mark must arrive
 *    without its crossed axes. A full cut at 12px still renders — as a smudge —
 *    which is exactly what no markup assertion catches unless it counts.
 *  • THE COORDINATES ARE FIXED AND THE DATE IS THE SURFACE'S. The easter egg is
 *    only an egg if both cells point at the same real place on every surface;
 *    the moment one of them starts varying it is decoration again.
 *  • EVERY KANJI CARRIES ITS ENGLISH. The row is unreadable to most players by
 *    design, and `title` is the whole of the reveal (#1637).
 *
 * SSR-only harness (renderToStaticMarkup, no DOM, effects never run).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../../i18n";
import { EphemeristsMasthead } from "../EphemeristsMasthead";

const AXIS_H = "M100 272 L392 272";
const render = (scale: "page" | "card", date?: string | null) =>
  renderToStaticMarkup(<EphemeristsMasthead slug="ephemerists" scale={scale} date={date} />);

describe("EphemeristsMasthead — the two scales", () => {
  it("hands the sigil one number and gets the design's frame back at each scale", () => {
    expect(render("page")).toContain('width="54" height="62"');
    expect(render("card")).toContain('width="38" height="44"');
  });

  it("draws the datum row's closing sigil at its own inline size, below the reduced cut", () => {
    expect(render("page")).toContain('width="12" height="14"');
    expect(render("card")).toContain('width="10" height="12"');
    // One kite each — the full cut's crossed axes would be a smear at 12-14px.
    for (const scale of ["page", "card"] as const) {
      expect(render(scale).match(new RegExp(AXIS_H, "g")) ?? []).toHaveLength(1);
    }
  });

  it("carries the wordmark at a different rung on each scale", () => {
    expect(render("page")).toContain("font-size:var(--text-title)");
    expect(render("card")).toContain("font-size:var(--text-content)");
  });
});

describe("EphemeristsMasthead — the datum row", () => {
  it("prints the surface's own date and leaves the cell empty when there is none", () => {
    expect(render("page", "2026-08-02T09:00:00Z")).toContain("2026");
    expect(render("page")).not.toContain("2026");
    expect(render("page", null)).not.toContain("2026");
  });

  it("prints nothing rather than 'Invalid Date' for a timestamp it cannot read", () => {
    // The owner's ruling is that the date is REAL or the cell is empty, and
    // `formatDate` renders an unparseable value as that literal string — an
    // invention, on the one row a player would read as data.
    for (const bad of ["", "not a date"]) {
      expect(render("page", bad)).not.toContain("Invalid Date");
    }
  });

  it("points both coordinates at one place, on every surface and both scales", () => {
    // 44.0534 N / 123.3704 W — the fairgrounds. Never labelled, never varied.
    for (const scale of ["page", "card"] as const) {
      expect(render(scale)).toContain("8ʰ 13ᵐ");
      expect(render(scale)).toContain("+44° 03′");
    }
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

  it("still rules the datum row off, top and bottom", () => {
    // The register carried the design's 1px + 3px-double band; those rules moved
    // to the datum row rather than leaving with the copy.
    expect(html).toContain("3px double");
  });
});

describe("EphemeristsMasthead — ink", () => {
  it("hardcodes no colour and no raw size", () => {
    const html = render("card", "Aug 2, 2026");
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    // The retired illuminated-codex family may never reach a plate surface.
    expect(html).not.toMatch(/--eph-[a-z]/);
    // Every ink is a band-measured token; nothing here flips with the theme.
    expect(html).toContain("--faction-ephemerists-plate-band-ink");
    expect(html).toContain("--faction-ephemerists-plate-band-quiet");
  });
});

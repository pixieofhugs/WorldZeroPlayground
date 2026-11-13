/**
 * The engraved masthead (#1634) and its colophon (#2143). Pinned: the two
 * scales differ (a table typo would still render plausibly); the coordinates
 * are fixed, labelled as the station's (#2124), and absent from the masthead.
 * The notation band renders empty under SSR; see its own suite.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../../i18n";
import { EphemeristsColophon, EphemeristsMasthead } from "../EphemeristsMasthead";

/** The v2 kite's first path. */
const SAIL = "M19.1 30.8";
const render = (scale: "page" | "card") =>
  renderToStaticMarkup(<EphemeristsMasthead slug="ephemerists" scale={scale} seed="task:1" />);
const colophon = (scale: "page" | "card", date?: string | null) =>
  renderToStaticMarkup(<EphemeristsColophon scale={scale} date={date} />);

describe("EphemeristsMasthead — the two scales", () => {
  it("hands the sigil one number and gets a square box back at each scale", () => {
    expect(render("page")).toContain('width="62" height="62"');
    expect(render("card")).toContain('width="44" height="44"');
  });

  it("carries the wordmark at a different rung on each scale", () => {
    expect(render("page")).toContain("font-size:var(--text-title)");
    expect(render("card")).toContain("font-size:var(--text-content)");
  });

  it("draws ONE mark, because the second one left with the datum row", () => {
    // Two would mean the colophon got mounted inside it.
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

  it("hides the band from assistive technology entirely", () => {
    expect(html).toContain('aria-hidden="true"');
  });

});

describe("EphemeristsColophon — the plate's provenance", () => {
  it("points both coordinates at one place, at both scales", () => {
    for (const scale of ["page", "card"] as const) {
      expect(colophon(scale, "2026-08-02T09:00:00Z")).toContain("8ʰ 13ᵐ");
      expect(colophon(scale, "2026-08-02T09:00:00Z")).toContain("+44° 03′");
    }
  });

  it("names whose station it is, so it cannot read as the author's position", () => {
    // #2124. Both keys: the label must survive the undated branch too.
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
    for (const bad of ["", "not a date"]) {
      expect(colophon("page", bad)).not.toContain("Invalid Date");
    }
  });

  it("closes with the datum row's own mark, at its own inline size", () => {
    expect(colophon("page")).toContain('width="14" height="14"');
    expect(colophon("card")).toContain('width="12" height="12"');
  });

  it("takes the SHEET's inks, not the band's", () => {
    // §3: `-plate-gold` is 1.02:1 on the vellum.
    const html = colophon("page", "2026-08-02T09:00:00Z");
    expect(html).toContain("--faction-ephemerists-plate-quiet");
    expect(html).toContain("--faction-ephemerists-plate-brass)");
    expect(html).not.toContain("--faction-ephemerists-plate-gold");
    expect(html).not.toContain("--faction-ephemerists-plate-band-ink");
  });
});

/** The kanji register was cut (#1909); only a negative assertion catches a revival. */
describe("EphemeristsMasthead — the register, deleted", () => {
  const html = render("page");

  it("carries no glossed abbreviation at all", () => {
    expect(html).not.toContain('class="eph-gloss"');
    expect(html).not.toContain("</abbr>");
  });
});

describe("EphemeristsMasthead — ink", () => {
  it("hardcodes no colour", () => {
    const html = render("card");
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    // Retired colour family.
    expect(html).not.toMatch(/--eph-[a-z]/);
    expect(html).toContain("--faction-ephemerists-plate-band-ink");
    expect(html).toContain("--faction-ephemerists-plate-brass-rule");
  });
});

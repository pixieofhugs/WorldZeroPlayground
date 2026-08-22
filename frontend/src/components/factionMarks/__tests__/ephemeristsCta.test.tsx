/**
 * THE PLATE CTA (#2146) — one control, and it INVERTS across the themes.
 *
 * Blue ground carrying a brass label by day; brass ground carrying the blue
 * after dark. The two token values were settled by #2141 and only trade places,
 * so what this issue actually decides is the ENCLOSURE — `2px` of the faction's
 * rule brass in light, `1px` of the mark brass in dark — and the fact that one
 * definition serves every surface instead of each restating it.
 *
 * THREE SEAMS, and the first one is the whole point:
 *
 *  • `index.css` AS TEXT. A border that changes WIDTH between the cascades
 *    cannot be written inline without a `dark ? a : b` ternary, which is the
 *    one thing the repo's colour rule forbids outright. So the control is a
 *    class, and the class is the only place the flip is readable — markup shows
 *    the same `class="eph-cta"` in both themes.
 *  • The task card's RENDERED BUTTON, which is the definition's first consumer:
 *    it wears the class and restates none of the three properties inline, since
 *    an inline value beats the class and would silently pin the light half in
 *    both themes.
 *  • The SOURCE TREE, as a named census (#2090's rule — a count is what lets a
 *    wrong mount pass). Four Ephemerists surfaces draw a bordered plate CTA and
 *    all four must wear it; a fifth appearing here is a design decision that
 *    should fail rather than land quietly.
 *
 * The card's GROUND rides along, because it is drawn in this file's card and
 * nowhere else a CTA suite would look: #2144's chart net at 0.10 held the mount
 * until #2195 ruled one ornament per faction, and the gravity field took it.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../i18n";

vi.mock("../../../hooks/useFormFactor", () => ({ useFormFactor: () => "desktop" }));

import EphemeristsTaskCard from "../../taskCard/EphemeristsTaskCard";
import { aTask } from "../../../test/fixtures";
import { ruleBodies, stripComments } from "../../../utils/__tests__/cssVars";

const SRC = fileURLToPath(new URL("../../..", import.meta.url));
const CSS = stripComments(
  readFileSync(fileURLToPath(new URL("../../../index.css", import.meta.url)), "utf8"),
);

const TASK = aTask({ description: "Chart the pole nobody has fixed." });

function card(): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <EphemeristsTaskCard
        task={TASK}
        basePoints={TASK.point_value}
        multiplier={1}
        inProgressCount={0}
        onSignup={() => {}}
      />
    </MemoryRouter>,
  );
}

/** The opening tag of the one element carrying `class`. */
function opened(html: string, marker: string): string {
  const at = html.indexOf(marker);
  expect(at, marker).toBeGreaterThan(-1);
  const from = html.lastIndexOf("<", at);
  return html.slice(from, html.indexOf(">", at));
}

describe("index.css owns the control, because the border flips (#2146)", () => {
  it("paints the light half: the blue ground, the brass label, a 2px rule", () => {
    const [light] = ruleBodies(CSS, ".eph-cta");
    expect(light).toContain("background: var(--faction-ephemerists-plate-cta-bg)");
    expect(light).toContain("color: var(--faction-ephemerists-plate-cta-ink)");
    expect(light).toContain("border: 2px solid var(--faction-ephemerists-plate-brass-rule)");
  });

  it("swaps the enclosure after dark — 1px of the mark brass", () => {
    // The ground and the ink swap themselves: both tokens are theme-scoped and
    // only trade places (#2141). The WIDTH is what no token can carry, and it
    // is why this class exists at all.
    const [dark] = ruleBodies(CSS, '[data-theme="dark"] .eph-cta');
    expect(dark).toContain("border: 1px solid var(--faction-ephemerists-plate-brass)");
  });

  it("names no colour of its own", () => {
    expect(ruleBodies(CSS, ".eph-cta").join("\n")).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe("the task card is the definition's first consumer", () => {
  const html = card();

  it("wears the class exactly once — one control, not two", () => {
    expect(html.match(/class="eph-cta"/g)).toHaveLength(1);
  });

  it("restates none of the three properties inline", () => {
    // An inline value beats the class, so a leftover `background` or `border`
    // here would pin the light half in BOTH cascades and the inversion would
    // silently stop happening on this surface only.
    const tag = opened(html, 'class="eph-cta"');
    expect(tag, "the ground").not.toMatch(/background:/);
    expect(tag, "the enclosure").not.toMatch(/border:/);
    expect(tag, "the ink").not.toMatch(/[;"]color:/);
  });

  it("closes the leaf on the notation band's own rule, in the rule brass", () => {
    // §4: the same `1px` / `3px double` pair `EphemeristsNotationBand` opens the
    // masthead with, so the sheet opens and closes on one mark. It was two
    // hairlines in `-plate-brass`, which is the MARK brass and a heavier line
    // than a closing rule wants.
    const tag = opened(html, 'data-cta-rule="ephemerists"');
    expect(tag).toContain("border-top:1px solid var(--faction-ephemerists-plate-brass-rule)");
    expect(tag).toContain("border-bottom:3px double var(--faction-ephemerists-plate-brass-rule)");
  });

  it("grounds the plate on the GRAVITY FIELD, not the chart net (#2398)", () => {
    // This assertion is a REVERSAL, deliberately. #2144 gave the net three
    // weights and this card took the card weight of 0.10 — then #2195 ruled
    // that a faction has ONE ornament and that where it is not worn the ground
    // is BARE, never a substitute pattern. The Ephemerists' ornament is the
    // gravity field, and the net is the PAGE's drawing, so a card standing on
    // an Ephemerists page ground was wearing the same mark twice.
    //
    // The net's card weight is NOT retired with this mount:
    // `EphemeristsSelectCard` still draws it at 0.10, and `ephemerisNet`'s own
    // suite pins the weight itself. The alternation is
    // `ephemeristsGravityAlternation.test.tsx`; what is held here is only that
    // this card's ground is the field.
    expect(html).toContain('preserveAspectRatio="xMaxYMin slice"');
    expect(html).toContain('d="M-6 ');
    expect(html).not.toContain('viewBox="0 0 1000 600"');
  });

  it("isolates the plate, so the ground paints over the fill and under the chrome", () => {
    // `isolation: isolate` settles the card's whole layering inside the card:
    // ground 1, band 2, cornice 3. NOT the design's `z-index: 1` lift on the
    // CONTENT — that lift needs `position: relative` on static children, which
    // overrides the absolutely positioned ornament this skin is full of.
    const tag = opened(html, 'class="eph-turn-scope"');
    expect(tag).toContain("isolation:isolate");
  });
});

describe("every bordered plate CTA wears it, and the list is the assertion", () => {
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

  const WEARS = /className[=:]\s*[{`"']?[^"'`]*eph-cta/;

  it("is mounted on the six surfaces that draw one, and no others", () => {
    // The issue names three (card, task detail, composer). The grep found two
    // more painting the identical button — the faction page's join/leave pair
    // and the phone's field desk — and #2067's own note that the field desk
    // "does not paint it with the plate CTA" is simply out of date. A ruling
    // about one control does not stop at the surfaces someone happened to
    // list; leaving either behind is the drift the extraction exists to end.
    //
    // The SIXTH is the faction-directory tile (#2323). It drew a brass-outlined
    // ghost button in `-plate-gold` on the cornice band, which is what a tile
    // painted in the wrong register looks like from here: not a variant of this
    // control, a different one. Repainting it onto the plate made it this one.
    const mounts = files
    // Matched at the `className`, not on the bare string: half the Ephemerists
    // kit names this class in prose, and a census a comment can join is a
    // census nobody keeps.
      .filter(([, source]) => WEARS.test(source))
      .map(([path]) => path.slice(SRC.length).replace(/\\/g, "/"));
    expect(mounts.sort()).toEqual([
      "components/selectCard/EphemeristsSelectCard.tsx",
      "components/taskCard/EphemeristsTaskCard.tsx",
      "pages/editPraxis/archetypes/EphemeristsEditPraxis.tsx",
      "pages/factionDetail/archetypes/EphemeristsFactionBody.tsx",
      "pages/fieldDesk/mobileArchetypes/EphemeristsFieldDesk.tsx",
      "pages/taskDetail/archetypes/EphemeristsTaskDetail.tsx",
    ]);
  });

  it("leaves no surface restating the enclosure it replaced", () => {
    // The exact shape that was in five files: a 2px rule in the MARK brass,
    // which is one hex in light and another in dark and so could never carry
    // the ruling on its own. Bounded by `border:` — the composer's task slip
    // rules its LEFT edge in the same brass and is not a control.
    const RESTATEMENT =
      /border: (`2px solid \$\{BRASS\}`|"2px solid var\(--faction-ephemerists-plate-brass\)")/;
    const restating = files
      .filter(([, source]) => RESTATEMENT.test(source))
      .map(([path]) => path.slice(SRC.length).replace(/\\/g, "/"));
    expect(restating).toEqual([]);
  });
});

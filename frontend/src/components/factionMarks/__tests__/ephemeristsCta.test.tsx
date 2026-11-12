/**
 * The plate CTA (#2146): one control that inverts across themes. The border
 * width flips (2px rule brass light, 1px mark brass dark), which inline styles
 * can't do without a theme ternary, so it is a class in `index.css`. Checked
 * as CSS text, on the task card's button (no inline restatement, which would
 * pin the light half), and as a named census of the source tree (#2090).
 */
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../i18n";

vi.mock("../../../hooks/useFormFactor", () => ({ useFormFactor: () => "desktop" }));

import EphemeristsTaskCard from "../../taskCard/EphemeristsTaskCard";
import { aTask } from "../../../test/fixtures";
import { sourceFiles, toRelative } from "../../../test/sourceScan";
import { ruleBodies, stripComments } from "../../../utils/__tests__/cssVars";
import { readIndexCss } from "../../../test/indexCss";

const CSS = stripComments(
  readIndexCss(),
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

/** The opening tag of the element carrying `marker`. */
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
    // Ground and ink tokens flip themselves (#2141); width can't.
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
    // Inline beats the class and would pin the light half in both themes.
    const tag = opened(html, 'class="eph-cta"');
    expect(tag, "the ground").not.toMatch(/background:/);
    expect(tag, "the enclosure").not.toMatch(/border:/);
    expect(tag, "the ink").not.toMatch(/[;"]color:/);
  });

  it("closes the leaf on the notation band's own rule, in the rule brass", () => {
    // §4: the notation band's pair, so the sheet opens and closes alike.
    const tag = opened(html, 'data-cta-rule="ephemerists"');
    expect(tag).toContain("border-top:1px solid var(--faction-ephemerists-plate-brass-rule)");
    expect(tag).toContain("border-bottom:3px double var(--faction-ephemerists-plate-brass-rule)");
  });

  it("grounds the plate on the GRAVITY FIELD, not the chart net (#2398)", () => {
    // One ornament per faction (#2195): the field, not the page's net.
    // Alternation: `ephemeristsGravityAlternation.test.tsx`.
    expect(html).toContain('preserveAspectRatio="xMaxYMin slice"');
    expect(html).toContain('d="M-6 ');
    expect(html).not.toContain('viewBox="0 0 1000 600"');
  });

  it("isolates the plate, so the ground paints over the fill and under the chrome", () => {
    // Not the design's content lift: it needs `position: relative` on
    // children, breaking the absolute ornament.
    const tag = opened(html, 'class="eph-turn-scope"');
    expect(tag).toContain("isolation:isolate");
  });
});

describe("the CTA block is ONE column, rule and runes alike (#2724)", () => {
  const html = card();

  /** The rule's parent: the CTA column. */
  function column(markup: string): string {
    const at = markup.indexOf('data-cta-rule="ephemerists"');
    expect(at, "the brass rule").toBeGreaterThan(-1);
    const rule = markup.lastIndexOf("<", at);
    const from = markup.lastIndexOf("<div", rule - 1);
    return markup.slice(from, markup.indexOf(">", from));
  }

  it("insets the block by the plate's own `--space-xl`, so everything in it lines up", () => {
    // #2724: the block is the padded box; rule, button and rows fill it.
    expect(column(html)).toContain("padding:0 var(--space-xl)");
  });

  it("leaves the rule stating only its clearance, not the inset", () => {
    // Stating the inset here too would double it.
    const tag = opened(html, 'data-cta-rule="ephemerists"');
    expect(tag).toContain("margin:0 0 var(--space-md)");
  });

  it("hangs both rune rows in that same column, at no inset of their own", () => {
    for (const side of ["top", "bottom"] as const) {
      const at = html.indexOf(`data-eph-runes="${side}"`);
      expect(at, side).toBeGreaterThan(html.indexOf('data-cta-rule="ephemerists"'));
      expect(opened(html, `data-eph-runes="${side}"`), side).not.toContain("margin");
    }
  });
});

describe("every bordered plate CTA wears it, and the list is the assertion", () => {
  const files: [string, string][] = sourceFiles().map((path) => [path, readFileSync(path, "utf8")]);

  const WEARS = /className[=:]\s*[{`"']?[^"'`]*eph-cta/;

  it("is mounted on the ten surfaces that draw one, and no others", () => {
    // A new entry is a design decision; add it by name.
    const mounts = files
    // Match `className`, not the bare string: prose names the class.
      .filter(([, source]) => WEARS.test(source))
      .map(([path]) => toRelative(path));
    expect(mounts.sort()).toEqual([
      "components/invitation/EphemeristsInvitationLetter.tsx",
      "components/selectCard/EphemeristsSelectCard.tsx",
      "components/taskCard/EphemeristsTaskCard.tsx",
      "pages/characterPaths/archetypes/EphemeristsCreateCharacter.tsx",
      "pages/characterPaths/archetypes/EphemeristsEditCharacter.tsx",
      "pages/editPraxis/archetypes/EphemeristsEditPraxis.tsx",
      "pages/factionDetail/archetypes/EphemeristsFactionBody.tsx",
      "pages/fieldDesk/mobileArchetypes/EphemeristsFieldDesk.tsx",
      "pages/proposeTask/archetypes/EphemeristsProposeTask.tsx",
      "pages/taskDetail/archetypes/EphemeristsTaskDetail.tsx",
    ]);
  });

  it("leaves no surface restating the enclosure it replaced", () => {
    // Bounded by `border:`: the composer slip's left-edge rule is not a control.
    const RESTATEMENT =
      /border: (`2px solid \$\{BRASS\}`|"2px solid var\(--faction-ephemerists-plate-brass\)")/;
    const restating = files
      .filter(([, source]) => RESTATEMENT.test(source))
      .map(([path]) => toRelative(path));
    expect(restating).toEqual([]);
  });
});

/**
 * All four S.N.I.D.E. section headings go through `SectionHeading` (#2807).
 * Asserted on rendered markup (the tree), not source. Hazard: `<Halftone />` is
 * `position: absolute; inset: 0`, so a heading row without `position: relative`
 * paints under the 8% raster, subtly enough to ship unnoticed.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
// Initialize the i18n catalog so faction copy keys resolve to English text.
import "../../../i18n";
import i18n from "../../../i18n";
import type { CharacterOut } from "../../../api/auth";
import type { FactionDetailState } from "../useFactionDetail";
import SnideFactionBody from "../archetypes/SnideFactionBody";

function aCharacter(over: Partial<CharacterOut> = {}): CharacterOut {
  return {
    all_time_score: 100,
    avatar_url: "",
    badges: [],
    bio: "",
    created_at: "2026-01-01T00:00:00Z",
    display_name: "Ada",
    faction_slug: "snide",
    id: 1,
    invitations: [],
    level: 4,
    location: "",
    score: 100,
    status: "active",
    tagline: "",
    username: "ada",
    ...over,
  };
}

const MEMBERS: CharacterOut[] = [
  aCharacter({ id: 1, display_name: "RunnerUp", username: "RunnerUp", all_time_score: 40 }),
  aCharacter({ id: 2, display_name: "TopScorer", username: "TopScorer", all_time_score: 900 }),
];

function snideMarkup(): string {
  const state = {
    slug: "snide",
    loading: false,
    faction: { slug: "snide" },
    fetchError: null,
    members: MEMBERS,
    tasks: [],
    recentPraxis: [],
    sections: undefined,
    membership: {
      state: "eligible",
      currentFactionSlug: null,
      join: async () => {},
      joining: false,
      joinError: null,
    },
  } as unknown as FactionDetailState;
  return renderToStaticMarkup(
    <MemoryRouter>
      <SnideFactionBody state={state} />
    </MemoryRouter>,
  );
}

/** `SECTION_HEADING_ROW` serialized, minus `position` (the thing under test). */
const ROW =
  "display:flex;align-items:center;gap:var(--space-md);margin-bottom:var(--space-sm);flex-wrap:wrap";
/** `ACID_PLATE` */
const PLATE = "color:var(--faction-snide-acid);background:var(--faction-snide-ink)";
/** `SECTION_HEADING_RULE`, the barcode that closes every heading row. */
const RULE = "repeating-linear-gradient(90deg";

/** The heading row wrapping `label`, from its `style=` to the closing barcode. */
function headingRow(markup: string, label: string): string {
  const at = markup.indexOf(label);
  expect(at, `"${label}" is drawn on the page at all`).toBeGreaterThan(-1);
  const found = markup.lastIndexOf(ROW, at);
  expect(
    found,
    `"${label}" is not inside a SectionHeading row — no heading row opens before it.`,
  ).toBeGreaterThan(-1);
  const open = markup.lastIndexOf('style="', found);
  const close = markup.indexOf(RULE, at);
  expect(
    close,
    `"${label}" is not inside a SectionHeading row — no barcode rule closes after it.`,
  ).toBeGreaterThan(-1);
  const row = markup.slice(open, close);
  expect(
    row.indexOf(ROW, row.indexOf(ROW) + 1),
    `a second heading row opens between "${label}" and the row above it, so this is not its row.`,
  ).toBe(-1);
  return row;
}

const HEADINGS: ReadonlyArray<readonly [string, string]> = [
  ["About", i18n.t("factions:detail.aboutHeading")],
  ["Tasks", i18n.t("factions:detail.default.tasksHeading", { total: 0 })],
  ["Recent", i18n.t("factions:detail.default.recentHeading")],
  ["Members", i18n.t("factions:detail.default.membersHeading", { total: MEMBERS.length })],
];

describe("every S.N.I.D.E. section heading is the censor bar (#2807)", () => {
  for (const [section, label] of HEADINGS) {
    it(`${section} is an Impact stencil on the acid plate`, () => {
      expect(label, `${section}'s copy key resolves to real copy`).not.toMatch(/^factions:/);
      expect(
        headingRow(snideMarkup(), label),
        `${section} still speaks in its own voice. All four sections take SectionHeading.`,
      ).toContain(PLATE);
    });

    it(`${section} paints above its panel's halftone raster`, () => {
      expect(
        headingRow(snideMarkup(), label),
        `${section}'s heading row declares no \`position\`, so the halftone paints over it.`,
      ).toContain("position:relative");
    });
  }

  it("the marker scrawl has left this surface", () => {
    // The token itself stays: other files still spend it.
    expect(
      snideMarkup(),
      "a heading is still scrawled in the wall's green rather than plated.",
    ).not.toContain("--faction-snide-wall-credit");
  });
});

/**
 * S.N.I.D.E.'S FOUR SECTION HEADINGS SPEAK IN ONE VOICE (#2807).
 *
 * The page drew its four sections in TWO voices, and the split was not a design
 * choice — Tasks and Recent went through `SectionHeading` (Impact stencil on the
 * acid censor plate, barcode rule beside it) and About and Members were still the
 * marker scrawl they had been before that component existed. Owner ruling,
 * 2026-08-27: all four take `SectionHeading`.
 *
 * WHY THE SEAM IS THE RENDERED MARKUP AND NOT THE SOURCE. The sibling guard in
 * `factionContrast.test.ts` sweeps this file as TEXT, which is the right seam for
 * "an acid ink with no plate under it" because a pairing is a fact about a style
 * object. This is a fact about the TREE: whether the heading a reader meets is
 * inside a heading row at all, and whether that row is a stacking context. A
 * source sweep cannot see either, and both are exactly what a naive conversion
 * gets wrong.
 *
 * THE HALFTONE IS THE LANDMINE. Both converted headings sit in a panel that also
 * mounts `<Halftone />` — `position: absolute; inset: 0`, an 8% dot raster over
 * the panel's whole box. Every sibling that must paint above it carries
 * `position: relative` of its own, and the two scrawls did. `SECTION_HEADING_ROW`
 * did not, so wrapping them dropped both headings UNDER the raster. At 8% that
 * is a slightly dulled heading rather than a broken one — it ships green and gets
 * reported three weeks later, which is why it is asserted rather than eyeballed.
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

/** Two members, so a champion AND a rap sheet below it both render. */
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
    viewerFactionSlug: null,
    gameFactions: [],
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

/**
 * `SECTION_HEADING_ROW`, as React serializes it — minus `position`, which is the
 * thing under test and so must not be part of what finds the row.
 */
const ROW =
  "display:flex;align-items:center;gap:var(--space-md);margin-bottom:var(--space-sm);flex-wrap:wrap";
/** `ACID_PLATE` — the censor bar, the first two declarations of the heading span. */
const PLATE = "color:var(--faction-snide-acid);background:var(--faction-snide-ink)";
/** `SECTION_HEADING_RULE` — the green/pink barcode that closes every heading row. */
const RULE = "repeating-linear-gradient(90deg";

/**
 * The one heading row that wraps `label`: from its opening `style=` back-searched
 * from the label, forward to the barcode rule that closes it.
 */
function headingRow(markup: string, label: string): string {
  const at = markup.indexOf(label);
  expect(at, `"${label}" is drawn on the page at all`).toBeGreaterThan(-1);
  const found = markup.lastIndexOf(ROW, at);
  expect(
    found,
    `"${label}" is not inside a SectionHeading row — no heading row opens before it.`,
  ).toBeGreaterThan(-1);
  // Back to the row's own `style="`, so the slice carries every declaration and
  // not only the ones that happen to follow the anchor.
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
      // A missing key makes i18next echo the key back, which would make the
      // search below pass against itself.
      expect(label, `${section}'s copy key resolves to real copy`).not.toMatch(/^factions:/);
      expect(
        headingRow(snideMarkup(), label),
        `${section} still speaks in its own voice. All four sections take SectionHeading.`,
      ).toContain(PLATE);
    });

    it(`${section} paints above its panel's halftone raster`, () => {
      // `<Halftone />` is `position: absolute; inset: 0` over the whole panel. A
      // heading row that is not itself positioned renders UNDER an 8% dot screen.
      expect(
        headingRow(snideMarkup(), label),
        `${section}'s heading row declares no \`position\`, so the halftone paints over it.`,
      ).toContain("position:relative");
    });
  }

  it("the marker scrawl has left this surface", () => {
    // `--faction-snide-wall-credit` was the scrawl's green and had no other
    // reader here. The TOKEN stays — six other files spend it, `SnideProfileBody`
    // among them, which is why `factionContrast.test.ts` still measures it bare.
    expect(
      snideMarkup(),
      "a heading is still scrawled in the wall's green rather than plated.",
    ).not.toContain("--faction-snide-wall-credit");
  });
});

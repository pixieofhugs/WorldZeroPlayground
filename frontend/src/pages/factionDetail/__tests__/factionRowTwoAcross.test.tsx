/**
 * Two cards across a faction page's FULL 600px column (#3180, owner ruling).
 *
 * THE SEAM: the row hooks each of the faction bodies puts on its task row and
 * praxis row, and the one stylesheet rule that reads them. Nothing here measures
 * a width (`renderToStaticMarkup`, no layout) — it asserts the two halves that
 * must agree: every body's rows wear a hook, and the rule keyed on the hooks
 * fires only in a >= 600px column, so a 488px column (a 1280 window) keeps one
 * 384px card. VISUAL QA AT 1280 / 1440 / 1920 IS OUTSTANDING.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ComponentType } from "react";
import { describe, it, expect } from "vitest";
import "../../../i18n";
import type { FactionDetailState } from "../useFactionDetail";
import AlbescentFactionBody from "../archetypes/AlbescentFactionBody";
import CovenFactionBody from "../archetypes/CovenFactionBody";
import DefaultFactionBody from "../archetypes/DefaultFactionBody";
import EphemeristsFactionBody from "../archetypes/EphemeristsFactionBody";
import EverymenFactionBody from "../archetypes/EverymenFactionBody";
import SingularityFactionBody from "../archetypes/SingularityFactionBody";
import SnideFactionBody from "../archetypes/SnideFactionBody";
import UaFactionBody from "../archetypes/UaFactionBody";
import WowFactionBody from "../archetypes/WowFactionBody";
import { aPraxisCard, aTask } from "../../../test/fixtures";
import { readIndexCss } from "../../../test/indexCss";

type Body = ComponentType<{ state: FactionDetailState }>;

const BODIES: Array<[string, Body]> = [
  ["na", DefaultFactionBody as Body],
  ["albescent", AlbescentFactionBody as Body],
  ["coven", CovenFactionBody as Body],
  ["ephemerists", EphemeristsFactionBody as Body],
  ["everymen", EverymenFactionBody as Body],
  ["singularity", SingularityFactionBody as Body],
  ["snide", SnideFactionBody as Body],
  ["ua", UaFactionBody as Body],
  ["wow", WowFactionBody as Body],
];

function markup(slug: string, Body: Body): string {
  const state = {
    slug,
    loading: false,
    faction: { slug },
    fetchError: null,
    members: [],
    tasks: [aTask()],
    recentPraxis: [aPraxisCard()],
    viewerFactionSlug: null,
    gameFactions: [],
    sections: undefined,
    membership: {
      state: "none",
      currentFactionSlug: null,
      join: async () => {},
      joining: false,
      joinError: null,
    },
  } as unknown as FactionDetailState;
  return renderToStaticMarkup(
    <MemoryRouter>
      <Body state={state} />
    </MemoryRouter>,
  );
}

describe("every faction body's task row and praxis row wear a hook the rule can read", () => {
  for (const [slug, Body] of BODIES) {
    it(`${slug}: task row and praxis row`, () => {
      const html = markup(slug, Body);
      expect(html).toContain("task-card-row");
      expect(html).toMatch(/wz-faction-card-row|praxis-gallery/);
    });
  }
});

describe("the two-across rule", () => {
  const CSS = readIndexCss();
  const start = CSS.indexOf("@container wz-faction-main");
  const block = CSS.slice(start, CSS.indexOf("\n  }\n", start) + 5);

  it("names the main column as the container", () => {
    expect(CSS).toMatch(/\.wz-faction-grid > :first-child \{\s*container: wz-faction-main \/ inline-size;/);
  });

  it("fires only at a full 600px column and never below 768px", () => {
    expect(block).toContain("(min-width: 600px)");
    expect(block).toContain("@media (min-width: 768px)");
  });

  it("narrows (max-width, never grows) both rows to half the row less half the gap", () => {
    expect(block).toContain(".task-card-row, .wz-faction-card-row, .praxis-gallery) > *");
    expect(block).toContain("max-width: calc(50% - var(--space-xl) / 2)");
    expect(block).not.toMatch(/flex-grow|\swidth:/);
  });
});

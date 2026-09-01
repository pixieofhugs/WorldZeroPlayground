/**
 * The na PLATE (#2497, epic #2496).
 *
 * THE SEAM IS THE ELEMENT THE SHEET LANDS ON. `DefaultFactionBody`'s regions had
 * no plate at all — a bare `<h2>` over a card grid under a `mb-8` — and the
 * obvious place to put one is `SectionPanel`, which already wraps every gallery.
 * That is the defect this file exists to hold shut: `SectionPanel` is the
 * DISCLOSURE half (an id and `hidden={!section.open}`), seven sibling archetypes
 * mount it, and every one of them already draws a plate of its own in its own
 * dress. A sheet on that wrapper paints a second plate inside all seven, and it
 * folds the plate away with the gallery on the eighth.
 *
 * So three things hold, and the middle one is the load-bearing one:
 *   1. every region of the Default body wears `.faction-plate`;
 *   2. the plate is OUTSIDE the disclosure body — the kicker and its rule stay
 *      when a region is folded;
 *   3. no sibling archetype gained a plate, i.e. `SectionPanel` did not become
 *      one.
 *
 * The harness is `sectionDisclosure.test.tsx`'s, for its reasons: the page is
 * rendered through the real dispatch so `albescent` reaches Default the way a
 * player does, and there is no DOM.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect, vi } from "vitest";
import "../../../i18n";
import type { FactionDetailState } from "../useFactionDetail";
import { FACTION_SECTIONS, sectionBodyId } from "../sectionDisclosure";
import { aTask, aPraxisCard } from "../../../test/fixtures";

const mocks = vi.hoisted(() => ({
  state: undefined as unknown as FactionDetailState,
}));

vi.mock("../useFactionDetail", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../useFactionDetail")>()),
  useFactionDetail: () => mocks.state,
}));

const FactionDetail = (await import("../../FactionDetail")).default;

/** `albescent` is the one slug that falls through to `DefaultFactionBody`. */
const DEFAULT_SLUG = "albescent";
/** The seven that bring bodies of their own, and must not have moved. */
const BESPOKE = ["coven", "ephemerists", "everymen", "singularity", "snide", "ua", "wow"];

function page(slug: string): string {
  mocks.state = {
    slug,
    loading: false,
    faction: { slug, status: "visible" },
    fetchError: null,
    members: [],
    tasks: [aTask({ id: 1 }), aTask({ id: 2 })],
    recentPraxis: [aPraxisCard({ id: 1 })],
    viewerFactionSlug: null,
    gameFactions: [],
    onSignup: undefined,
    signupMsg: null,
    membership: {
      state: "none",
      currentFactionSlug: null,
      join: async () => {},
      joining: false,
      joinError: null,
    },
  } as unknown as FactionDetailState;
  const element: ReactElement = <FactionDetail slug={slug} />;
  return renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
}

describe("the Default faction body draws real plates (#2497)", () => {
  it("dresses all three of its regions, kicker and rule included", () => {
    const html = page(DEFAULT_SLUG);
    // About, Members, Tasks and Recently-completed. Counted rather than named,
    // so a further region added later cannot ship undressed — which is exactly
    // what caught #2504's two: About came DOWN from the page (it was the
    // description card `FactionDetail` drew above the body) and Champion is
    // drawn only when there is a member to name, so this fixture's empty roster
    // sees four here and the fifth is counted in `defaultFactionHero.test.tsx`.
    expect((html.match(/class="faction-plate"/g) ?? []).length).toBe(4);
    expect((html.match(/faction-plate-kicker/g) ?? []).length).toBe(4);
    // The hairline is the shared spectrum ramp, not a rule of its own — that is
    // what lets Albescent move it with the cards' bands (#2500).
    //
    // TWO, not four (#2576). `DEFAULT_SLUG` is "albescent" despite its name, so
    // this fixture's four plates are two TEXT plates (About, Members — Champion
    // is absent on an empty roster) and two CARD plates. The text pair mount the
    // 3px `.alb-plate-edge` ring, and a plate may carry one structural rainbow,
    // not two, so the hairline yields there and stays on the card pair.
    expect((html.match(/spectrum-rule faction-plate-rule/g) ?? []).length).toBe(2);
  });

  it("keeps the plate OUTSIDE the disclosure, so a fold hides the gallery alone", () => {
    const html = page(DEFAULT_SLUG);
    for (const id of ["tasks", "praxis"] as const) {
      const bodyAt = html.indexOf(`id="${sectionBodyId(FACTION_SECTIONS, id)}"`);
      expect(bodyAt, `${id} has no disclosure body`).toBeGreaterThan(-1);
      const plateAt = html.lastIndexOf('class="faction-plate"', bodyAt);
      const kickerAt = html.lastIndexOf("faction-plate-kicker", bodyAt);
      expect(plateAt, `${id}'s plate is not its ancestor`).toBeGreaterThan(-1);
      expect(
        kickerAt,
        `${id}'s kicker sits inside the panel and would fold away with it`,
      ).toBeGreaterThan(plateAt);
      expect(kickerAt).toBeLessThan(bodyAt);
    }
  });
});

describe("the seven bespoke bodies did not gain a plate (#2497)", () => {
  for (const slug of BESPOKE) {
    it(`${slug} still dresses its own sections`, () => {
      // If the sheet had gone on `SectionPanel` instead, every one of these
      // would now be drawing the na plate inside its own.
      expect(page(slug)).not.toContain("faction-plate");
    });
  }
});

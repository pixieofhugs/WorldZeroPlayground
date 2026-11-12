/**
 * The na plate (#2497). It must NOT live on `SectionPanel`: that is the
 * disclosure wrapper seven bespoke bodies mount inside their own plates, and it
 * would fold the plate away with the gallery.
 *   1. every Default region wears `.faction-plate`;
 *   2. the plate is OUTSIDE the disclosure body;
 *   3. no bespoke body gained a plate.
 * Rendered through the real dispatch, no DOM.
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

/** The one slug that falls through to `DefaultFactionBody`. */
const DEFAULT_SLUG = "albescent";
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
    // About, Members, Tasks, Recently-completed; counted so a new region can't
    // ship undressed. Champion needs a member (see `defaultFactionHero.test.tsx`).
    expect((html.match(/class="faction-plate"/g) ?? []).length).toBe(4);
    expect((html.match(/faction-plate-kicker/g) ?? []).length).toBe(4);
    // The shared spectrum ramp (#2500). Two, not four: the two text plates carry
    // the `.alb-plate-edge` ring instead, one rainbow per plate (#2576).
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
      expect(page(slug)).not.toContain("faction-plate");
    });
  }
});

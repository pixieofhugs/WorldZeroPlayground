/**
 * Membership relocation guard (#347): the Factions grid only visits; Join /
 * Leave / Accept / Decline live on the detail page's membership block. Pins
 * that block: Join for "eligible", nothing for "none" (logged out or no
 * character; UA is ordinary since #2660). The grid half is structural —
 * `FactionSelectCardProps` has only `onVisit` (#2024).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import EverymenFactionBody from "../factionDetail/archetypes/EverymenFactionBody";
import type { FactionDetailState, Membership } from "../factionDetail/useFactionDetail";
import type { FactionOut } from "../../api/factions";

// Name/description copy resolves from factions.json by slug (#461).
const FACTION: FactionOut = {
  slug: "everymen",
  status: "visible",
};

function html(node: React.ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);
}

function stateWith(membership: Partial<Membership>): FactionDetailState {
  return {
    slug: FACTION.slug,
    loading: false,
    faction: FACTION,
    fetchError: null,
    members: [],
    tasks: [],
    recentPraxis: [],
    onSignup: undefined,
    signupMsg: null,
    membership: {
      state: "eligible",
      currentFactionSlug: null,
      join: async () => {},
      joining: false,
      joinError: null,
      ...membership,
    },
  };
}

describe("faction detail page membership CTA", () => {
  it("renders the Join CTA for an eligible viewer", () => {
    const markup = html(
      <EverymenFactionBody state={stateWith({ state: "eligible" })} />,
    );
    expect(markup.toUpperCase()).toContain("ENLIST");
  });

  it("hides the join block when the viewer has no join affordance", () => {
    const markup = html(
      <EverymenFactionBody state={stateWith({ state: "none" })} />,
    );
    expect(markup.toUpperCase()).not.toContain("ENLIST");
    // The section disclosures are buttons too (#2311); exclude them by name,
    // not count, so a returning join control still fails.
    const buttons = markup.match(/<button[^>]*>/g) ?? [];
    const membershipButtons = buttons.filter(
      (tag) => !tag.includes('aria-controls="wz-faction-section-'),
    );
    expect(membershipButtons).toEqual([]);
  });
});

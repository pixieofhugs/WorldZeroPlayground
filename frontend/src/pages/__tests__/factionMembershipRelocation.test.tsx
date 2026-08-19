/**
 * Membership relocation guard (issue #347).
 *
 * The Factions GRID is a directory: a tile visits the faction's detail page, and
 * all Join / Leave / Accept / Decline actions live on that page's membership
 * block. This test pins the half of that split which is still testable here —
 * the detail-page membership block renders the Join CTA for an eligible viewer
 * and hides it for a viewer with no join affordance ("none"), which is exactly
 * the state the hook resolves for UA (graduation-gated, no chosen-join flow).
 *
 * THE GRID HALF LOST ITS SUBJECT (#2024). It asserted that a `FactionCard`
 * rendered no `<button>` and was wrapped in a link to the detail page. That
 * dispatcher is gone: #422 had already replaced the directory grid with
 * `FactionSelectCard` on both form factors, so the card this file rendered had
 * had no production mount for a long time and #2024 retired the surface. The
 * claim does not transfer verbatim — every select tile draws a `<button>`, its
 * visit CTA — so a repointed assertion would have been a new claim wearing an
 * old issue number. What replaces it is the tile's PROP SURFACE:
 * `FactionSelectCardProps` offers `onVisit` and no membership callback at all,
 * and `pages/Factions.tsx` wires it to `navigate('/factions/:slug')`. There is
 * nothing for a join control on that tile to call.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import EverymenFactionBody from "../factionDetail/archetypes/EverymenFactionBody";
import type { FactionDetailState, Membership } from "../factionDetail/useFactionDetail";
import type { FactionOut } from "../../api/factions";

// Faction name/description prose is no longer on FactionOut (issue #461) — the
// display copy resolves from the factions.json catalog by slug.
const FACTION: FactionOut = {
  slug: "everymen",
  status: "visible",
};

function html(node: React.ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);
}

// ─── Detail-page membership block ──────────────────────────────────────────

function stateWith(membership: Partial<Membership>): FactionDetailState {
  return {
    slug: FACTION.slug,
    loading: false,
    faction: FACTION,
    fetchError: null,
    members: [],
    tasks: [],
    recentPraxis: [],
    viewerFactionSlug: null,
    gameFactions: [],
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
    // The Everymen enlist CTA in its faction voice.
    expect(markup.toUpperCase()).toContain("ENLIST");
  });

  it("hides the join block when the viewer has no join affordance", () => {
    // membership.state === "none" is what the hook resolves for logged-out
    // viewers AND for UA (graduation-gated, no chosen join). The block is gone.
    const markup = html(
      <EverymenFactionBody state={stateWith({ state: "none" })} />,
    );
    expect(markup.toUpperCase()).not.toContain("ENLIST");
    expect(markup).not.toContain("<button");
  });
});

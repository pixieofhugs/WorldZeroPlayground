/**
 * Membership relocation guard (issue #347).
 *
 * The Factions GRID is a directory of pure preview cards: the whole card links
 * to the faction detail page and carries NO membership controls. All Join /
 * Leave / Accept / Decline actions live on the detail page's membership block.
 *
 * This test pins that split:
 *   1. A grid FactionCard renders no interactive controls (no <button>).
 *   2. The detail-page membership block renders the Join CTA for an eligible
 *      viewer, and hides it for a viewer with no join affordance ("none") —
 *      which is exactly the state the hook resolves for UA (graduation-gated,
 *      no chosen-join flow).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Link } from "react-router-dom";
import { describe, it, expect } from "vitest";
import FactionCard from "../../components/cards/FactionCard";
import EverymenFactionBody from "../factionDetail/archetypes/EverymenFactionBody";
import type { FactionDetailState, Membership } from "../factionDetail/useFactionDetail";
import type { FactionOut } from "../../api/factions";

const FACTION: FactionOut = {
  slug: "everymen",
  name: "The Everymen",
  description: "Honest work, honestly done.",
};

function html(node: React.ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);
}

/** Tag-stripped text — some archetypes split the name across spans (the
 *  Ephemerists' lapis last word), so the name only reads contiguously here. */
function text(node: React.ReactElement): string {
  return html(node).replace(/<[^>]*>/g, "");
}

// ─── 1. Grid card is a pure preview (no interactive controls) ─────────────────

describe("faction grid card is a pure preview", () => {
  for (const slug of ["everymen", "wow", "snide", "ephemerists", "singularity", "ua"]) {
    it(`${slug} card renders the name but no membership buttons`, () => {
      const card = (
        <FactionCard
          faction={{ ...FACTION, slug, name: `Faction ${slug}` }}
          status="eligible"
        />
      );
      expect(text(card), "faction name renders").toContain(`Faction ${slug}`);
      expect(html(card), "no interactive controls on the grid card").not.toContain(
        "<button",
      );
    });
  }

  it("is wrapped in a link to the faction detail page (grid usage)", () => {
    // Mirrors how Factions.tsx wraps each card; the whole card is the link.
    const markup = html(
      <Link to="/factions/everymen">
        <FactionCard faction={FACTION} status="eligible" />
      </Link>,
    );
    expect(markup).toContain('href="/factions/everymen"');
  });
});

// ─── 2. Detail-page membership block ──────────────────────────────────────────

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

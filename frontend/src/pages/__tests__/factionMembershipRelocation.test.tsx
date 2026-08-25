/**
 * Membership relocation guard (issue #347).
 *
 * The Factions GRID is a directory: a tile visits the faction's detail page, and
 * all Join / Leave / Accept / Decline actions live on that page's membership
 * block. This test pins the half of that split which is still testable here —
 * the detail-page membership block renders the Join CTA for an eligible viewer
 * and hides it for a viewer with no join affordance ("none"). That state used
 * to be cited here as "what the hook resolves for UA"; #2660 deleted that
 * branch (UA is ordinary — ADR-0030), so "none" now means only logged-out or
 * no character, which is what this asserts.
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
    // membership.state === "none" is what the hook resolves for a logged-out
    // viewer or one with no character. The block is gone.
    const markup = html(
      <EverymenFactionBody state={stateWith({ state: "none" })} />,
    );
    expect(markup.toUpperCase()).not.toContain("ENLIST");
    // "No `<button>` anywhere" used to stand in for "no join control", and it
    // stopped being a synonym in #2311: the Tasks and Praxis headings are
    // disclosures now, so this body draws two buttons that have nothing to do
    // with membership. The claim is narrowed to what it was always about — a
    // button that ACTS on the faction. The disclosures are excluded by name
    // rather than by count, so a join control creeping back in still fails.
    const buttons = markup.match(/<button[^>]*>/g) ?? [];
    const membershipButtons = buttons.filter(
      (tag) => !tag.includes('aria-controls="wz-faction-section-'),
    );
    expect(membershipButtons).toEqual([]);
  });
});

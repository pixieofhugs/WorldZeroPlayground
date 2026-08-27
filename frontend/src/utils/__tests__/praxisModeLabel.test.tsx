/**
 * Duel mode labelling (#992).
 *
 * A duel is two solo praxes linked by a `Duel` row (ADR-0011): a duel side is
 * stored `type='solo'` + a non-null `duel_id`, there is NO `type='duel'` praxis.
 * So any surface that labels by `type` alone reads an accepted duel as "Solo".
 * `praxisModeLabel` and the card mode chips gate on duel presence first; these
 * assert that a duel side reads "Duel" while a plain solo/collab is unchanged.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";

import i18n from "../../i18n";
import { isDuelPraxis, praxisModeLabel } from "../praxis";
import { PraxisModeChip } from "../../components/praxisCard/shared";
import type { PraxisCardOut } from "../../api/praxis";

const t = i18n.getFixedT(null, "common");

const DUEL_LABEL = t("praxisType.duel");
const SOLO_LABEL = t("praxisType.solo");
const COLLAB_LABEL = t("praxisType.collab");
const DUEL_CHIP = t("collaborationCard.duel");

/** A card fixture — only the mode fields matter; the rest satisfy the type. */
function card(overrides: Partial<PraxisCardOut>): PraxisCardOut {
  return {
    id: 1,
    task_id: 1,
    task_title: "Task",
    task_point_value: 10,
    task_level_required: 0,
    type: "solo",
    status: "in_progress",
    title: "A praxis",
    moderation_status: "visible",
    created_by_id: 1,
    created_by_display_name: "Author",
    created_by_avatar_url: "",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    submitted_at: null,
    submit_proposed_at: null,
    member_count: 1,
    score: 10,
    metatask_points: 0,
    display_multiplier: 1,
    points_from_votes: 0,
    voter_count: 0,
    is_top_for_task: false,
    applied_metatasks: [],
    task_faction_slug: null,
    body_text: null,
    created_by_faction_slug: null,
    members: [],
    media_items: [],
    viewer_vote: null,
    voted_by_name: null,
    viewer_can_vote: true,
    duel_id: null,
    ...overrides,
  } as PraxisCardOut;
}

const text = (element: React.ReactElement): string =>
  renderToStaticMarkup(element).replace(/<[^>]*>/g, "");

describe("praxisModeLabel (#992)", () => {
  it("labels a duel side 'Duel' even though it is stored type='solo'", () => {
    const duelSide = card({ type: "solo", duel_id: 42 });
    expect(isDuelPraxis(duelSide)).toBe(true);
    expect(praxisModeLabel(duelSide, t)).toBe(DUEL_LABEL);
  });

  it("labels a plain solo (no duel) 'Solo'", () => {
    const solo = card({ type: "solo", duel_id: null });
    expect(isDuelPraxis(solo)).toBe(false);
    expect(praxisModeLabel(solo, t)).toBe(SOLO_LABEL);
  });

  it("labels a collab 'Collab'", () => {
    const collab = card({ type: "collab", duel_id: null });
    expect(praxisModeLabel(collab, t)).toBe(COLLAB_LABEL);
  });
});

describe("card mode chips gate on duel presence (#992)", () => {
  it("desktop PraxisModeChip renders the Duel chip for a type='solo' duel side", () => {
    const html = text(<PraxisModeChip praxis={card({ type: "solo", duel_id: 42 })} />);
    expect(html).toContain(DUEL_CHIP);
  });

  it("desktop PraxisModeChip renders nothing for a plain solo", () => {
    expect(
      renderToStaticMarkup(<PraxisModeChip praxis={card({ type: "solo", duel_id: null })} />),
    ).toBe("");
  });

  // `PraxisModeChip` is what a phone renders too (ADR-0067), so the cases above
  // cover both form factors and there is no second chip to twin them against.
});

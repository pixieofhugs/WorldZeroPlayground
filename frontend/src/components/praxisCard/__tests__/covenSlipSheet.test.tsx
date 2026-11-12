/**
 * #2135 — the Coven praxis card wears the SLIP, and the cat comes with it. Guards
 * the reversed #1209 panel-ground decision, and the ink swap: DEEP renders fine
 * on the sheet but fails AA there (3.33:1). SSR-only.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../i18n";
import type { PraxisCardOut } from "../../../api/praxis";
import CovenPraxisCard from "../desktop/CovenPraxisCard";

// `useTheme()` throws outside a `ThemeProvider` (#701); the score stamp uses it.
vi.mock("../../../hooks/useTheme", () => ({
  useTheme: () => ({ theme: "light", toggle: () => {} }),
}));

function praxis(overrides: Partial<PraxisCardOut> = {}): PraxisCardOut {
  return {
    id: 1,
    title: "Left a jar of soup on a neighbour's step",
    task_id: 4,
    task_title: "Feed somebody who did not ask",
    created_by_id: 7,
    created_by_display_name: "Morrow",
    created_by_faction_slug: "coven",
    created_by_avatar_url: "",
    task_faction_slug: "coven",
    task_level_required: 2,
    task_point_value: 12,
    member_count: 1,
    score: 13.6,
    display_multiplier: 1,
    metatask_points: 0,
    points_from_votes: 4,
    voter_count: 3,
    is_top_for_task: false,
    media_items: [],
    applied_metatasks: [],
    ...overrides,
  } as PraxisCardOut;
}

const adminProps = {
  praxis: praxis(),
  showAdminControls: false,
  onHide: () => {},
  onDelete: () => {},
} as unknown as Parameters<typeof CovenPraxisCard>[0]["adminProps"];

const html = () =>
  renderToStaticMarkup(
    <MemoryRouter>
      <CovenPraxisCard praxis={praxis()} adminProps={adminProps} />
    </MemoryRouter>,
  );

describe("the Coven praxis card wears the spell slip (#2135)", () => {
  it("grounds on the four-stop sheet, not the ward panel", () => {
    const frame = html().slice(0, html().indexOf(">"));
    expect(frame).toContain("--faction-coven-slip-from");
    expect(frame).toContain("--faction-coven-slip-vio");
    // The ward panel is still the PAPER for discs, so check the frame's background only.
    expect(frame).not.toContain("background:var(--faction-coven-ward-card)");
    expect(frame).toContain("overflow:hidden");
  });

  it("turns the cat in the bottom-right corner, at the task card's numbers", () => {
    const markup = html();
    expect(markup).toContain('class="cvn-wheel"');
    expect(markup).toContain("right:-6px");
    expect(markup).toContain("bottom:-4px");
    expect(markup).toContain("opacity:0.09");
  });

  it("hands the shared body INK, because DEEP does not clear AA on the sheet", () => {
    // `tint` paints the rival's name on the ground; `factionContrast.test.ts` gates it (#1295).
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <CovenPraxisCard
          praxis={praxis({ opponent_display_name: "Nettle" } as Partial<PraxisCardOut>)}
          adminProps={adminProps}
        />
      </MemoryRouter>,
    );
    const rival = markup.slice(markup.indexOf("Nettle") - 220, markup.indexOf("Nettle"));
    expect(rival).toContain("color:var(--faction-coven-slip-ink)");
    expect(rival).not.toContain("--faction-coven-slip-deep");
  });
});

/**
 * #2135 — the Coven praxis card wears the SLIP, and the cat comes with it.
 *
 * The seam is the card's rendered markup: the frame's own style attribute for
 * the ground, and the body's markup for the ink the shared blocks are handed.
 *
 * WHY EACH ASSERTION IS HERE. #1209 wrote the opposite decision into this file's
 * docstring — the panel ground inside the slip's pink edge, deliberately not the
 * slip — and an agent reading that docstring without this test would restore it
 * as a regression. And the ink swap is invisible to every other check: DEEP on
 * the ward panel and DEEP on the sheet both compile, both render, and only one
 * of them clears AA (3.33:1 on the gradient's darkest stop in light).
 *
 * SSR-only harness (renderToStaticMarkup, no DOM, effects never run), so these
 * are assertions about markup given props — never interaction.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../i18n";
import type { PraxisCardOut } from "../../../api/praxis";
import CovenPraxisCard from "../desktop/CovenPraxisCard";

// `useTheme()` throws outside a `ThemeProvider` by design (#701) and the score
// stamp reaches for it to pick the sun or the moon. Mocked rather than wrapped,
// the shape `covenVote.test.tsx` established: the theme is an input here, and
// nothing this file asserts depends on which half it gets.
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
    // The ward panel is still the PAPER for the discs drawn on the sheet, so
    // this is a claim about the frame's background alone.
    expect(frame).not.toContain("background:var(--faction-coven-ward-card)");
    // The mark clips to the die-cut corner rather than hanging off it.
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
    // `tint` is the shared body's `accent`, and the duel banner paints the
    // rival's NAME in it at --text-content, straight on the card ground. DEEP
    // reads 3.33:1 on the sheet's darkest stop in light and 4.70:1 on the ward
    // panel this card used to be — the ink has to move when the ground does
    // (#1295). `factionContrast.test.ts` gates the pair this picks.
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

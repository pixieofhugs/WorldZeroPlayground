/**
 * DuelCrossLink lifecycle guard (#313): active shows a marker only; settled
 * shows the live tally + cross-link; forfeited shows won-by-default / you-forfeited.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
// Initialize the i18n catalog so the copy keys resolve to English text.
import "../../../i18n";
import DuelCrossLink from "../DuelCrossLink";
import type { PraxisOut } from "../../../api/praxis";
import type { DuelDetailOut, DuelSideOut, DuelStatus } from "../../../api/duel";

const ME: DuelSideOut = {
  praxis_id: 10,
  character_id: 1,
  display_name: "Alice",
  faction_slug: "ua",
  avatar_url: "",
  points_from_votes: 12,
  is_submitted: true,
};
const FOE: DuelSideOut = {
  praxis_id: 20,
  character_id: 2,
  display_name: "Bob",
  faction_slug: "wow",
  avatar_url: "",
  points_from_votes: 7,
  is_submitted: true,
};

// The read page always renders "my" side; id matches the challenger praxis.
const PRAXIS = { id: 10 } as PraxisOut;

function duel(over: Partial<DuelDetailOut>): DuelDetailOut {
  return {
    id: 5,
    task_id: 7,
    status: "settled" as DuelStatus,
    forfeited_by_character_id: null,
    challenger: ME,
    opponent: FOE,
    viewer_is_participant: false,
    ...over,
  };
}

function text(d: DuelDetailOut): string {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <DuelCrossLink praxis={PRAXIS} duel={d} />
    </MemoryRouter>,
  );
  return html.replace(/<[^>]*>/g, "");
}

describe("DuelCrossLink", () => {
  it("active: shows a marker only, no tally", () => {
    const t = text(duel({ status: "active" }));
    expect(t).toMatch(/Dueling Bob/);
    expect(t).not.toMatch(/ahead|behind/i);
  });

  it("settled: shows the live tally and who's ahead", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DuelCrossLink praxis={PRAXIS} duel={duel({})} />
      </MemoryRouter>,
    );
    expect(html).toMatch(/href="\/praxes\/20"/); // cross-link to opponent
    const t = html.replace(/<[^>]*>/g, "");
    expect(t).toMatch(/ahead/i); // 12 > 7
    expect(t).toMatch(/12/);
    expect(t).toMatch(/7/);
  });

  it("forfeited by the opponent: won by default", () => {
    const t = text(duel({ forfeited_by_character_id: FOE.character_id }));
    expect(t).toMatch(/Won by default/i);
    expect(t).toMatch(/Bob forfeited/);
  });

  it("forfeited by me: you forfeited", () => {
    const t = text(duel({ forfeited_by_character_id: ME.character_id }));
    expect(t).toMatch(/You forfeited/i);
  });
});

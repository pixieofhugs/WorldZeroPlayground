/**
 * DuelCrossLink lifecycle guard (#313): active shows a marker only; settled
 * shows the live tally + cross-link; forfeited shows won-by-default / you-forfeited.
 *
 * #717 regression: pending and declined used to fall through to the settled
 * renderer, showing a live tally against someone who hadn't accepted or said no.
 * One case per DuelStatus below — the tally must appear for settled only.
 *
 * #999: labels key off the VIEWER, not the page. The default viewer here is a
 * PARTICIPANT whose own side is the challenger (ME), so the first-person copy
 * ("You've cast", "You won") is correct party copy — it used to be asserted
 * against a hardcoded `viewer_is_participant: false`, which encoded the very bug
 * this issue fixes. Dedicated spectator tests (no "You") and a wrong-page party
 * test live at the bottom.
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

// A spectator character who is neither side of the duel.
const SPECTATOR_ID = 99;

function duel(over: Partial<DuelDetailOut>): DuelDetailOut {
  return {
    id: 5,
    task_id: 7,
    status: "settled" as DuelStatus,
    forfeited_by_character_id: null,
    challenger: ME,
    opponent: FOE,
    // The default viewer is a PARTICIPANT (their side is the challenger, ME), so
    // the first-person lifecycle copy below is correct party copy (#999).
    viewer_is_participant: true,
    winner_character_id: null,
    challenger_final_points: null,
    opponent_final_points: null,
    ...over,
  };
}

// Render as ME (the challenger) by default — a party whose own side is ME.
function html(d: DuelDetailOut, viewerCharacterId: number | null = ME.character_id): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <DuelCrossLink praxis={PRAXIS} duel={d} viewerCharacterId={viewerCharacterId} />
    </MemoryRouter>,
  );
}

function text(d: DuelDetailOut, viewerCharacterId: number | null = ME.character_id): string {
  return html(d, viewerCharacterId).replace(/<[^>]*>/g, "");
}

// What the backend actually returns pre-accept (services/duel.py:107-118): the
// opponent's identity is real, but they have no praxis and no points yet.
const UNANSWERED_FOE: DuelSideOut = {
  ...FOE,
  praxis_id: null,
  points_from_votes: 0,
  is_submitted: false,
};

describe("DuelCrossLink", () => {
  it("pending: says the challenge is unanswered, with no tally (#717)", () => {
    const h = html(duel({ status: "pending", opponent: UNANSWERED_FOE }));
    expect(h).not.toMatch(/href="\/praxes\//); // nothing to cross-link to
    const t = h.replace(/<[^>]*>/g, "");
    expect(t).toMatch(/waiting for Bob to accept/i);
    expect(t).not.toMatch(/ahead|behind|tied|live/i);
  });

  it("declined: says it scores as an ordinary praxis, with no tally (#717)", () => {
    const t = text(duel({ status: "declined", opponent: UNANSWERED_FOE }));
    expect(t).toMatch(/Bob declined/i);
    expect(t).toMatch(/ordinary praxis/i);
    expect(t).not.toMatch(/ahead|behind|tied|live/i);
  });

  it("active: shows a marker only, no tally", () => {
    const t = text(duel({ status: "active" }));
    expect(t).toMatch(/Dueling Bob/);
    expect(t).not.toMatch(/ahead|behind/i);
  });

  it("settled: shows the live tally and who's ahead", () => {
    const h = html(duel({}));
    expect(h).toMatch(/href="\/praxes\/20"/); // cross-link to opponent
    const t = h.replace(/<[^>]*>/g, "");
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

  // ── #957 resolved: frozen final points + winner, never the live tally ───────

  it("resolved: shows the FROZEN final points, not the live tally", () => {
    const h = html(
      duel({
        status: "resolved",
        winner_character_id: ME.character_id,
        // Frozen values deliberately differ from the live points_from_votes
        // (12 / 7) so a live-tally fallthrough would fail this test.
        challenger_final_points: 9,
        opponent_final_points: 4,
      }),
    );
    const t = h.replace(/<[^>]*>/g, "");
    expect(t).toMatch(/9/);
    expect(t).toMatch(/4/);
    expect(t).not.toMatch(/12/); // the live tally must NOT appear
    expect(t).toMatch(/You won/i);
    expect(t).toMatch(/final/i);
    expect(t).not.toMatch(/live/i); // never the floating live standing
  });

  it("resolved: a loss reads as such", () => {
    const t = text(
      duel({
        status: "resolved",
        winner_character_id: FOE.character_id,
        challenger_final_points: 4,
        opponent_final_points: 9,
      }),
    );
    expect(t).toMatch(/You lost/i);
  });

  it("resolved no-contest: null winner + null final points shows no tally", () => {
    const t = text(
      duel({
        status: "resolved",
        winner_character_id: null,
        challenger_final_points: null,
        opponent_final_points: null,
      }),
    );
    expect(t).toMatch(/No contest/i);
    expect(t).not.toMatch(/ahead|behind|live/i);
  });

  // ── #718 rail content ──────────────────────────────────────────────────────
  // The rail grew from a one-liner to a roster + next-step line + stakes. The
  // stakes slot self-hides until the game config loads (it never does under
  // SSR), so these assert the roster and next-step halves.

  it("active: names who has cast and who is still walking", () => {
    const t = text(
      duel({
        status: "active",
        challenger: { ...ME, is_submitted: true },
        opponent: { ...FOE, is_submitted: false },
      }),
    );
    expect(t).toMatch(/sealed/i);
    expect(t).toMatch(/still walking/i);
  });

  it("active, my side uncast: the next step is mine", () => {
    const t = text(
      duel({
        status: "active",
        challenger: { ...ME, is_submitted: false },
        opponent: { ...FOE, is_submitted: false },
      }),
    );
    expect(t).toMatch(/Cast your praxis to seal the duel/i);
  });

  it("active, my side cast: the next step is theirs", () => {
    const t = text(
      duel({
        status: "active",
        challenger: { ...ME, is_submitted: true },
        opponent: { ...FOE, is_submitted: false },
      }),
    );
    expect(t).toMatch(/Waiting for Bob/i);
  });

  it("declined: stops at the verdict — no roster, no race to run", () => {
    const t = text(duel({ status: "declined", opponent: UNANSWERED_FOE }));
    expect(t).not.toMatch(/sealed|still walking/i);
  });

  // ── #999 viewer-keyed labelling ─────────────────────────────────────────────
  // A spectator (viewer_is_participant: false) gets neutral, named sides and NO
  // "You" copy; a party sees "You" on THEIR own side regardless of the page.

  it("spectator, settled: neutral named sides, no 'You', names the leader", () => {
    const t = text(
      duel({ viewer_is_participant: false }),
      SPECTATOR_ID,
    );
    expect(t).not.toMatch(/\byou\b/i); // never first-person for a spectator
    expect(t).not.toMatch(/you're ahead|you're behind/i);
    expect(t).toMatch(/Alice/); // both sides named
    expect(t).toMatch(/Bob/);
    expect(t).toMatch(/Alice leads/i); // 12 > 7, named — not "you're ahead"
  });

  it("spectator, resolved: names the winner, no 'You'", () => {
    const t = text(
      duel({
        viewer_is_participant: false,
        status: "resolved",
        winner_character_id: FOE.character_id,
        challenger_final_points: 4,
        opponent_final_points: 9,
      }),
      SPECTATOR_ID,
    );
    expect(t).not.toMatch(/\byou\b/i);
    expect(t).toMatch(/Bob won/i);
    expect(t).toMatch(/final/i);
  });

  it("spectator, forfeited: neutral won-by-default, no 'You'", () => {
    const t = text(
      duel({
        viewer_is_participant: false,
        forfeited_by_character_id: ME.character_id, // Alice (challenger) forfeited
      }),
      SPECTATOR_ID,
    );
    expect(t).not.toMatch(/\byou\b/i);
    expect(t).toMatch(/Bob won by default/i);
    expect(t).toMatch(/Alice forfeited/i);
  });

  it("party on the opponent's-eye view: 'You' follows the viewer, not the page", () => {
    // Viewer is Bob (the opponent, character_id 2) but rendering ON THE
    // CHALLENGER'S page (PRAXIS.id === 10 === Alice's praxis). "You" must land on
    // Bob's side, not Alice's — the old page-keyed logic cast Alice as "You".
    const t = text(
      duel({
        status: "active",
        viewer_is_participant: true,
        challenger: { ...ME, is_submitted: true }, // Alice has cast
        opponent: { ...FOE, is_submitted: false }, // Bob (the viewer) has not
      }),
      FOE.character_id,
    );
    // Bob is "You" now, so his name is replaced by "You"; Alice is the named foe.
    // (Tag-stripping glues words together, so no \b word boundary around "You".)
    expect(t).not.toMatch(/Bob/);
    expect(t).toMatch(/Alice/);
    expect(t).toMatch(/You/);
    // Viewer (Bob) hasn't cast → the next step is his.
    expect(t).toMatch(/Cast your praxis to seal the duel/i);
  });
});

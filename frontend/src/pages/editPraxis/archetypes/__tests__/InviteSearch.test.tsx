/**
 * The composer's OPPONENT chip (#1226) — it must name the OTHER side of the
 * duel, not the fixed `opponent` role. Accepting a challenge puts the viewer's
 * own praxis in the `opponent` role, so reading `duel.opponent.display_name`
 * directly printed the viewer's own name. `duelSides` (already written for
 * this exact surface) resolves the viewer's side from `praxis.created_by_id`
 * and the chip renders `.foe`.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../../../i18n";
import type { PraxisOut } from "../../../../api/praxis";
import type { DuelDetailOut, DuelSideOut } from "../../../../api/duel";
import type { EditPraxisState } from "../../useEditPraxis";
import { InviteSearch, type InviteSearchSkin } from "../controls";

const SKIN: InviteSearchSkin = {};

function duelSide(characterId: number, name: string): DuelSideOut {
  return {
    praxis_id: characterId,
    character_id: characterId,
    display_name: name,
    faction_slug: "na",
    avatar_url: "",
    points_from_votes: 0,
    is_submitted: false,
  };
}

/**
 * A duel side's composer state. `praxis.created_by_id` is the VIEWER's own
 * character id — a duel side's composer only ever renders its own praxis,
 * never the rival's (per the reproduce case: "As B, open /praxis/<B's>/edit").
 */
function duelState(viewerCharacterId: number): EditPraxisState {
  const duel: DuelDetailOut = {
    id: 7,
    task_id: 3,
    status: "active",
    forfeited_by_character_id: null,
    challenger: duelSide(1, "Challenger Name"),
    opponent: duelSide(2, "Opponent Name"),
    viewer_is_participant: true,
    winner_character_id: null,
    challenger_final_points: null,
    opponent_final_points: null,
  };
  const praxis = {
    id: 1,
    type: "solo",
    duel_id: 7,
    created_by_id: viewerCharacterId,
    members: [],
    invites: [],
  } as unknown as PraxisOut;
  return {
    praxis,
    duel,
    duelMode: true,
    currentCharacterId: viewerCharacterId,
  } as unknown as EditPraxisState;
}

function chipHtml(state: EditPraxisState): string {
  return renderToStaticMarkup(<InviteSearch state={state} skin={SKIN} />);
}

describe("InviteSearch — the duel chip names the other side (#1226)", () => {
  it("names the opponent when the viewer is the challenger", () => {
    const html = chipHtml(duelState(1));
    expect(html).toContain("Opponent Name");
    expect(html).not.toContain("Challenger Name");
  });

  // The accepting side: the viewer occupies the fixed `opponent` ROLE, so a
  // read of `duel.opponent.display_name` used to print the viewer's own name.
  it("names the challenger when the viewer is the accepting side", () => {
    const html = chipHtml(duelState(2));
    expect(html).toContain("Challenger Name");
    expect(html).not.toContain("Opponent Name");
  });
});

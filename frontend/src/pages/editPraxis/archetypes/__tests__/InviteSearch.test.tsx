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
import type { PraxisInviteOut, PraxisMemberOut, PraxisOut } from "../../../../api/praxis";
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

/**
 * #1274 — the composer's collab block for a crew of ONE.
 *
 * Two facts have to survive together on this surface, which is why they are
 * asserted in one place: the roster now renders (it is gated on `type`, and a
 * collab is a collab at one member), and the pending-invite chip path still
 * draws the person who was asked. The chip is what the roster's `awaiting` line
 * defers to here — the composer is the one mount that withholds `invites` from
 * `CollabRoster`, because printing the same name twice, once without the
 * rescind ×, would be worse than the bug.
 *
 * `praxis.invites` reaches this render straight from `GET /praxes/:id`, which
 * the composer re-fetches after `inviteToPraxis` resolves (`useEditPraxis`
 * `sendInvite`). The backend serialises `invites` to MEMBERS ONLY
 * (`build_praxis_out`), which is why the read page's roster carries the line
 * itself and a stranger sees the neutral fallback.
 */
function member(characterId: number, name: string): PraxisMemberOut {
  return {
    id: characterId * 10,
    praxis_id: 1,
    character_id: characterId,
    character_display_name: name,
    has_submitted: false,
    joined_at: "2026-01-01T00:00:00Z",
  };
}

function pendingInvite(name: string): PraxisInviteOut {
  return {
    id: 55,
    praxis_id: 1,
    inviter_id: 1,
    invitee_id: 2,
    inviter_display_name: "Sole Author",
    invitee_display_name: name,
    status: "pending",
    created_at: "2026-01-01T00:00:00Z",
  };
}

function collabState(invites: PraxisInviteOut[]): EditPraxisState {
  const praxis = {
    id: 1,
    type: "collab",
    duel_id: null,
    created_by_id: 1,
    task_faction_slug: "snide",
    task_point_value: 12,
    members: [member(1, "Sole Author")],
    invites,
  } as unknown as PraxisOut;
  return {
    praxis,
    duel: null,
    duelMode: false,
    currentCharacterId: 1,
    inviteQuery: "",
    inviteResults: [],
    inviteOpen: false,
    autoSubmitDays: 3,
  } as unknown as EditPraxisState;
}

describe("InviteSearch — a collab whose crew is still one (#1274)", () => {
  it("lists the sole member instead of hiding the roster under the count", () => {
    expect(chipHtml(collabState([]))).toContain("Sole Author");
  });

  it("reports no consensus over a crew of one", () => {
    const html = chipHtml(collabState([]));
    expect(html).not.toContain("progressbar");
    expect(html).not.toContain("1 of 1");
  });

  it("still draws the pending-invite chip and its rescind control", () => {
    const html = chipHtml(collabState([pendingInvite("Asked Player")]));
    expect(html).toContain("Asked Player");
    expect(html).toContain("pending");
    expect(html).toContain("rescind invite to Asked Player");
  });

  // The chip owns the invitee's name on this surface, so the roster must not
  // print it a second time.
  it("names the invitee exactly once", () => {
    const html = chipHtml(collabState([pendingInvite("Asked Player")]));
    expect(html.split("Asked Player").length - 1).toBe(2); // chip text + aria-label
  });
});

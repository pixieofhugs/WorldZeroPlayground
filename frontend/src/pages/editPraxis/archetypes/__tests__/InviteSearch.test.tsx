/**
 * The composer's duel block and its invite affordance.
 *
 * #1226 — the block must name the OTHER side of the duel, not the fixed
 * `opponent` role. Accepting a challenge puts the viewer's own praxis in the
 * `opponent` role, so reading `duel.opponent.display_name` directly printed the
 * viewer's own name. `duelSides` (already written for this exact surface)
 * resolves the viewer's side from `praxis.created_by_id`.
 *
 * #1417 turned that single inline chip into the facing PAIR, so the guard is
 * stated as an ordering rather than as an absence: both names are drawn now, and
 * what #1226 was really protecting is that the viewer is on the viewer's side
 * and the rival is across the `vs`. A regression to `duel.opponent` would swap
 * them, which the order assertions catch.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../../../i18n";
import type { PraxisInviteOut, PraxisMemberOut, PraxisOut } from "../../../../api/praxis";
import type { DuelDetailOut, DuelSideOut, DuelStatus } from "../../../../api/duel";
import type { EditPraxisState } from "../../useEditPraxis";
import { InviteSearch, type InviteSearchSkin } from "../controls";

const SKIN: InviteSearchSkin = {};

function duelSide(
  characterId: number,
  name: string,
  isSubmitted = false,
): DuelSideOut {
  return {
    praxis_id: characterId,
    character_id: characterId,
    display_name: name,
    faction_slug: "na",
    avatar_url: "",
    points_from_votes: 0,
    is_submitted: isSubmitted,
  };
}

/**
 * A duel side's composer state. `praxis.created_by_id` is the VIEWER's own
 * character id — a duel side's composer only ever renders its own praxis,
 * never the rival's (per the reproduce case: "As B, open /praxis/<B's>/edit").
 */
function duelState(
  viewerCharacterId: number,
  options: {
    status?: DuelStatus;
    challengerSubmitted?: boolean;
    opponentSubmitted?: boolean;
    /** The detail fetch has not landed (or failed) — praxis.duel_id is still set. */
    detailMissing?: boolean;
  } = {},
): EditPraxisState {
  const duel: DuelDetailOut = {
    id: 7,
    task_id: 3,
    status: options.status ?? "active",
    forfeited_by_character_id: null,
    challenger: duelSide(1, "Challenger Name", options.challengerSubmitted),
    opponent: duelSide(2, "Opponent Name", options.opponentSubmitted),
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
    duel: options.detailMissing ? null : duel,
    duelMode: true,
    currentCharacterId: viewerCharacterId,
  } as unknown as EditPraxisState;
}

function chipHtml(state: EditPraxisState): string {
  return renderToStaticMarkup(<InviteSearch state={state} skin={SKIN} />);
}

describe("InviteSearch — the duel pair names the other side (#1226, #1417)", () => {
  it("puts the rival across the vs when the viewer is the challenger", () => {
    const html = chipHtml(duelState(1));
    expect(html).toContain("Challenger Name");
    expect(html).toContain("Opponent Name");
    expect(html.indexOf("Challenger Name")).toBeLessThan(
      html.indexOf("Opponent Name"),
    );
  });

  // The accepting side: the viewer occupies the fixed `opponent` ROLE, so a
  // read of `duel.opponent.display_name` used to print the viewer's own name.
  it("puts the rival across the vs when the viewer is the accepting side", () => {
    const html = chipHtml(duelState(2));
    expect(html.indexOf("Opponent Name")).toBeLessThan(
      html.indexOf("Challenger Name"),
    );
  });
});

describe("InviteSearch — the compose-stage duel pair (#1417)", () => {
  it("draws the facing pair rather than one inline chip", () => {
    const html = chipHtml(duelState(1));
    expect(html).toContain(">vs<");
    expect(html).toContain("Challenge accepted");
  });

  it("reads out each side's filing state separately", () => {
    const html = chipHtml(
      duelState(1, { challengerSubmitted: false, opponentSubmitted: true }),
    );
    expect(html).toContain("still writing");
    expect(html).toContain("sealed");
  });

  // The design's static mock simply had nowhere to put these; that is not a
  // decision to remove them (#1417).
  it("keeps the dissolve control on an accepted duel", () => {
    expect(chipHtml(duelState(1))).toContain("dissolve the duel");
  });

  it("keeps the rescind control on a still-pending challenge", () => {
    const html = chipHtml(duelState(1, { status: "pending" }));
    expect(html).toContain("cancel challenge");
    expect(html).toContain("Challenge sent");
  });

  // The detail fetch is swallowed on failure (`useComposerDuel`), so the one
  // control that gets the player out of a challenge they can no longer see has
  // to survive a missing duel.
  it("still offers the rescind when the duel detail never arrived", () => {
    const html = chipHtml(duelState(1, { detailMissing: true }));
    expect(html).toContain("cancel challenge");
    expect(html).not.toContain(">vs<");
  });
});

/**
 * #1274 — the composer's collab block for a crew of ONE.
 *
 * Two facts have to survive together on this surface, which is why they are
 * asserted in one place: the roster renders (it is gated on `type`, and a collab
 * is a collab at one member), and the person who was asked is still drawn, with
 * the rescind × still reachable.
 *
 * #1416 changed WHERE. The pending-invite chips this file was written against
 * are gone: the roster draws invited and declined as rows of its own and carries
 * the rescind ×, so the composer now passes `invites` like every other mount.
 * The old comment here defended the chips on the grounds that the roster would
 * otherwise print the same name twice — which was true, and the fix was to stop
 * printing it in two widgets rather than to withhold data from one of them.
 *
 * `praxis.invites` reaches this render straight from `GET /praxes/:id`, which
 * the composer re-fetches after `inviteToPraxis` resolves (`useEditPraxis`
 * `sendInvite`). The backend serialises `invites` to MEMBERS ONLY
 * (`build_praxis_out`), which is why a stranger's read view has none at all.
 */
function member(
  characterId: number,
  name: string,
  hasSubmitted = false,
): PraxisMemberOut {
  return {
    id: characterId * 10,
    praxis_id: 1,
    character_id: characterId,
    character_display_name: name,
    has_submitted: hasSubmitted,
    joined_at: "2026-01-01T00:00:00Z",
  };
}

function pendingInvite(name: string): PraxisInviteOut {
  return {
    id: 55,
    praxis_id: 1,
    inviter_id: 1,
    invitee_id: 2,
    invitee_display_name: name,
    status: "pending",
    created_at: "2026-01-01T00:00:00Z",
  };
}

function collabState(
  invites: PraxisInviteOut[],
  members: PraxisMemberOut[] = [member(1, "Sole Author")],
): EditPraxisState {
  const praxis = {
    id: 1,
    type: "collab",
    duel_id: null,
    created_by_id: 1,
    task_faction_slug: "snide",
    task_point_value: 12,
    members,
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
    cancelInvite: () => {},
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

  it("draws the invitee as a roster row, with the rescind control on it", () => {
    const html = chipHtml(collabState([pendingInvite("Asked Player")]));
    expect(html).toContain("Asked Player");
    expect(html).toContain("invited");
    expect(html).toContain("rescind invite to Asked Player");
  });

  // The roster owns the invitee's name on this surface. Nothing else may print
  // it — not a chip beside the roster, and not the awaiting line beneath it,
  // which is the pair of duplications #1416 collapsed.
  it("names the invitee exactly once", () => {
    const html = chipHtml(collabState([pendingInvite("Asked Player")]));
    expect(html.split("Asked Player").length - 1).toBe(2); // row text + aria-label
  });
});

/**
 * #1417 — the `+ invite` chip, and the rule about when inviting is possible.
 *
 * The chip replaces a permanently-open text input that took a whole row of the
 * composer. The harness is `renderToStaticMarkup`, so what is asserted here is
 * the CLOSED reading: the chip is drawn and the search box is not. Opening it is
 * a click, which this harness cannot make.
 */
describe("InviteSearch — the + invite chip (#1417)", () => {
  it("draws the chip instead of a permanently open search box", () => {
    const html = chipHtml(collabState([]));
    expect(html).toContain("+ invite");
    expect(html).not.toContain("search players to invite");
  });

  // The backend's `invite_to_praxis` refuses only once the PRAXIS is submitted,
  // never once a member has cast — so a collab where one person has filed could
  // not invite anybody, and no server rule said so.
  it("still offers the chip once a member has filed", () => {
    const html = chipHtml(collabState([], [
      member(1, "Sole Author"),
      member(2, "Early Filer", true),
    ]));
    expect(html).toContain("+ invite");
  });
});

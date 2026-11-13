/**
 * The composer's duel block and invite affordance. #1226: the viewer may hold
 * the `opponent` role, so the pair must resolve sides via `duelSides`; a
 * regression to `duel.opponent` swaps the order the assertions check.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../../../i18n";
import type { PraxisInviteOut, PraxisMemberOut, PraxisOut } from "../../../../api/praxis";
import type { DuelDetailOut, DuelSideOut, DuelStatus } from "../../../../api/duel";
import type { CharacterOut } from "../../../../api/characters";
import type { EditPraxisState } from "../../useEditPraxis";
import { anEditPraxisState } from "../../../../test/fixtures";
import { InviteSearch, type InviteSearchSkin } from "../controls";
import { collabCopy } from "../../../../components/collab/collabCopy";

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
    nudged_at: null,
    win_multiplier: 1,
    loss_multiplier: 1,
    tie_multiplier: 1,
  };
}

/** `praxis.created_by_id` is the viewer: a side only edits its own praxis. */
function duelState(
  viewerCharacterId: number,
  options: {
    status?: DuelStatus;
    challengerSubmitted?: boolean;
    opponentSubmitted?: boolean;
    /** Detail fetch missing; praxis.duel_id still set. */
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
  return anEditPraxisState({
    praxis,
    duel: options.detailMissing ? null : duel,
    duelMode: true,
    currentCharacterId: viewerCharacterId,
  });
}

function chipHtml(state: EditPraxisState): string {
  return renderToStaticMarkup(
    <InviteSearch {...state} praxis={state.praxis!} skin={SKIN} />,
  );
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
    // #1863: a duel side that is in reads `submitted`, not `sealed`.
    expect(html).toContain("submitted");
  });

  // Absent from the design mock, but not removed (#1417).
  it("keeps the dissolve control on an accepted duel", () => {
    expect(chipHtml(duelState(1))).toContain("dissolve the duel");
  });

  it("keeps the rescind control on a still-pending challenge", () => {
    const html = chipHtml(duelState(1, { status: "pending" }));
    expect(html).toContain("cancel challenge");
    expect(html).toContain("Challenge sent");
  });

  // `useComposerDuel` swallows fetch failures; the rescind must survive that.
  it("still offers the rescind when the duel detail never arrived", () => {
    const html = chipHtml(duelState(1, { detailMissing: true }));
    expect(html).toContain("cancel challenge");
    expect(html).not.toContain(">vs<");
  });
});

/** #2128: avatars are per side; both cases render in one pass. */
describe("InviteSearch — the duel pair draws faces, not initials (#2128)", () => {
  it("draws the portrait for the side that has one, the monogram for the side that does not", () => {
    const state = duelState(1, { status: "pending" });
    state.duel!.opponent.avatar_url = "avatars/rax.png";
    const html = chipHtml(state);
    expect(html).toContain("avatars/rax.png");
    expect(html).toContain("<img");
    expect(html).toContain(">CN<");
  });
});

/**
 * #1274: a collab of ONE still renders its roster (gated on `type`), and the
 * invitee is drawn as a roster row with the rescind × (#1416).
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
    character_avatar_url: "",
    has_submitted: hasSubmitted,
    is_done: false,
    joined_at: "2026-01-01T00:00:00Z",
    nudged_at: null,
    submitted_at: null,
  };
}

function pendingInvite(name: string): PraxisInviteOut {
  return {
    id: 55,
    praxis_id: 1,
    inviter_id: 1,
    invitee_id: 2,
    invitee_display_name: name,
    invitee_avatar_url: "",
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
  return anEditPraxisState({
    praxis,
    currentCharacterId: 1,
    autoSubmitDays: 3,
  });
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
    expect(html).toContain(collabCopy(null, "pillInvited"));
    expect(html).toContain("rescind invite to Asked Player");
  });

  // Only the roster prints the name (#1416 removed two duplicates).
  it("names the invitee exactly once", () => {
    const html = chipHtml(collabState([pendingInvite("Asked Player")]));
    expect(html.split("Asked Player").length - 1).toBe(2); // row text + aria-label
  });
});

/** #1417: the `+ invite` chip. Static markup, so only the closed state. */
describe("InviteSearch — the + invite chip (#1417)", () => {
  it("draws the chip instead of a permanently open search box", () => {
    const html = chipHtml(collabState([]));
    expect(html).toContain("+ invite");
    expect(html).not.toContain("search players to invite");
  });

  // `invite_to_praxis` refuses only once the PRAXIS is submitted.
  it("still offers the chip once a member has filed", () => {
    const html = chipHtml(collabState([], [
      member(1, "Sole Author"),
      member(2, "Early Filer", true),
    ]));
    expect(html).toContain("+ invite");
  });
});

/**
 * #1962: a result row must tell namesakes apart (handle + avatar). Duel mode,
 * because only it renders open without a click; collab shares the row.
 */
function searchResult(
  id: number,
  displayName: string,
  username: string,
  avatarUrl = "",
): CharacterOut {
  return {
    id,
    username,
    display_name: displayName,
    avatar_url: avatarUrl,
    faction_slug: "na",
    bio: "",
    tagline: "",
    location: "",
    level: 1,
    score: 0,
    all_time_score: 0,
    status: "active",
    invitations: [],
    badges: [],
    created_at: "2026-01-01T00:00:00Z",
  };
}

/** No duel attached, so the box shows. */
function searchState(results: CharacterOut[]): EditPraxisState {
  const praxis = {
    id: 1,
    type: "solo",
    duel_id: null,
    created_by_id: 1,
    task_faction_slug: "na",
    members: [],
    invites: [],
  } as unknown as PraxisOut;
  return anEditPraxisState({
    praxis,
    duelMode: true,
    currentCharacterId: 1,
    inviteQuery: "pixie",
    inviteResults: results,
    inviteOpen: true,
  });
}

describe("InviteSearch — a result row names the person (#1962)", () => {
  const NAMESAKES = [
    searchResult(2, "Pixie", "pixieofhugs", "avatars/pixie.png"),
    searchResult(3, "Pixie", "pixie_alt"),
  ];

  it("prints each result's handle, which is what tells namesakes apart", () => {
    const html = chipHtml(searchState(NAMESAKES));
    expect(html).toContain("@pixieofhugs");
    expect(html).toContain("@pixie_alt");
  });

  it("draws the uploaded portrait rather than a bare tinted dot", () => {
    const html = chipHtml(searchState(NAMESAKES));
    expect(html).toContain("avatars/pixie.png");
  });

  it("falls back to the handle's monogram when there is no portrait", () => {
    const html = chipHtml(searchState([NAMESAKES[1]]));
    expect(html).toContain(">P<");
  });
});

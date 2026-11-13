/**
 * #2880 — the roster mounts alone: every action answers with a `RosterOutcome`
 * and `useEditPraxis` writes praxis, error line and duel detail. It takes the
 * read-only `DuelPaneView` because a rival's nudge must reach THEIR side
 * (ADR-0011).
 *
 * Probe via `renderToStaticMarkup` (node env); search/foe-ordering effects don't
 * run and are left to live QA.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  summariseCrewNudge,
  useComposerRoster,
  type DuelPaneView,
} from "../useComposerRoster";
import { AuthContext } from "../../../auth/AuthContext";
import {
  aCharacter,
  aCurrentUser,
  aDuel,
  aDuelSide,
  aMember,
  aPraxis,
} from "../../../test/fixtures";
import type { PraxisOut } from "../../../api/praxis";
import type { NudgeResultOut } from "../../../api/nudge";
import { ApiError } from "../../../api/apiError";

/* Spread the real module so sibling exports stay real. */
vi.mock("../../../api/praxis", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../api/praxis")>()),
  getPraxis: vi.fn(),
  inviteToPraxis: vi.fn(),
  cancelInvite: vi.fn(),
  kickMember: vi.fn(),
}));
vi.mock("../../../api/duel", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../api/duel")>()),
  issueChallenge: vi.fn(),
  getDuelDetail: vi.fn(),
}));
vi.mock("../../../api/nudge", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../api/nudge")>()),
  sendNudge: vi.fn(),
  nudgeTheCrew: vi.fn(),
}));

import {
  cancelInvite,
  getPraxis,
  inviteToPraxis,
  kickMember,
} from "../../../api/praxis";
import { getDuelDetail, issueChallenge } from "../../../api/duel";
import { nudgeTheCrew, sendNudge } from "../../../api/nudge";

const getPraxisMock = vi.mocked(getPraxis);
const inviteMock = vi.mocked(inviteToPraxis);
const cancelInviteMock = vi.mocked(cancelInvite);
const kickMock = vi.mocked(kickMember);
const challengeMock = vi.mocked(issueChallenge);
const getDuelDetailMock = vi.mocked(getDuelDetail);
const sendNudgeMock = vi.mocked(sendNudge);
const nudgeCrewMock = vi.mocked(nudgeTheCrew);

const VIEWER = aCurrentUser();
/** The rival is on their OWN praxis (ADR-0011). */
const RIVAL = aDuelSide({ praxis_id: 88, character_id: 42, display_name: "Rax" });
const DUEL = aDuel({ id: 7, opponent: RIVAL });

const COLLAB = aPraxis({ id: 3, type: "collab" });
const REFRESHED = aPraxis({ id: 3, type: "collab", members: [aMember()] });

const INVITEE = aCharacter({ id: 9, display_name: "Wren" });

const NO_DUEL: DuelPaneView = { duel: null, paneOpen: false };

/** Viewer via raw `AuthContext`: `AuthProvider` fetches in an effect. */
function roster(praxis: PraxisOut | null, duelPane: DuelPaneView = NO_DUEL) {
  let captured: ReturnType<typeof useComposerRoster> | undefined;
  function Probe() {
    captured = useComposerRoster({ praxis, duelPane });
    return null;
  }
  renderToStaticMarkup(
    <AuthContext.Provider
      value={{
        user: VIEWER,
        loading: false,
        refetch: async () => {},
        applyUser: () => {},
        signOut: async () => {},
      }}
    >
      <Probe />
    </AuthContext.Provider>,
  );
  if (!captured) throw new Error("the probe never rendered");
  return captured;
}

const aNudgeResult = (over: Partial<NudgeResultOut> = {}): NudgeResultOut => ({
  to_character_id: 1,
  nudge: null,
  error: null,
  status_code: 200,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  getPraxisMock.mockResolvedValue(REFRESHED);
  inviteMock.mockResolvedValue({} as never);
  cancelInviteMock.mockResolvedValue(undefined as never);
  kickMock.mockResolvedValue(REFRESHED);
  challengeMock.mockResolvedValue({} as never);
  getDuelDetailMock.mockResolvedValue(DUEL);
  sendNudgeMock.mockResolvedValue({} as never);
  nudgeCrewMock.mockResolvedValue([]);
});

describe("useComposerRoster, without the assembler", () => {
  it("invites, then hands the reloaded praxis back", async () => {
    const outcome = await roster(COLLAB).sendInvite(INVITEE);

    expect(inviteMock).toHaveBeenCalledWith(3, 9);
    expect(getPraxisMock).toHaveBeenCalledWith(3);
    expect(outcome).toEqual({ kind: "applied", praxis: REFRESHED });
  });

  it("reports a refused invite rather than throwing or swallowing it", async () => {
    // A 4xx with no detail: `extractError` falls back to the hook's own line.
    inviteMock.mockRejectedValue(
      new ApiError(new Response(null, { status: 409 }), {}),
    );

    const outcome = await roster(COLLAB).sendInvite(INVITEE);

    expect(outcome.kind).toBe("failed");
    expect(outcome.kind === "failed" && outcome.message).toContain("Wren");
    expect(getPraxisMock).not.toHaveBeenCalled();
  });

  it("does nothing at all before the praxis has loaded", async () => {
    const outcome = await roster(null).sendInvite(INVITEE);

    expect(outcome).toEqual({ kind: "unchanged" });
    expect(inviteMock).not.toHaveBeenCalled();
  });

  it("rescinds a pending invite and reloads (#421)", async () => {
    const outcome = await roster(COLLAB).cancelInvite(12);

    expect(cancelInviteMock).toHaveBeenCalledWith(3, 12);
    expect(outcome).toEqual({ kind: "applied", praxis: REFRESHED });
  });

  it("kicks on the route's own answer, with no second read (#959)", async () => {
    const outcome = await roster(COLLAB).kickMember(4);

    expect(kickMock).toHaveBeenCalledWith(3, 4);
    expect(getPraxisMock).not.toHaveBeenCalled();
    expect(outcome).toEqual({ kind: "applied", praxis: REFRESHED });
  });

  it("aims a duel nudge at the RIVAL's own praxis, and refreshes the duel", async () => {
    const duelling = aPraxis({ id: 3, duel_id: 7 });
    getPraxisMock.mockResolvedValue(duelling);

    const outcome = await roster(duelling, {
      duel: DUEL,
      paneOpen: false,
    }).nudge(42);

    // Not praxis 3 — the rival owes THEIR side (ADR-0011).
    expect(sendNudgeMock).toHaveBeenCalledWith(88, 42);
    expect(getDuelDetailMock).toHaveBeenCalledWith(7);
    expect(outcome).toEqual({
      kind: "applied",
      praxis: duelling,
      duel: DUEL,
    });
  });

  it("aims a collab nudge at this praxis, and reads no duel (#1083)", async () => {
    const outcome = await roster(COLLAB).nudge(4);

    expect(sendNudgeMock).toHaveBeenCalledWith(3, 4);
    expect(getDuelDetailMock).not.toHaveBeenCalled();
    expect(outcome).toEqual({ kind: "applied", praxis: REFRESHED });
  });

  it("pokes the whole crew in ONE request and reloads (#1418)", async () => {
    const outcome = await roster(COLLAB).nudgeCrew();

    // The server derives the crew and the 24h window; not a fan-out of `nudge()`.
    expect(nudgeCrewMock).toHaveBeenCalledWith(3);
    expect(sendNudgeMock).not.toHaveBeenCalled();
    expect(outcome).toEqual({ kind: "applied", praxis: REFRESHED });
  });
});

/** Pure, because the SSR probe can't read state `nudgeCrew` writes post-render. */
describe("summariseCrewNudge (#1418)", () => {
  it("counts a partly refused press as sent AND skipped", () => {
    expect(
      summariseCrewNudge([
        aNudgeResult({ to_character_id: 4, nudge: {} as never }),
        aNudgeResult({ to_character_id: 5, error: "too soon", status_code: 422 }),
        aNudgeResult({ to_character_id: 6, nudge: {} as never }),
      ]),
    ).toEqual({ sent: 2, skipped: 1 });
  });

  it("reports a wholly refused press as nothing sent, not as nothing at all", () => {
    expect(
      summariseCrewNudge([
        aNudgeResult({ error: "too soon", status_code: 422 }),
      ]),
    ).toEqual({ sent: 0, skipped: 1 });
  });

  it("challenges through the same box, and reloads for the new duel_id (#311)", async () => {
    const outcome = await roster(COLLAB, {
      duel: null,
      paneOpen: true,
    }).sendChallenge(INVITEE);

    expect(challengeMock).toHaveBeenCalledWith({
      challenger_praxis_id: 3,
      opponent_character_id: 9,
    });
    expect(outcome).toEqual({ kind: "applied", praxis: REFRESHED });
  });
});

/**
 * #2880 — the roster is driven on its own, with no assembler around it.
 *
 * `useComposerRoster` took six things: `praxis`, `setPraxis`, `setError`, and
 * `duel`/`setDuel`/`duelPaneOpen` from a SIBLING hook. Reaching `sendInvite`
 * therefore meant standing the whole composer up — the room, the auth context,
 * the media tray, the confirms — so the invite, kick and nudge flows had no
 * test at all. That is the seam this file pins.
 *
 * The roster now *reports*: every action answers with a `RosterOutcome` and
 * `useEditPraxis` writes the praxis, the error line and the duel detail it
 * owns. What it still takes from the pane beside it is `DuelPaneView` — two
 * read-only facts, because the same box picks an opponent while the pane is
 * open, and a nudge aimed at a rival must reach THEIR side of the duel
 * (ADR-0011). An input, not a setter.
 *
 * HOW A HOOK IS DRIVEN HERE
 * -------------------------
 * vitest runs in the `node` environment (see `vite.config.ts`) — no jsdom, and
 * so no `renderHook`. A probe component rendered with `renderToStaticMarkup`
 * gets us the hook's return value, and the callbacks on it are ordinary
 * closures we can await afterwards. What that cannot cover is the search
 * effect, the foe-ordering read, or the picker state they write, since effects
 * never run on the server: those are unchanged by this refactor and stay
 * covered by live QA.
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

/* Every mock spreads the real module first: a wholesale factory would blank the
 * siblings (the praxis client's other twenty exports) for anything else this
 * file ever mounts. */
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
/** The rival: the other side of the duel, on their OWN praxis (ADR-0011). */
const RIVAL = aDuelSide({ praxis_id: 88, character_id: 42, display_name: "Rax" });
const DUEL = aDuel({ id: 7, opponent: RIVAL });

/** The collab as the composer holds it, and as the server answers it back. */
const COLLAB = aPraxis({ id: 3, type: "collab" });
const REFRESHED = aPraxis({ id: 3, type: "collab", members: [aMember()] });

const INVITEE = aCharacter({ id: 9, display_name: "Wren" });

/** Neither duelling nor picking an opponent: the ordinary collab composer. */
const NO_DUEL: DuelPaneView = { duel: null, paneOpen: false };

/**
 * Mount `useComposerRoster` and nothing else, and hand back what it returns.
 * The viewer arrives through the exported `AuthContext` — `AuthProvider`
 * fetches, and effects never run here.
 */
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
    // A 4xx that ARRIVED with no usable detail: `extractError` hands that back
    // to the caller's own line, which is the one this hook composes.
    inviteMock.mockRejectedValue(
      new ApiError(new Response(null, { status: 409 }), {}),
    );

    const outcome = await roster(COLLAB).sendInvite(INVITEE);

    expect(outcome.kind).toBe("failed");
    // The message is the roster's own — it knows which call failed and who it
    // named; the assembler only knows there is a line to print.
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

    // No recipient list: the server derives the crew and applies the 24h
    // window, which is why this is not a fan-out of `nudge()`.
    expect(nudgeCrewMock).toHaveBeenCalledWith(3);
    expect(sendNudgeMock).not.toHaveBeenCalled();
    expect(outcome).toEqual({ kind: "applied", praxis: REFRESHED });
  });
});

/**
 * The counts the crew button reports, at their own seam.
 *
 * `nudgeCrew` writes them to state the roster owns, and state written after
 * render is the one thing an SSR probe cannot read back — so the arithmetic
 * lives in a pure function and is driven here instead.
 */
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

/**
 * #2879 — the duel pane is driven on its own, with no assembler around it.
 *
 * `useComposerDuel` used to borrow `setPraxis` and `setError` from
 * `useEditPraxis`, so the only way to reach `cancelDuel` was to stand the whole
 * composer up: the room, the auth context, the media tray, the confirms. That
 * is the seam this file pins. The pane now *reports* — every action answers
 * with a `DuelOutcome` — and the assembler is the one that writes the praxis
 * and the error line it owns. Which means the pane can be mounted alone.
 *
 * HOW A HOOK IS DRIVEN HERE
 * -------------------------
 * vitest runs in the `node` environment (see `vite.config.ts`) — no jsdom, and
 * so no `renderHook`. A probe component rendered with `renderToStaticMarkup`
 * gets us the hook's return value, and the callbacks on it are ordinary
 * closures we can await afterwards. What that cannot cover is the effect that
 * loads the duel detail, since effects do not run on the server; the chip's
 * load is unchanged by this refactor and stays covered by live QA.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { useComposerDuel } from "../useComposerDuel";
import { aPraxis } from "../../../test/fixtures";
import type { PraxisOut } from "../../../api/praxis";
import type { ConfirmRequest } from "../../../components/confirm/composerConfirms";

/* Both mocks spread the real module first: a wholesale factory would blank the
 * siblings (`issueChallenge`, the praxis client's other twenty exports) for
 * anything else this file ever mounts. */
vi.mock("../../../api/duel", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../api/duel")>()),
  cancelChallenge: vi.fn(),
  getDuelDetail: vi.fn(),
}));
vi.mock("../../../api/praxis", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../api/praxis")>()),
  getPraxis: vi.fn(),
}));

import { cancelChallenge } from "../../../api/duel";
import { getPraxis } from "../../../api/praxis";

const cancelChallengeMock = vi.mocked(cancelChallenge);
const getPraxisMock = vi.mocked(getPraxis);

/** The praxis as the composer holds it mid-duel: still solo, plus a duel_id. */
const DUELLING = aPraxis({ id: 3, duel_id: 7 });
/** The same praxis as the server answers once the challenge is gone. */
const RELEASED = aPraxis({ id: 3, duel_id: null });

/**
 * Mount `useComposerDuel` and nothing else, and hand back what it returns.
 * `askConfirm` defaults to an accept so a caller that is not testing the
 * dissolve confirm need not think about it.
 */
function duelPane(
  praxis: PraxisOut | null,
  askConfirm: (request: ConfirmRequest) => Promise<boolean> = async () => true,
) {
  let captured: ReturnType<typeof useComposerDuel> | undefined;
  function Probe() {
    captured = useComposerDuel({ praxis, askConfirm });
    return null;
  }
  renderToStaticMarkup(<Probe />);
  if (!captured) throw new Error("the probe never rendered");
  return captured;
}

beforeEach(() => {
  vi.clearAllMocks();
  cancelChallengeMock.mockResolvedValue({} as never);
  getPraxisMock.mockResolvedValue(RELEASED);
});

describe("useComposerDuel, without the assembler", () => {
  it("cancels the challenge and hands the reloaded praxis back", async () => {
    const outcome = await duelPane(DUELLING).cancelDuel();

    expect(cancelChallengeMock).toHaveBeenCalledWith(7);
    expect(getPraxisMock).toHaveBeenCalledWith(3);
    expect(outcome).toEqual({ kind: "cancelled", praxis: RELEASED });
  });

  it("reports a failed cancel rather than throwing or swallowing it", async () => {
    cancelChallengeMock.mockRejectedValue(new Error("nope"));

    const outcome = await duelPane(DUELLING).cancelDuel();

    expect(outcome.kind).toBe("failed");
    // The message is the pane's own — it knows which call failed; the assembler
    // only knows there is a line to print.
    expect(outcome.kind === "failed" && outcome.message).toBeTruthy();
    expect(getPraxisMock).not.toHaveBeenCalled();
  });

  it("does nothing at all on a solo draft with no duel attached", async () => {
    const outcome = await duelPane(aPraxis({ duel_id: null })).cancelDuel();

    expect(outcome).toEqual({ kind: "unchanged" });
    expect(cancelChallengeMock).not.toHaveBeenCalled();
  });

  it("asks before dissolving, and leaves the duel alone when refused", async () => {
    const asked: ConfirmRequest[] = [];
    const outcome = await duelPane(DUELLING, async (request) => {
      asked.push(request);
      return false;
    }).dissolveDuel();

    expect(asked.map((r) => r.kind)).toEqual(["dissolveDuel"]);
    expect(outcome).toEqual({ kind: "unchanged" });
    expect(cancelChallengeMock).not.toHaveBeenCalled();
  });

  it("dissolves through the same neutral cancel once confirmed", async () => {
    const outcome = await duelPane(DUELLING, async () => true).dissolveDuel();

    expect(cancelChallengeMock).toHaveBeenCalledWith(7);
    expect(outcome).toEqual({ kind: "cancelled", praxis: RELEASED });
  });
});

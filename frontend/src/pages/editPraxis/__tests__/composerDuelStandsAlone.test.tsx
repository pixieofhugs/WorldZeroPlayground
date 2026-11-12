/**
 * #2879 — the duel pane mounts alone: every action answers with a `DuelOutcome`
 * and the assembler writes the praxis and error line.
 *
 * Node env, no `renderHook`: a probe rendered with `renderToStaticMarkup` captures
 * the hook's return. Effects (the duel-detail load) don't run; live QA covers it.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { useComposerDuel } from "../useComposerDuel";
import { aPraxis } from "../../../test/fixtures";
import type { PraxisOut } from "../../../api/praxis";
import type { ConfirmRequest } from "../../../components/confirm/composerConfirms";

/* Spread the real module so sibling exports stay real. */
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

const DUELLING = aPraxis({ id: 3, duel_id: 7 });
const RELEASED = aPraxis({ id: 3, duel_id: null });

/** `askConfirm` defaults to accept. */
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

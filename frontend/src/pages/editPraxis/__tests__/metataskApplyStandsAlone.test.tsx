/**
 * #2878 — the seal stack is driven on its own, with no assembler around it.
 *
 * `useMetataskApply` used to borrow `setPraxis` and `setError` from
 * `useEditPraxis`, so reaching `addMetatask` meant standing the whole composer
 * up: the room, the auth context, the media tray, the confirms. The stack now
 * *reports* — a mutation answers with a `SealOutcome` carrying the re-scored
 * praxis the server sent — and the assembler writes the praxis and the error
 * line it owns. Same shape as #2879's `DuelOutcome`.
 *
 * This file also inherits #2464. `metataskStampFreshness.test.ts` asserted on
 * the hook's SOURCE — that neither mutation's answer is awaited into the void —
 * because the hook could not be rendered to observe which cell it wrote. It
 * can now, and both mutations are checked here against what the server
 * answered, so the source scan is deleted rather than kept beside its own
 * subject.
 *
 * HOW A HOOK IS DRIVEN HERE
 * -------------------------
 * vitest runs in the `node` environment (see `vite.config.ts`) — no jsdom, and
 * so no `renderHook`. A probe component rendered with `renderToStaticMarkup`
 * gets us the hook's return value, and the callbacks on it are ordinary
 * closures we can await afterwards.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { useMetataskApply } from "../useMetataskApply";
import { aMetatask, aPraxis } from "../../../test/fixtures";
import type { PraxisOut } from "../../../api/praxis";

/* Spreads the real module first: a wholesale factory would blank the praxis
 * client's other twenty exports for anything else this file ever mounts. */
vi.mock("../../../api/praxis", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../api/praxis")>()),
  applyMetatask: vi.fn(),
  removeMetatask: vi.fn(),
}));

import { applyMetatask, removeMetatask } from "../../../api/praxis";

const applyMock = vi.mocked(applyMetatask);
const removeMock = vi.mocked(removeMetatask);

/** The draft as the composer holds it: a task worth 12, no seals yet. */
const DRAFT = aPraxis({ id: 3, score: 12, metatask_points: 0 });
/** What the server answers once a +100 seal lands — the number is on the wire. */
const RESCORED = aPraxis({ id: 3, score: 112, metatask_points: 100 });
const SEAL = aMetatask({ id: 41 });

/** Mount `useMetataskApply` and nothing else, and hand back what it returns. */
function sealStack(praxis: PraxisOut | null) {
  let captured: ReturnType<typeof useMetataskApply> | undefined;
  function Probe() {
    captured = useMetataskApply({ praxis });
    return null;
  }
  renderToStaticMarkup(<Probe />);
  if (!captured) throw new Error("the probe never rendered");
  return captured;
}

/**
 * The same stack, wound forward to the state the peel-off needs: one seal on,
 * and its × already pressed. Both are state the hook sets, so the probe sets
 * them DURING render — React re-runs a component that updates its own state
 * mid-render, which is the one way to reach a second state generation without
 * a DOM. Each branch is guarded by the state it produces, so the loop settles.
 */
function stackAwaitingRemoval() {
  let captured: ReturnType<typeof useMetataskApply> | undefined;
  function Probe() {
    const stack = useMetataskApply({ praxis: DRAFT });
    if (stack.appliedMetataskList.length === 0) stack.seedApplied([SEAL]);
    else if (!stack.metataskRemovalTarget) stack.requestRemoveMetatask(SEAL.id);
    captured = stack;
    return null;
  }
  renderToStaticMarkup(<Probe />);
  if (!captured?.metataskRemovalTarget) {
    throw new Error("the probe never reached a pending removal");
  }
  return captured;
}

beforeEach(() => {
  vi.clearAllMocks();
  applyMock.mockResolvedValue(RESCORED);
});

describe("useMetataskApply, without the assembler", () => {
  it("hands back the re-scored praxis the seal answered with (#2464)", async () => {
    const outcome = await sealStack(DRAFT).addMetatask(SEAL);

    expect(applyMock).toHaveBeenCalledWith(3, 41);
    // Not the draft it was handed: the score stamp reads `praxis.score`, and
    // printing 12 after a +100 seal is the defect #2464 fixed.
    expect(outcome).toEqual({ kind: "applied", praxis: RESCORED });
  });

  it("reports a failed seal rather than throwing or swallowing it", async () => {
    applyMock.mockRejectedValue(new Error("nope"));

    const outcome = await sealStack(DRAFT).addMetatask(SEAL);

    expect(outcome.kind).toBe("failed");
    // The message is the stack's own — it knows which call failed; the
    // assembler only knows there is a line to print.
    expect(outcome.kind === "failed" && outcome.message).toBeTruthy();
  });

  it("does nothing before the praxis has loaded", async () => {
    const outcome = await sealStack(null).addMetatask(SEAL);

    expect(outcome).toEqual({ kind: "unchanged" });
    expect(applyMock).not.toHaveBeenCalled();
  });

  it("has nothing to report when no seal is awaiting its confirm", async () => {
    const outcome = await sealStack(DRAFT).confirmRemoveMetatask();

    expect(outcome).toEqual({ kind: "unchanged" });
  });

  it("hands back the re-scored praxis a peel answered with too (#2464)", async () => {
    removeMock.mockResolvedValue(DRAFT);

    const outcome = await stackAwaitingRemoval().confirmRemoveMetatask();

    expect(removeMock).toHaveBeenCalledWith(3, 41);
    expect(outcome).toEqual({ kind: "applied", praxis: DRAFT });
  });
});

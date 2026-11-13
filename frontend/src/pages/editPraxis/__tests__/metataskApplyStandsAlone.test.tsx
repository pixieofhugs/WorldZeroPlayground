/**
 * #2878 — the seal stack mounts alone: a mutation answers with a `SealOutcome`
 * carrying the re-scored praxis (#2464), and the assembler writes it.
 * Probe via `renderToStaticMarkup` (node env, no `renderHook`).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { useMetataskApply } from "../useMetataskApply";
import { aMetatask, aPraxis } from "../../../test/fixtures";
import type { PraxisOut } from "../../../api/praxis";

/* Spread the real module so sibling exports stay real. */
vi.mock("../../../api/praxis", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../api/praxis")>()),
  applyMetatask: vi.fn(),
  removeMetatask: vi.fn(),
}));

import { applyMetatask, removeMetatask } from "../../../api/praxis";

const applyMock = vi.mocked(applyMetatask);
const removeMock = vi.mocked(removeMetatask);

const DRAFT = aPraxis({ id: 3, score: 12, metatask_points: 0 });
const RESCORED = aPraxis({ id: 3, score: 112, metatask_points: 100 });
const SEAL = aMetatask({ id: 41 });

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
 * One seal on, its × pressed. Set DURING render (React re-runs on a mid-render
 * self-update — the only second state generation without a DOM); each branch is
 * guarded by its own result so the loop settles.
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
    expect(outcome).toEqual({ kind: "applied", praxis: RESCORED });
  });

  it("reports a failed seal rather than throwing or swallowing it", async () => {
    applyMock.mockRejectedValue(new Error("nope"));

    const outcome = await sealStack(DRAFT).addMetatask(SEAL);

    expect(outcome.kind).toBe("failed");
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

/**
 * #2945 — the composer's write-back. #2464: the praxis the server answers with
 * (e.g. re-scored after a +100 seal) must be the one the composer holds.
 * `metataskApplyStandsAlone.test.tsx` covers the hook handing it back; this
 * covers `applyOutcome` writing it. A wrapper that skips `applyOutcome` is left
 * to review (no source scan, #2881). Outcomes are typed as the real unions so a
 * drifting reporter stops compiling here.
 */
import { describe, it, expect, vi } from "vitest";
import { applyOutcome } from "../composerOutcome";
import type { MediaOutcome } from "../useComposerMedia";
import type { SealOutcome } from "../useMetataskApply";
import type { DuelOutcome } from "../useComposerDuel";
import { aPraxis } from "../../../test/fixtures";

const DRAFT = aPraxis({ id: 3, score: 12, metatask_points: 0 });
const RESCORED = aPraxis({ id: 3, score: 112, metatask_points: 100 });

const writes = () => ({ setPraxis: vi.fn(), setError: vi.fn() });

describe("applyOutcome — the composer's praxis cell", () => {
  it("installs the re-scored praxis a seal answered with (#2464)", () => {
    const w = writes();
    const applied: SealOutcome = { kind: "applied", praxis: RESCORED };

    applyOutcome(applied, w);

    expect(w.setPraxis).toHaveBeenCalledWith(RESCORED);
  });

  it("installs the praxis a peeled-off seal answered with too (#2464)", () => {
    const w = writes();
    const peeled: SealOutcome = { kind: "applied", praxis: DRAFT };

    applyOutcome(peeled, w);

    expect(w.setPraxis).toHaveBeenCalledWith(DRAFT);
  });

  it("installs the praxis a cancelled duel answered with", () => {
    const w = writes();
    const cancelled: DuelOutcome = { kind: "cancelled", praxis: DRAFT };

    applyOutcome(cancelled, w);

    expect(w.setPraxis).toHaveBeenCalledWith(DRAFT);
  });

  it("leaves the praxis alone when the action failed", () => {
    const w = writes();
    const failed: SealOutcome = { kind: "failed", message: "the seal bounced" };

    applyOutcome(failed, w);

    expect(w.setPraxis).not.toHaveBeenCalled();
  });

  it("leaves the praxis alone when nothing was attempted", () => {
    const w = writes();

    applyOutcome({ kind: "unchanged" }, w);

    expect(w.setPraxis).not.toHaveBeenCalled();
  });
});

describe("applyOutcome — the composer's shared error line", () => {
  it("prints the message a failed tray upload reported (#2878)", () => {
    const w = writes();
    const failed: MediaOutcome = { kind: "failed", message: "upload refused" };

    applyOutcome(failed, w);

    expect(w.setError).toHaveBeenCalledWith("upload refused");
  });

  it("prints the message a failed seal reported (#2878)", () => {
    const w = writes();
    const failed: SealOutcome = { kind: "failed", message: "the seal bounced" };

    applyOutcome(failed, w);

    expect(w.setError).toHaveBeenCalledWith("the seal bounced");
  });

  it("prints the message a failed duel action reported (#2879)", () => {
    const w = writes();
    const failed: DuelOutcome = { kind: "failed", message: "duel stuck" };

    applyOutcome(failed, w);

    expect(w.setError).toHaveBeenCalledWith("duel stuck");
  });

  it("clears the line on success, so a stale failure does not outlive it", () => {
    const w = writes();

    applyOutcome({ kind: "applied", praxis: RESCORED }, w);

    expect(w.setError).toHaveBeenCalledWith("");
  });

  it("leaves the line exactly as it was found when nothing was attempted", () => {
    const w = writes();

    applyOutcome({ kind: "unchanged" }, w);

    // A refused dissolve must not wipe a failure the author is still reading.
    expect(w.setError).not.toHaveBeenCalled();
  });

  it("does not clear the line on a tray outcome with nothing to report", () => {
    const w = writes();
    const nothing: MediaOutcome = { kind: "unchanged" };

    applyOutcome(nothing, w);

    expect(w.setError).not.toHaveBeenCalled();
  });
});

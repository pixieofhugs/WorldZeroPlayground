/**
 * #2945 — the composer's write-back, guarded once.
 *
 * WHAT THIS PROTECTS. #2464: sealing a +100 metatask onto a task worth 12 left
 * the composer's score stamp printing 12 until a reload, and peeling one off
 * left it printing the higher total. The fix is that the praxis the server
 * answers with is the one the composer then holds. That write used to live
 * inside the seal hook, where `metataskStampFreshness.test.ts` guarded it by
 * scanning the hook's source; #2878 moved it out into `useEditPraxis` and the
 * scan was deleted with its subject. `metataskApplyStandsAlone.test.tsx` covers
 * the half that moved — the hook *hands the praxis back*. This file covers the
 * half that broke: the assembler *writes it*.
 *
 * WHY HERE. `useEditPraxis` cannot be rendered by this suite — vitest runs in
 * the `node` environment (`vite.config.ts` declares no `environment`), so there
 * is no DOM, and the assembler needs the room, the auth context and the
 * confirms to mount. `applyOutcome` is the same write-back extracted as a pure
 * function, so it is driven here with two fake setters and no React at all.
 *
 * This guard reads NO SOURCE TEXT. What it cannot see is a wrapper that skips
 * `applyOutcome` altogether; that is deliberate (#2945) and left to review,
 * because restoring a source scan is the pattern #2881 exists to remove.
 *
 * The three outcomes below are typed as the real `MediaOutcome`, `SealOutcome`
 * and `DuelOutcome`, so a reporter whose shape drifts away from the one
 * write-back stops compiling here rather than silently keeping its own copy.
 */
import { describe, it, expect, vi } from "vitest";
import { applyOutcome } from "../composerOutcome";
import type { MediaOutcome } from "../useComposerMedia";
import type { SealOutcome } from "../useMetataskApply";
import type { DuelOutcome } from "../useComposerDuel";
import { aPraxis } from "../../../test/fixtures";

/** The draft as the composer holds it: a task worth 12, no seals yet. */
const DRAFT = aPraxis({ id: 3, score: 12, metatask_points: 0 });
/** What the server answers once a +100 seal lands — the number is on the wire. */
const RESCORED = aPraxis({ id: 3, score: 112, metatask_points: 100 });

/** The two cells `useEditPraxis` owns, as spies. */
const writes = () => ({ setPraxis: vi.fn(), setError: vi.fn() });

describe("applyOutcome — the composer's praxis cell", () => {
  it("installs the re-scored praxis a seal answered with (#2464)", () => {
    const w = writes();
    const applied: SealOutcome = { kind: "applied", praxis: RESCORED };

    applyOutcome(applied, w);

    // Not the draft the composer was holding: the score stamp reads
    // `praxis.score`, so dropping this write prints 12 after a +100 seal.
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

    // Not cleared: a dissolve the player answered no to must not wipe the
    // failure the author is still reading.
    expect(w.setError).not.toHaveBeenCalled();
  });

  it("does not clear the line on a tray outcome with nothing to report", () => {
    const w = writes();
    const nothing: MediaOutcome = { kind: "unchanged" };

    applyOutcome(nothing, w);

    expect(w.setError).not.toHaveBeenCalled();
  });
});

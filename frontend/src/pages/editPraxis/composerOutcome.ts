/**
 * The composer's write-back, as one pure function (#2945).
 *
 * The composer split turned its sub-hooks from *borrowers* into *reporters*:
 * `useComposerMedia` (#2878), `useMetataskApply` (#2878) and `useComposerDuel`
 * (#2879) no longer hold `setPraxis`/`setError`, they answer with an outcome
 * and `useEditPraxis` writes the two cells it owns. That moved the write-back
 * into the assembler — the one module this suite cannot render, since vitest
 * runs in `node` (see `vite.config.ts`) and `useEditPraxis` needs the room, the
 * auth context and the confirms to mount at all.
 *
 * So the write-back itself lives here instead, where it can be driven with two
 * fake setters and no React: three lines that were about to be copied a fourth
 * time. `__tests__/composerOutcomeWriteBack.test.ts` is their guard, and it
 * reads no source text — restoring a source scan is the pattern #2881 exists to
 * remove.
 *
 * A caller routes through this or it does not write at all; nothing here can
 * check that, which is deliberate — a wrapper that forgets is visible in review
 * rather than invisible in green.
 */
import type { PraxisOut } from "../../api/praxis";

/**
 * What any composer sub-hook may leave for the assembler to apply.
 *
 * The three real outcomes (`MediaOutcome`, `SealOutcome`, `DuelOutcome`) are
 * each assignable to this. The success arm carries both kind names its
 * reporters use — a seal `applied`, a duel `cancelled` — because they describe
 * the same event to the assembler: the server answered with a fresher praxis.
 * A fourth reporter (#2880's roster) either reuses one of those names or adds
 * its own here, one word, and its wrapper compiles.
 */
export type ComposerOutcome =
  | { kind: "unchanged" }
  | { kind: "failed"; message: string }
  | { kind: "applied" | "cancelled"; praxis: PraxisOut };

/** The two cells `useEditPraxis` owns, passed in so this stays renderless. */
export interface ComposerWrites {
  setPraxis: (praxis: PraxisOut) => void;
  setError: (message: string) => void;
}

/**
 * Applies one outcome to the composer's praxis and its shared error line.
 *
 * `unchanged` means nothing was attempted — no praxis yet, a seal already on,
 * a dissolve the player answered no to — so the line is left exactly as it was
 * found rather than cleared. A success clears it and installs the praxis the
 * server answered with: the score stamp reads `praxis.score`, and not writing
 * it is #2464, where a +100 seal onto a task worth 12 left the stamp printing
 * 12 until a reload.
 */
export function applyOutcome(
  outcome: ComposerOutcome,
  writes: ComposerWrites,
): void {
  if (outcome.kind === "unchanged") return;
  if (outcome.kind === "failed") {
    writes.setError(outcome.message);
    return;
  }
  writes.setError("");
  writes.setPraxis(outcome.praxis);
}

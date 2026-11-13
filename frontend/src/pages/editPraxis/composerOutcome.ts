/**
 * The composer's write-back as one pure function (#2945): sub-hooks report an
 * outcome and `useEditPraxis` applies it here, testable without React
 * (`__tests__/composerOutcomeWriteBack.test.ts`).
 */
import type { PraxisOut } from "../../api/praxis";

/**
 * What a sub-hook leaves for the assembler. `applied`/`cancelled` both mean the
 * server answered with a fresher praxis.
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
 * Applies one outcome. `unchanged` (nothing attempted) leaves the error line
 * as found. Success must install the server's praxis or the score stamp goes
 * stale (#2464).
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

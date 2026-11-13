/**
 * The composer's initial load as a plan value (#2881): use the row
 * `createPraxis` handed off (`takeJustCreatedPraxis`), or spend one read
 * (#1379). Pure so `__tests__/composerWaterfall.test.ts` drives it without a
 * DOM (same seam as `composerOutcome.ts`). It cannot check that the effect
 * actually routes through it.
 */
import type { PraxisOut } from "../../api/praxis";

/**
 * `carried` is free (POST and GET return the same `build_praxis_out` row);
 * `read` is the load's only round trip. The seal catalogue loads in its own
 * viewer-keyed effect, never nested here.
 */
export type InitialLoadPlan =
  | { kind: "carried"; praxis: PraxisOut }
  | { kind: "read"; praxisId: number };

/**
 * `takeCarried` (= `takeJustCreatedPraxis`) consumes the slot on any ask, so
 * asking also discards a stale row.
 */
export function planInitialLoad(
  praxisId: number,
  takeCarried: (praxisId: number) => PraxisOut | null,
): InitialLoadPlan {
  const carried = takeCarried(praxisId);
  return carried
    ? { kind: "carried", praxis: carried }
    : { kind: "read", praxisId };
}

/** Executes a plan; always a promise so the caller has one chain. */
export function loadPlannedPraxis(
  plan: InitialLoadPlan,
  read: (praxisId: number) => Promise<PraxisOut>,
): Promise<PraxisOut> {
  return plan.kind === "carried"
    ? Promise.resolve(plan.praxis)
    : read(plan.praxisId);
}

/**
 * The composer's initial load, as a plan value (#2881).
 *
 * WHAT DECISION THIS IS. Every signup path does `createPraxis(...)` then
 * `navigate('/praxis/{id}/edit')`, and `createPraxis` leaves the row it was
 * answered with in a one-slot hand-off (`api/praxis.ts`, `takeJustCreatedPraxis`).
 * So the composer's mount has exactly one thing to decide: does it already hold
 * the row, or does it spend a round trip reading it back (#1379)? A miss — a
 * bookmark, a reload, a co-author's link, a Back — falls through to the read.
 *
 * WHY IT IS A VALUE. vitest runs in `node` here (`vite.config.ts` declares no
 * `environment`), so there is no DOM, effects never run, and a test cannot watch
 * `useEditPraxis` make that choice. Its guard therefore used to read the hook's
 * SOURCE, slicing the effect body out between a comment banner and a dependency
 * array — which made `// ---- Initial load ----` load-bearing: rename it and
 * every assertion passed on an empty string. The decision is pure, so it lives
 * here instead, where `__tests__/composerWaterfall.test.ts` drives it directly
 * and reads no source text. Same seam and same reason as `composerOutcome.ts`
 * (#2945); #2693 records why this repo exports a hook's internals for a test.
 *
 * WHAT THIS CANNOT SEE. That the effect routes through it. A load that ignored
 * the plan and called `getPraxis` itself would type-check — deliberate, and the
 * same ceiling `applyOutcome` accepted: visible in review rather than invisible
 * in green. What it does cover is the whole of the mount-time praxis load, so a
 * request re-nested into it (the seal catalogue is the one that was, #1379)
 * shows up as a plan that no longer equals the one the test asserts.
 */
import type { PraxisOut } from "../../api/praxis";

/**
 * What the composer's mount does to get its praxis row.
 *
 * `carried` costs nothing — the row is in hand, `POST /praxes` and
 * `GET /praxes/{id}` both answer with `build_praxis_out(praxis, viewer=...)`
 * for the same viewer, so it is the row the read would have returned. `read` is
 * the one round trip this load may spend, and it is the only one: the task is
 * fetched afterwards because it needs `task_id` off the row, and the viewer's
 * seal catalogue is keyed on the viewer, not the praxis, so it leaves from its
 * own effect beside this one rather than waiting on this answer.
 */
export type InitialLoadPlan =
  | { kind: "carried"; praxis: PraxisOut }
  | { kind: "read"; praxisId: number };

/**
 * Decides how the composer gets praxis `praxisId`.
 *
 * `takeCarried` is `takeJustCreatedPraxis` in the hook. It is passed in rather
 * than imported so this stays drivable, and consulted BEFORE the read is
 * planned: the slot is consumed on the first ask, match or not, so asking is
 * also how a stale carried row gets thrown away.
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

/**
 * Executes a plan: the carried row without a request, or the read.
 *
 * Always a promise, so the caller has one chain to hang the membership guard,
 * the task read and the error line off whichever arm ran.
 */
export function loadPlannedPraxis(
  plan: InitialLoadPlan,
  read: (praxisId: number) => Promise<PraxisOut>,
): Promise<PraxisOut> {
  return plan.kind === "carried"
    ? Promise.resolve(plan.praxis)
    : read(plan.praxisId);
}

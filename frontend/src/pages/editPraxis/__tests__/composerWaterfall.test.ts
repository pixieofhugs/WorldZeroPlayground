/**
 * #1379 — the composer's mount-time load, guarded as a value (#2881).
 *
 * WHAT THIS PROTECTS. The composer is the page every task signup lands on, and
 * its chain ran `getPraxis → getTask → the faction archetype's chunk` with the
 * seal catalogue hanging off the first link for no reason. The fix that matters
 * here is the hand-off: the signup was already answered with the whole row
 * (`api/praxis.ts`, `takeJustCreatedPraxis`), so reading it back is a round trip
 * spent on a payload the client held milliseconds earlier — on the deepest
 * waterfall in the app.
 *
 * WHY IT READS NO SOURCE. There is no jsdom in this repo — vitest runs in
 * `node` (`vite.config.ts` declares no `environment`) and every render goes
 * through `renderToStaticMarkup`, so effects never run and nothing here can
 * watch `useEditPraxis` choose. This file used to answer that by slicing the
 * hook's SOURCE between `// ---- Initial load ----` and `}, [idParam,` — which
 * made a comment load-bearing, and needed a guard-the-guard test because
 * renaming either boundary would silently empty the slice and pass every
 * assertion on air. #2881 moved the decision into `planInitialLoad`, so it is
 * driven directly below and the slice, and its guard, are gone.
 *
 * WHAT IT STILL CANNOT SEE. That the effect routes through the plan; that is
 * the ceiling `composerOutcome.ts` accepted for the same reason (#2945), and it
 * is a review question rather than a silent green. Two claims about the same
 * waterfall have no value seam at all and still read source — the dispatcher's
 * chunk warm and the seal list's own viewer-keyed effect — and they live in
 * `composerMountSourceScan.test.ts` next door, loudly.
 */
import { describe, it, expect, vi } from "vitest";
import {
  planInitialLoad,
  loadPlannedPraxis,
  type InitialLoadPlan,
} from "../initialLoadPlan";
import { aPraxis } from "../../../test/fixtures";

/** The row a signup was handed on the way to `/praxis/7/edit`. */
const CARRIED = aPraxis({ id: 7 });
/** The same row as the read would answer with, for the fallback. */
const READ_BACK = aPraxis({ id: 7 });

describe("the composer does not re-read the praxis a signup just created", () => {
  it("plans no request at all when the signup carried the row", () => {
    const plan = planInitialLoad(7, () => CARRIED);

    // The whole plan: a row in hand, and nothing named to fetch. An arm that
    // read anyway — or a seal catalogue re-nested into this load — would not
    // equal this.
    expect(plan).toEqual({ kind: "carried", praxis: CARRIED });
  });

  it("asks the hand-off for the praxis it is actually loading", () => {
    const takeCarried = vi.fn(() => null);

    planInitialLoad(7, takeCarried);

    // Asking for the wrong id is how a stale carried row gets replayed onto a
    // composer the player came Back to; the slot only answers on a match.
    expect(takeCarried).toHaveBeenCalledWith(7);
  });

  it("takes the carried row without spending the read", async () => {
    const read = vi.fn(() => Promise.resolve(READ_BACK));

    const loaded = await loadPlannedPraxis(
      { kind: "carried", praxis: CARRIED },
      read,
    );

    expect(loaded).toBe(CARRIED);
    expect(read).not.toHaveBeenCalled();
  });
});

describe("the composer still reads the praxis when nothing was carried", () => {
  it("plans the read on a miss", () => {
    // The hand-off is an optimisation, never a requirement: a bookmark, a
    // reload, a co-author's link and a Back all arrive with an empty slot.
    const plan = planInitialLoad(7, () => null);

    expect(plan).toEqual({ kind: "read", praxisId: 7 });
  });

  it("executes that read exactly once, for that praxis", async () => {
    const read = vi.fn(() => Promise.resolve(READ_BACK));
    const plan: InitialLoadPlan = { kind: "read", praxisId: 7 };

    const loaded = await loadPlannedPraxis(plan, read);

    expect(read).toHaveBeenCalledExactlyOnceWith(7);
    expect(loaded).toBe(READ_BACK);
  });
});

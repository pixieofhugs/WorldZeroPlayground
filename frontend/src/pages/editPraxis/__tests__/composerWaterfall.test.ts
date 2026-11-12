/**
 * #1379 — the composer's mount-time load as a value (#2881). The signup already
 * answered with the whole row (`takeJustCreatedPraxis`), so reading it back is a
 * wasted round trip on the deepest waterfall in the app. That the effect routes
 * through the plan is left to review (#2945); source-only claims live in
 * `composerMountSourceScan.test.ts`.
 */
import { describe, it, expect, vi } from "vitest";
import {
  planInitialLoad,
  loadPlannedPraxis,
  type InitialLoadPlan,
} from "../initialLoadPlan";
import { aPraxis } from "../../../test/fixtures";

const CARRIED = aPraxis({ id: 7 });
const READ_BACK = aPraxis({ id: 7 });

describe("the composer does not re-read the praxis a signup just created", () => {
  it("plans no request at all when the signup carried the row", () => {
    const plan = planInitialLoad(7, () => CARRIED);

    expect(plan).toEqual({ kind: "carried", praxis: CARRIED });
  });

  it("asks the hand-off for the praxis it is actually loading", () => {
    const takeCarried = vi.fn(() => null);

    planInitialLoad(7, takeCarried);

    // A wrong id would replay a stale carried row onto a Back navigation.
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
    // Bookmarks, reloads, shared links and Back all arrive with an empty slot.
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

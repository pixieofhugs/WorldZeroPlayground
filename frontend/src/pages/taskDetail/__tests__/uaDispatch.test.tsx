/**
 * UA task-detail dispatch: WHICH component the registry resolves to, which
 * `surfaceDispatch.test.ts` (entry exists) cannot catch. Markup lives in
 * `uaTaskDetail.test.tsx`.
 */
import { describe, it, expect } from "vitest";
import { resolveVariant } from "../../../utils/factionDispatch";
import { resolvedArchetype } from "../../../factions/lazyArchetype";
import { surfaceMap } from "../../../factions";
import DefaultTaskDetail from "../archetypes/DefaultTaskDetail";
import UaTaskDetail from "../archetypes/UaTaskDetail";

describe("task-detail UA dispatch", () => {
  it("a UA task resolves to the bespoke UA archetype", () => {
    expect(
      resolvedArchetype(
        resolveVariant(surfaceMap("taskDetail"), "ua"),
      ),
    ).toBe(UaTaskDetail);
  });

  it("an unregistered slug, na and null all fall through to Default", () => {
    for (const slug of ["__unregistered__", "na", null]) {
      expect(
        resolvedArchetype(
          resolveVariant(surfaceMap("taskDetail"), slug),
        ),
      ).toBe(DefaultTaskDetail);
    }
  });
});

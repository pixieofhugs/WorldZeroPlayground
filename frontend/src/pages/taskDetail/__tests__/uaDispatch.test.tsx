/**
 * UA task-detail dispatch (#525, #852, then #1068).
 *
 * The registry half of what used to be a two-part file: it asserts the
 * `taskDetail` surface resolves a `ua` task to UA's bespoke archetype and every
 * other slug to the Default. What it does NOT do any more is render.
 *
 * Until #1068 this file also pinned the MARKUP of a second, mobile-only UA skin
 * — the ensō carrying the point value, the mandala at texture strength behind
 * the hero and nowhere else, the one dashed orange rule, and the absence of the
 * legacy gold family. ADR-0058 collapsed task detail to one responsive component
 * per faction and #1068 deleted that skin, so those assertions did not need
 * porting: `uaTaskDetail.test.tsx` (#1036) already pins every one of them on the
 * archetype that actually renders on a phone now, and pins them harder.
 *
 * Kept separate from `surfaceDispatch.test.ts` on purpose. That table asserts a
 * slug HAS an entry; this asserts WHICH component the entry resolves to, which
 * is the half that would catch a copy-paste registration pointing a faction at
 * its neighbour's page.
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

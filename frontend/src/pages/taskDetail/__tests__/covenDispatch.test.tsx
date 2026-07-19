/**
 * Mobile task-detail COVEN dispatch (#531). Asserts the mobile registry resolves a
 * `wow` task to the quest.exe scrapbook skin, that other factions fall through to
 * the Default mobile detail, and that the desktop archetype is untouched.
 */
import { describe, it, expect } from "vitest";
import { pickVariant } from "../../../utils/factionDispatch";
import { surfaceMap } from "../../../factions";
import DefaultMobileTaskDetail from "../mobileArchetypes/DefaultTaskDetail";
import CovenMobileTaskDetail from "../mobileArchetypes/CovenTaskDetail";
import CovenDesktopTaskDetail from "../archetypes/CovenTaskDetail";

describe("mobile task-detail COVEN dispatch", () => {
  it("mobile + a COVEN task resolves to the bespoke COVEN mobile skin", () => {
    expect(pickVariant(surfaceMap('mobileTaskDetail'), "coven", DefaultMobileTaskDetail)).toBe(
      CovenMobileTaskDetail,
    );
  });

  it("mobile + any other slug falls through to the Default mobile skin", () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(surfaceMap('mobileTaskDetail'), slug, DefaultMobileTaskDetail)).toBe(
        DefaultMobileTaskDetail,
      );
    }
  });

  it("desktop keeps its own COVEN archetype, never the mobile skin", () => {
    const desktop = pickVariant(surfaceMap('taskDetail'), "coven", DefaultMobileTaskDetail);
    expect(desktop).toBe(CovenDesktopTaskDetail);
    expect(desktop).not.toBe(CovenMobileTaskDetail);
  });
});

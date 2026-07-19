/**
 * Mobile task-detail WOW dispatch (#531). Asserts the mobile registry resolves a
 * `wow` task to the quest.exe scrapbook skin, that other factions fall through to
 * the Default mobile detail, and that the desktop archetype is untouched.
 */
import { describe, it, expect } from "vitest";
import { pickVariant } from "../../../utils/factionDispatch";
import { surfaceMap } from "../../../factions";
import DefaultMobileTaskDetail from "../mobileArchetypes/DefaultTaskDetail";
import WowMobileTaskDetail from "../mobileArchetypes/WowTaskDetail";
import WowDesktopTaskDetail from "../archetypes/WowTaskDetail";

describe("mobile task-detail WOW dispatch", () => {
  it("mobile + a WOW task resolves to the bespoke WOW mobile skin", () => {
    expect(pickVariant(surfaceMap('mobileTaskDetail'), "wow", DefaultMobileTaskDetail)).toBe(
      WowMobileTaskDetail,
    );
  });

  it("mobile + any other slug falls through to the Default mobile skin", () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(surfaceMap('mobileTaskDetail'), slug, DefaultMobileTaskDetail)).toBe(
        DefaultMobileTaskDetail,
      );
    }
  });

  it("desktop keeps its own WOW archetype, never the mobile skin", () => {
    const desktop = pickVariant(surfaceMap('taskDetail'), "wow", DefaultMobileTaskDetail);
    expect(desktop).toBe(WowDesktopTaskDetail);
    expect(desktop).not.toBe(WowMobileTaskDetail);
  });
});

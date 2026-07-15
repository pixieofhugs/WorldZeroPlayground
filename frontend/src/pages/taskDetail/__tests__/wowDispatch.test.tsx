/**
 * Mobile task-detail WOW dispatch (#531). Asserts the mobile registry resolves a
 * `wow` task to the quest.exe scrapbook skin, that other factions fall through to
 * the Default mobile detail, and that the desktop archetype is untouched.
 */
import { describe, it, expect } from "vitest";
import {
  MOBILE_ARCHETYPE_BY_SLUG,
  ARCHETYPE_BY_SLUG,
} from "../../TaskDetail";
import { pickVariant } from "../../../utils/factionDispatch";
import DefaultMobileTaskDetail from "../mobileArchetypes/DefaultTaskDetail";
import WowMobileTaskDetail from "../mobileArchetypes/WowTaskDetail";
import WowDesktopTaskDetail from "../archetypes/WowTaskDetail";

describe("mobile task-detail WOW dispatch", () => {
  it("mobile + a WOW task resolves to the bespoke WOW mobile skin", () => {
    expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, "wow", DefaultMobileTaskDetail)).toBe(
      WowMobileTaskDetail,
    );
  });

  it("mobile + any other slug falls through to the Default mobile skin", () => {
    for (const slug of ["snide", "na", null]) {
      expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, slug, DefaultMobileTaskDetail)).toBe(
        DefaultMobileTaskDetail,
      );
    }
  });

  it("desktop keeps its own WOW archetype, never the mobile skin", () => {
    const desktop = pickVariant(ARCHETYPE_BY_SLUG, "wow", DefaultMobileTaskDetail);
    expect(desktop).toBe(WowDesktopTaskDetail);
    expect(desktop).not.toBe(WowMobileTaskDetail);
  });
});

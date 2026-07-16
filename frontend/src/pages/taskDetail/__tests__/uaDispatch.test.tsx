/**
 * Mobile task-detail UA dispatch (#525). Asserts the mobile registry resolves a
 * `ua` task to the gilt-salon commission skin, that other factions fall through
 * to the Default mobile detail, and that the desktop archetype is untouched.
 */
import { describe, it, expect } from "vitest";
import {
  MOBILE_ARCHETYPE_BY_SLUG,
  ARCHETYPE_BY_SLUG,
} from "../../TaskDetail";
import { pickVariant } from "../../../utils/factionDispatch";
import DefaultMobileTaskDetail from "../mobileArchetypes/DefaultTaskDetail";
import UAMobileTaskDetail from "../mobileArchetypes/UaTaskDetail";
import UADesktopTaskDetail from "../archetypes/UaTaskDetail";

describe("mobile task-detail UA dispatch", () => {
  it("mobile + a UA task resolves to the bespoke UA mobile skin", () => {
    expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, "ua", DefaultMobileTaskDetail)).toBe(
      UAMobileTaskDetail,
    );
  });

  it("mobile + any other slug falls through to the Default mobile skin", () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, slug, DefaultMobileTaskDetail)).toBe(
        DefaultMobileTaskDetail,
      );
    }
  });

  it("desktop keeps its own UA archetype, never the mobile skin", () => {
    const desktop = pickVariant(ARCHETYPE_BY_SLUG, "ua", DefaultMobileTaskDetail);
    expect(desktop).toBe(UADesktopTaskDetail);
    expect(desktop).not.toBe(UAMobileTaskDetail);
  });
});

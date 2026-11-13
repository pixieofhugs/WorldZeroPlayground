import { describe, expect, it } from "vitest";
import { factionCssVar, isKnownFaction } from "../factions";

/**
 * Faction hue vs unaffiliated spectrum (ADR-0039). Testing CSS_KEY presence
 * instead of the mapped value greyed every ornament (#749).
 */
describe("isKnownFaction", () => {
  it("returns false for `na` — unaffiliated is a state, not a faction", () => {
    expect(isKnownFaction("na")).toBe(false);
  });

  it("returns false for null and undefined", () => {
    expect(isKnownFaction(null)).toBe(false);
    expect(isKnownFaction(undefined)).toBe(false);
    expect(isKnownFaction("")).toBe(false);
  });

  it("returns true for a real faction slug", () => {
    expect(isKnownFaction("snide")).toBe(true);
  });

  it("returns true for every themed faction", () => {
    for (const slug of [
      "ua",
      "everymen",
      "coven",
      "snide",
      "ephemerists",
      "singularity",
      "wow",
    ]) {
      expect(isKnownFaction(slug), `${slug} should be known`).toBe(true);
    }
  });

  /** "Known" means themed, not skinned. */
  it("returns true for `wow` — themed yellow, though it still has no skin", () => {
    expect(isKnownFaction("wow")).toBe(true);
    expect(factionCssVar("wow")).toBe("var(--faction-wow)");
  });

  it("returns false for an unregistered slug", () => {
    expect(isKnownFaction("bogus")).toBe(false);
  });

  /** #783: a secret society hiding in plain sight has no theme. */
  it("returns false for `albescent` — registered, but deliberately unthemed", () => {
    expect(isKnownFaction("albescent")).toBe(false);
  });

  /** Ornament call sites supply the rainbow themselves for unknown slugs. */
  it("agrees with factionCssVar: unknown slugs resolve to the default scalar", () => {
    for (const slug of ["na", "bogus", null, undefined]) {
      expect(isKnownFaction(slug)).toBe(false);
      expect(factionCssVar(slug)).toBe("var(--faction-default)");
    }
    expect(factionCssVar("snide")).toBe("var(--faction-snide)");
  });
});

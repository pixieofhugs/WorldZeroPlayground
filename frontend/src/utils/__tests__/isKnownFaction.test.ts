import { describe, expect, it } from "vitest";
import { factionCssVar, isKnownFaction } from "../factions";

/**
 * Pins the predicate that decides whether a surface paints a faction hue or
 * reaches for the unaffiliated spectrum (ADR-0039).
 *
 * This regressed silently for a whole issue cycle: #418 added `na: "default"`
 * to CSS_KEY, and the predicate tested key *presence*, so `na` started
 * reporting as a real faction and every ornament went grey (#749). Nothing
 * failed — the bug is a wrong colour, which no type or build check can see.
 * These assertions are the guard.
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

  it("returns true for every registered faction", () => {
    for (const slug of [
      "ua",
      "everymen",
      "wow",
      "snide",
      "ephemerists",
      "singularity",
    ]) {
      expect(isKnownFaction(slug), `${slug} should be known`).toBe(true);
    }
  });

  it("returns false for an unregistered slug", () => {
    expect(isKnownFaction("bogus")).toBe(false);
  });

  /**
   * Albescent is REGISTERED but not THEMED (#783). It keeps its slug, its
   * catalog copy and its reveal mechanics, but holds no CSS_KEY entry — so it
   * lands on `default` and the predicate calls it unknown. That is the intended
   * outcome, not the #749 regression in reverse: #749 was a slug wrongly called
   * KNOWN because a key existed; this is a slug correctly called UNKNOWN
   * because no key does. A secret society must render as unaffiliated
   * (ADR-0027), and this predicate is what routes it there on every surface.
   */
  it("returns false for `albescent` — registered, but deliberately unthemed", () => {
    expect(isKnownFaction("albescent")).toBe(false);
  });

  it("resolves albescent exactly like na, not like a faction", () => {
    expect(factionCssVar("albescent")).toBe(factionCssVar("na"));
    expect(factionCssVar("albescent", "card-bg")).toBe(
      factionCssVar("na", "card-bg"),
    );
  });

  /**
   * The consequence the four ornament call sites depend on: anything the
   * predicate calls unknown resolves to the neutral `default` scalar, so those
   * surfaces must supply the rainbow themselves rather than trusting
   * factionCssVar. If this pair ever disagrees, unaffiliated goes grey again.
   */
  it("agrees with factionCssVar: unknown slugs resolve to the default scalar", () => {
    for (const slug of ["na", "bogus", null, undefined]) {
      expect(isKnownFaction(slug)).toBe(false);
      expect(factionCssVar(slug)).toBe("var(--faction-default)");
    }
    expect(factionCssVar("snide")).toBe("var(--faction-snide)");
  });
});

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

  /**
   * `wow` briefly sat on the unthemed side (#784) as its only *temporary*
   * inhabitant — `na` is not a faction and `albescent` is a faction that hides,
   * but WOW was merely mid-redesign, its pink block having left with the
   * aesthetic. #812 gave it a yellow block of its own, so it is back above.
   *
   * It keeps a dedicated test because "known" here means *themed*, and WOW is
   * the repo's only faction that is themed WITHOUT being skinned: its manifest
   * is empty and every surface still renders Default. Anyone who reads this
   * predicate as "has a bespoke archetype" gets WOW wrong.
   */
  it("returns true for `wow` — themed yellow, though it still has no skin", () => {
    expect(isKnownFaction("wow")).toBe(true);
    expect(factionCssVar("wow")).toBe("var(--faction-wow)");
  });

  it("returns false for an unregistered slug", () => {
    expect(isKnownFaction("bogus")).toBe(false);
  });

  /**
   * The second inhabitant of the unthemed side, and the subtler one (#783).
   * `na` is not known because it is not a faction. `albescent` IS a faction —
   * registered, with a manifest and members — that deliberately has no theme,
   * because it is a secret society hiding in plain sight. Both land on
   * `default`, and only the mapped-value test keeps them there: revert this
   * predicate to key presence and you grey out unaffiliated players (#749) and
   * simultaneously paint a secret society into the spectrum.
   */
  it("returns false for `albescent` — registered, but deliberately unthemed", () => {
    expect(isKnownFaction("albescent")).toBe(false);
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

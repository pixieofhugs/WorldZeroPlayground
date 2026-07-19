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
    ]) {
      expect(isKnownFaction(slug), `${slug} should be known`).toBe(true);
    }
  });

  /**
   * The THIRD inhabitant of the unthemed side (#784), and the only temporary
   * one. `na` is not a faction; `albescent` is a faction that hides. `wow` is
   * a faction that is merely mid-redesign: its lo-fi pink `.exe` block became
   * --faction-coven-* when the aesthetic moved to Cozy Coven, and its gold
   * replacement is a sibling issue. Until that lands there is no
   * --faction-wow-* block to point at, so CSS_KEY maps it to `default` and the
   * predicate reports it unknown. Delete this test when the gold block ships.
   */
  it("returns false for `wow` — themeless while its redesign is pending", () => {
    expect(isKnownFaction("wow")).toBe(false);
    expect(factionCssVar("wow")).toBe("var(--faction-default)");
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

/**
 * Albescent hides in plain sight (#783).
 *
 * This file used to be `factionAlbescentFirstClass.test.ts` and asserted the
 * exact opposite: that Albescent resolved to its own near-black `#1c1c1a` and
 * its own `--faction-albescent-*` tokens (#232). Same file, inverted intent.
 *
 * Albescent is a secret society. The product requirement is not "Albescent has
 * a subtle theme" — it is that an Albescent-slugged surface is
 * INDISTINGUISHABLE from an unaffiliated one. So every assertion here compares
 * `albescent` against `na` rather than against a literal. That is deliberate:
 * pinning literals would let the two drift apart the moment the unaffiliated
 * treatment changes, and Albescent would become conspicuous without a single
 * test going red. Comparing the two slugs makes them move together forever.
 *
 * What still distinguishes Albescent is the invitation and reveal flow
 * (ADR-0027) and the flourishes — never a colour.
 */
import { describe, expect, it } from "vitest";
import {
  FACTION_ALIASES,
  FACTION_RAINBOW_ORDER,
  factionColor,
  factionCssVar,
  factionFill,
  getAllFactions,
  isKnownFaction,
  sortFactionsByRainbowOrder,
  type FactionFillShape,
} from "../factions";

/** Every suffix a surface can ask `factionCssVar` for. */
const SUFFIXES = [
  undefined,
  "light",
  "border",
  "card-bg",
  "card-text",
  "card-accent",
  "card-muted",
  "card-font",
  "on-fill",
];

const SHAPES: FactionFillShape[] = ["bar", "dot", "pill"];

describe("Albescent is indistinguishable from unaffiliated", () => {
  it("resolves every CSS variable to exactly what `na` resolves to", () => {
    for (const suffix of SUFFIXES) {
      expect(
        factionCssVar("albescent", suffix),
        `suffix ${suffix ?? "(primary)"}`,
      ).toBe(factionCssVar("na", suffix));
    }
  });

  it("fills identically to `na` in every surface geometry", () => {
    // Covers the rejected alternative directly. Cloning a token block from
    // --faction-default-* would have made isKnownFaction true, so Albescent
    // would take the real-faction branch and get a SOLID fill while an
    // unaffiliated player beside it got the GRADIENT — flatter and greyer, so
    // more conspicuous, not less. Equality across all three shapes rules it out.
    for (const shape of SHAPES) {
      expect(factionFill("albescent", shape), `shape ${shape}`).toEqual(
        factionFill("na", shape),
      );
    }
  });

  it("gets the unaffiliated rainbow, not a solid hue, wherever a fill is painted", () => {
    expect(factionFill("albescent", "bar").background).toBe(
      "var(--faction-default-rainbow)",
    );
    expect(factionFill("albescent", "dot").background).toBe(
      "var(--faction-default-ring)",
    );
  });

  it("has the same raw colour as `na` in canvas/SVG contexts", () => {
    expect(factionColor("albescent")).toBe(factionColor("na"));
    expect(factionColor("albescent")).toBe(factionColor(null));
  });

  it("is not a known faction — it has no resolvable theme", () => {
    // The load-bearing line. Every surface that branches on this predicate
    // hands Albescent the unaffiliated treatment for free, including surfaces
    // written later. See the docblock in ../factions.ts for why this must be
    // tested as a mapped VALUE and not as key presence (#749).
    expect(isKnownFaction("albescent")).toBe(isKnownFaction("na"));
    expect(isKnownFaction("albescent")).toBe(false);
  });

  it("claims no slot in the faction spectrum", () => {
    // /factions omits Albescent server-side until an account is revealed to it,
    // so a stripe bar built from this array leaked its existence to unrevealed
    // players. It did exactly that, on Leaderboard and DefaultPlayers.
    expect(FACTION_RAINBOW_ORDER).not.toContain("albescent");
    expect(
      sortFactionsByRainbowOrder([{ slug: "albescent" }, { slug: "ua" }]).map(
        (faction) => faction.slug,
      ),
    ).toEqual(["ua", "albescent"]);
  });

  it("is absent from the colour registry, like `na`", () => {
    const slugs = getAllFactions().map((faction) => faction.slug);
    expect(slugs).not.toContain("albescent");
    expect(slugs).not.toContain("na");
  });

  it("is not an alias — it is registered, just unthemed", () => {
    // Guards the other way of "fixing" this: re-pointing albescent at another
    // faction's identity. It borrows nobody's costume (it wore ua's before
    // #232); it simply has none of its own.
    expect(FACTION_ALIASES["albescent"]).toBeUndefined();
    for (const suffix of SUFFIXES) {
      expect(factionCssVar("albescent", suffix)).not.toContain("--faction-ua");
    }
  });

  it("leaves no --faction-albescent-* reference behind", () => {
    // Weak on its own — asserts an absence, which passes for the wrong reasons
    // if the helpers stop being called at all. Kept only as a backstop to the
    // equality assertions above, which are the real statement.
    for (const suffix of SUFFIXES) {
      expect(factionCssVar("albescent", suffix)).not.toContain("albescent");
    }
    expect(
      JSON.stringify(SHAPES.map((shape) => factionFill("albescent", shape))),
    ).not.toContain("albescent");
  });
});

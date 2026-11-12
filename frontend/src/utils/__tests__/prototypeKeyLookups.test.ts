/**
 * A slug off the wire must never reach `Object.prototype` (#1821): a bracket
 * read like `CSS_KEY["constructor"]` is truthy, so `??` fallbacks never fire.
 * Presence relays client-reported slugs (ADR-0073), so this is reachable.
 */
import { describe, expect, it } from "vitest";
import { badgeArtFor, UnknownBadgeArt } from "../../components/badges/badgeArt";
import { reframeLabel } from "../../components/vote/voteReframes";
import { gateTreatment } from "../../components/vote/VoteShell";
import { pickVariant, resolveSlug, resolveVariant } from "../factionDispatch";
import { factionCssVar, factionFill, isKnownFaction } from "../factions";

/** Inherited `Object.prototype` members; `__proto__` returns an object. */
const PROTOTYPE_KEYS = [
  "constructor",
  "toString",
  "valueOf",
  "hasOwnProperty",
  "isPrototypeOf",
  "propertyIsEnumerable",
  "toLocaleString",
  "__proto__",
];

describe("prototype-chain slugs degrade like any other unknown slug", () => {
  it("factionCssVar resolves through `default`", () => {
    // The case the issue names, alongside the ordinary unknown slug it must match.
    expect(factionCssVar("constructor", "card-bg")).toBe(
      "var(--faction-default-card-bg)",
    );
    expect(factionCssVar("__nope__", "card-bg")).toBe(
      "var(--faction-default-card-bg)",
    );
    for (const slug of PROTOTYPE_KEYS) {
      expect(factionCssVar(slug), slug).toBe("var(--faction-default)");
      expect(factionCssVar(slug, "card-text"), slug).toBe(
        "var(--faction-default-card-text)",
      );
    }
  });

  it("factionFill hands back the unaffiliated spectrum, not a hue", () => {
    for (const slug of PROTOTYPE_KEYS) {
      expect(factionFill(slug, "dot"), slug).toEqual(
        factionFill("__nope__", "dot"),
      );
      expect(factionFill(slug, "pill"), slug).toEqual(
        factionFill("__nope__", "pill"),
      );
    }
  });

  it("isKnownFaction says no — `in` walks the chain too", () => {
    for (const slug of PROTOTYPE_KEYS) {
      expect(isKnownFaction(slug), slug).toBe(false);
    }
  });

  it("dispatch falls back rather than rendering Object as a component", () => {
    const A = () => null;
    const Na = () => null;
    const map = { coven: A, na: Na };
    for (const slug of PROTOTYPE_KEYS) {
      // Both halves of the dispatch API (#2530).
      expect(resolveSlug(map, slug), slug).toBe("na");
      expect(resolveVariant(map, slug), slug).toBe(Na);
      expect(pickVariant(map, slug), slug).toBeUndefined();
    }
  });

  it("reframeLabel falls back to the arabic numeral", () => {
    for (const slug of PROTOTYPE_KEYS) {
      expect(reframeLabel(slug, 3), slug).toBe("3");
    }
  });

  it("gateTreatment hands back the default gate", () => {
    for (const slug of PROTOTYPE_KEYS) {
      expect(gateTreatment(slug), slug).toEqual(gateTreatment("__nope__"));
    }
  });

  it("badgeArtFor hands back the unknown-badge glyph", () => {
    for (const key of PROTOTYPE_KEYS) {
      expect(badgeArtFor(key), key).toBe(UnknownBadgeArt);
    }
  });
});

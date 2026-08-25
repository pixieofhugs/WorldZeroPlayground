/**
 * A slug off the wire must never reach `Object.prototype` (#1821).
 *
 * Every faction lookup in the app is a bracket read on an object literal, and a
 * bracket read walks the prototype chain: `CSS_KEY["constructor"]` is the
 * `Object` function, not `undefined`, so the `?? default` / `|| fallback` guard
 * that every one of these resolvers relies on never fires. The result is not an
 * injection — no `Object.prototype` member stringifies to anything containing a
 * `;` — but it is a garbage `var(--faction-function Object() ...)`, a function
 * handed back as a React component, or a `TypeError`, depending on which
 * resolver got the slug.
 *
 * Until #1744 every slug reaching these came from the server. Presence
 * awareness is self-reported by each client and relayed (ADR-0073), so a
 * co-member's arbitrary string now reaches the faction lookups. This file pins
 * the whole class in one place rather than per resolver, because the defect is
 * the pattern and it lived in six functions at once.
 */
import { describe, expect, it } from "vitest";
import { badgeArtFor, UnknownBadgeArt } from "../../components/badges/badgeArt";
import { reframeLabel } from "../../components/vote/voteReframes";
import { gateTreatment } from "../../components/vote/VoteShell";
import { pickVariant, resolveSlug, resolveVariant } from "../factionDispatch";
import { factionCssVar, factionFill, isKnownFaction } from "../factions";

/**
 * Members inherited from `Object.prototype`. Each is truthy, so `??`, `||` and
 * `?.` all wave it through; `__proto__` is the accessor pair, which returns an
 * object rather than a function.
 */
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
      // Both halves of the dispatch API, because #2530 moved the call sites
      // from one to the other: a `constructor` slug must reach na's row, not
      // the `Object` function, and must not count as a bespoke registration.
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

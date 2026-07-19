import { describe, expect, it } from "vitest";
import {
  FACTION_RAINBOW_ORDER,
  factionCssVar,
  factionFill,
  sortFactionsByRainbowOrder,
} from "../factions";

describe("sortFactionsByRainbowOrder", () => {
  it("orders known factions into canonical rainbow order", () => {
    const shuffled = [
      { slug: "wow" },
      { slug: "singularity" },
      { slug: "everymen" },
      { slug: "ephemerists" },
      { slug: "ua" },
      { slug: "snide" },
    ];
    expect(sortFactionsByRainbowOrder(shuffled).map((f) => f.slug)).toEqual([
      ...FACTION_RAINBOW_ORDER,
    ]);
  });

  it("sorts albescent last, like any other unthemed slug (#783)", () => {
    // Albescent is registered but not themed, so it sorts with the unknowns
    // rather than claiming a slot in the spectrum. See the leak suite below.
    expect(
      sortFactionsByRainbowOrder([{ slug: "albescent" }, { slug: "wow" }]).map(
        (f) => f.slug,
      ),
    ).toEqual(["wow", "albescent"]);
  });

  it("sorts unknown slugs last, preserving their relative order", () => {
    const factions = [
      { slug: "mystery_b" },
      { slug: "wow" },
      { slug: "mystery_a" },
      { slug: "everymen" },
    ];
    expect(sortFactionsByRainbowOrder(factions).map((f) => f.slug)).toEqual([
      "everymen",
      "wow",
      "mystery_b",
      "mystery_a",
    ]);
  });

  it("does not mutate the input array", () => {
    const factions = [{ slug: "wow" }, { slug: "everymen" }];
    sortFactionsByRainbowOrder(factions);
    expect(factions.map((f) => f.slug)).toEqual(["wow", "everymen"]);
  });
});

describe("factionCssVar unaffiliated fallback (#636 / ADR-0039)", () => {
  it("resolves na to the default (neutral grey) theme, not ua", () => {
    expect(factionCssVar("na")).toBe("var(--faction-default)");
    expect(factionCssVar("na", "border")).toBe("var(--faction-default-border)");
  });

  it("degrades unregistered slugs to default, never impersonating ua", () => {
    expect(factionCssVar("not_a_faction")).toBe("var(--faction-default)");
    expect(factionCssVar(null)).toBe("var(--faction-default)");
    expect(factionCssVar(undefined)).toBe("var(--faction-default)");
  });

  it("still resolves real factions to their own theme", () => {
    expect(factionCssVar("ua")).toBe("var(--faction-ua)");
    expect(factionCssVar("everymen", "card-bg")).toBe(
      "var(--faction-everymen-card-bg)",
    );
  });
});

describe("factionFill (#636 / ADR-0039)", () => {
  it("gives na the linear rainbow for a bar", () => {
    expect(factionFill("na", "bar")).toEqual({
      background: "var(--faction-default-rainbow)",
    });
  });

  it("gives na the conic rainbow for a dot (linear reads as mud at 10-12px)", () => {
    expect(factionFill("na", "dot")).toEqual({
      background: "var(--faction-default-ring)",
    });
  });

  it("frames na's rainbow around a paper interior for a pill", () => {
    const fill = factionFill("na", "pill");
    expect(fill.border).toBe("2px solid transparent");
    expect(fill.color).toBe("var(--faction-default-card-text)");
    expect(fill.background).toContain("border-box");
    expect(fill.background).toContain("--faction-default-rainbow");
  });

  it("unregistered / null slugs fill like na (default), not ua", () => {
    expect(factionFill("not_a_faction", "bar")).toEqual({
      background: "var(--faction-default-rainbow)",
    });
    expect(factionFill(null, "dot")).toEqual({
      background: "var(--faction-default-ring)",
    });
  });

  it("returns a real faction's solid hue for every shape", () => {
    expect(factionFill("everymen", "bar")).toEqual({
      background: "var(--faction-everymen)",
    });
    expect(factionFill("everymen", "dot")).toEqual({
      background: "var(--faction-everymen)",
    });
  });

  it("pairs a real faction fill with its on-fill AA ink for a pill (#649)", () => {
    expect(factionFill("wow", "pill")).toEqual({
      background: "var(--faction-wow)",
      color: "var(--faction-wow-on-fill)",
    });
  });
});

describe("FACTION_RAINBOW_ORDER does not leak Albescent (#783, ADR-0027)", () => {
  // The regression that already shipped. `/factions` omits Albescent
  // server-side until an account is revealed to it, but `Leaderboard` and
  // `DefaultPlayers` painted their stripe bars straight off this array, so an
  // unrevealed player saw a near-black stripe with no card under it. The fix is
  // upstream of every consumer: the slug is simply not in the spectrum.
  it("omits albescent", () => {
    expect(FACTION_RAINBOW_ORDER).not.toContain("albescent");
  });

  it("yields no albescent-derived colour when mapped to CSS variables", () => {
    const bar = FACTION_RAINBOW_ORDER.map((slug) => factionCssVar(slug));
    expect(bar.join(", ")).not.toContain("albescent");
  });

  it("yields no albescent-derived colour when mapped to fills", () => {
    const fills = FACTION_RAINBOW_ORDER.map((slug) => factionFill(slug, "bar"));
    expect(JSON.stringify(fills)).not.toContain("albescent");
  });

  it("still carries every faction that is publicly visible", () => {
    // Guards the opposite mistake: closing the leak by emptying the spectrum.
    expect([...FACTION_RAINBOW_ORDER].sort()).toEqual([
      "ephemerists",
      "everymen",
      "singularity",
      "snide",
      "ua",
      "wow",
    ]);
  });
});

import { describe, expect, it } from "vitest";
import {
  FACTION_RAINBOW_ORDER,
  sortFactionsByRainbowOrder,
} from "../factions";

describe("sortFactionsByRainbowOrder", () => {
  it("orders known factions into canonical rainbow order", () => {
    const shuffled = [
      { slug: "wow" },
      { slug: "singularity" },
      { slug: "everymen" },
      { slug: "ephemerists" },
      { slug: "albescent" },
      { slug: "ua" },
      { slug: "snide" },
    ];
    expect(sortFactionsByRainbowOrder(shuffled).map((f) => f.slug)).toEqual([
      ...FACTION_RAINBOW_ORDER,
    ]);
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

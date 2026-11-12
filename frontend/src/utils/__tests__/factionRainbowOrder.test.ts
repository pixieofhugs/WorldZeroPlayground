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
      { slug: "coven" },
      { slug: "singularity" },
      { slug: "everymen" },
      { slug: "ephemerists" },
      { slug: "ua" },
      { slug: "snide" },
      { slug: "wow" },
    ];
    expect(sortFactionsByRainbowOrder(shuffled).map((f) => f.slug)).toEqual([
      ...FACTION_RAINBOW_ORDER,
    ]);
  });

  it("sorts albescent last, like any other unthemed slug (#783)", () => {
    // Registered but unthemed; see the leak suite below.
    expect(
      sortFactionsByRainbowOrder([{ slug: "albescent" }, { slug: "coven" }]).map(
        (f) => f.slug,
      ),
    ).toEqual(["coven", "albescent"]);
  });

  it("sorts unknown slugs last, preserving their relative order", () => {
    const factions = [
      { slug: "mystery_b" },
      { slug: "coven" },
      { slug: "mystery_a" },
      { slug: "everymen" },
    ];
    expect(sortFactionsByRainbowOrder(factions).map((f) => f.slug)).toEqual([
      "everymen",
      "coven",
      "mystery_b",
      "mystery_a",
    ]);
  });

  it("does not mutate the input array", () => {
    const factions = [{ slug: "coven" }, { slug: "everymen" }];
    sortFactionsByRainbowOrder(factions);
    expect(factions.map((f) => f.slug)).toEqual(["coven", "everymen"]);
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
      background: "var(--faction-default-rainbow-conic)",
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
      background: "var(--faction-default-rainbow-conic)",
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
    expect(factionFill("coven", "pill")).toEqual({
      background: "var(--faction-coven)",
      color: "var(--faction-coven-on-fill)",
    });
  });

  // ── frame: the rainbow as a scalar border ring (#794) ──

  it("gives na a rainbow border ring with a neutral interior for a frame", () => {
    const fill = factionFill("na", "frame");
    expect(fill.border).toBe("2px solid transparent");
    expect(fill.boxSizing).toBe("border-box");
    expect(fill.background).toContain("border-box");
    expect(fill.background).toContain("--faction-default-rainbow");
  });

  it("drops the pill's forced ink for a frame, so the caller owns its text", () => {
    expect(factionFill("na", "frame").color).toBeUndefined();
    expect(factionFill("na", "pill").color).toBe(
      "var(--faction-default-card-text)",
    );
  });

  it("unregistered / null slugs frame like na (default), not ua", () => {
    expect(factionFill("not_a_faction", "frame")).toEqual(
      factionFill("na", "frame"),
    );
    expect(factionFill(null, "frame")).toEqual(factionFill("na", "frame"));
  });

  it("degrades a real faction's frame to a plain solid border", () => {
    expect(factionFill("everymen", "frame")).toEqual({
      border: "2px solid var(--faction-everymen)",
    });
    expect(factionFill("coven", "frame")).toEqual({
      border: "2px solid var(--faction-coven)",
    });
  });

  // ── rule: the bar stood on end (#983) ──

  it("turns na's ramp 180deg for a vertical rule", () => {
    // A 90deg ramp across a ~3px rule is mud, as with `dot`.
    expect(factionFill("na", "rule")).toEqual({
      background: "var(--faction-default-rainbow-vertical)",
    });
    expect(factionFill("na", "rule")).not.toEqual(factionFill("na", "bar"));
  });

  it("gives a real faction the same solid hue for rule as for bar", () => {
    // Only na's fill is shape-dependent (ADR-0039).
    for (const slug of ["everymen", "coven", "wow"]) {
      expect(factionFill(slug, "rule")).toEqual(factionFill(slug, "bar"));
    }
  });

  it("unregistered / null slugs rule like na (default), not ua", () => {
    expect(factionFill("not_a_faction", "rule")).toEqual(
      factionFill("na", "rule"),
    );
    expect(factionFill(null, "rule")).toEqual(factionFill("na", "rule"));
  });

  it("keeps bar / dot / pill byte-identical after adding frame", () => {
    expect(factionFill("na", "bar")).toEqual({
      background: "var(--faction-default-rainbow)",
    });
    expect(factionFill("na", "dot")).toEqual({
      background: "var(--faction-default-rainbow-conic)",
    });
    expect(factionFill("na", "pill")).toEqual({
      background:
        "linear-gradient(var(--faction-default-card-bg), var(--faction-default-card-bg)) padding-box, var(--faction-default-rainbow) border-box",
      border: "2px solid transparent",
      color: "var(--faction-default-card-text)",
      boxSizing: "border-box",
    });
    expect(factionFill("snide", "bar")).toEqual({
      background: "var(--faction-snide)",
    });
  });
});

describe("FACTION_RAINBOW_ORDER does not leak Albescent (#783, ADR-0027)", () => {
  // Stripe bars paint straight off this array, so a hidden Albescent here leaks
  // a stripe to unrevealed players.
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

  it("still carries every faction that is publicly visible AND themed", () => {
    // The opposite mistake: closing the leak by emptying the spectrum.
    expect([...FACTION_RAINBOW_ORDER].sort()).toEqual([
      "coven",
      "ephemerists",
      "everymen",
      "singularity",
      "snide",
      "ua",
      "wow",
    ]);
  });
});

describe("FACTION_RAINBOW_ORDER is a spectrum, not a roster", () => {
  /** An entry resolving to `default` would paint a grey stop mid-rainbow. */
  it("resolves every entry to its own theme, never to default", () => {
    for (const slug of FACTION_RAINBOW_ORDER) {
      expect(factionCssVar(slug), `${slug} would paint a grey stop`).toBe(
        `var(--faction-${slug})`,
      );
    }
  });

  it("gives every entry a solid fill, so no stop is a nested gradient", () => {
    for (const slug of FACTION_RAINBOW_ORDER) {
      expect(factionFill(slug, "bar")).toEqual({
        background: `var(--faction-${slug})`,
      });
    }
  });

  it("runs red → orange → gold → green → blue → plum → pink", () => {
    // Index is decided by hue alone. The wheel cuts at red, so `everymen`
    // (h357.7, straddling 0) leads. Hues live in index.css (#1269), so this is a
    // recorded measurement (2026-08-17): everymen 358, ua 18, ephemerists 41,
    // snide 82, singularity 221, wow 274, coven 335.
    expect([...FACTION_RAINBOW_ORDER]).toEqual([
      "everymen",
      "ua",
      "ephemerists",
      "snide",
      "singularity",
      "wow",
      "coven",
    ]);
  });
});

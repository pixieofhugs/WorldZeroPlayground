/**
 * Albescent hides in plain sight (#783): an Albescent surface is
 * INDISTINGUISHABLE from an unaffiliated one, so assertions compare against `na`,
 * not literals, keeping the two locked together. Only the reveal flow
 * (ADR-0027) and flourishes differ, never a colour.
 */
import { afterEach, describe, expect, it } from "vitest";
import "../../i18n";
import {
  FACTION_RAINBOW_ORDER,
  REDACTED,
  factionCssVar,
  factionDescription,
  factionFill,
  factionName,
  getAllFactions,
  isFactionHiddenFromChoosers,
  isFactionRedacted,
  isKnownFaction,
  redactableText,
  setAlbescentRevealed,
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

const SHAPES: FactionFillShape[] = [
  "bar",
  "dot",
  "disc",
  "pill",
  "frame",
  "rule",
];

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
    // A cloned token block would make isKnownFaction true: SOLID fill beside
    // `na`'s GRADIENT, i.e. conspicuous.
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
      "var(--faction-default-rainbow-conic)",
    );
  });

  it("is as anonymous as a missing slug, not merely as `na`", () => {
    // The null slug (no faction at all) too, or a diff against a bare row shows it.
    expect(factionCssVar("albescent")).toBe(factionCssVar(null));
    expect(factionFill("albescent", "disc")).toEqual(factionFill(null, "disc"));
  });

  it("is not a known faction — it has no resolvable theme", () => {
    // Load-bearing: every branch on this gives Albescent the `na` treatment.
    // Tested as a mapped VALUE, not key presence (#749, see ../factions.ts).
    expect(isKnownFaction("albescent")).toBe(isKnownFaction("na"));
    expect(isKnownFaction("albescent")).toBe(false);
  });

  it("claims no slot in the faction spectrum", () => {
    // A stripe bar built from this array would leak it to unrevealed players.
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
    // Guards against re-pointing albescent at another faction's identity.
    for (const suffix of SUFFIXES) {
      expect(factionCssVar("albescent", suffix)).not.toContain("--faction-ua");
    }
  });

  it("leaves no --faction-albescent-* reference behind", () => {
    // Backstop only: an absence check, weak on its own.
    for (const suffix of SUFFIXES) {
      expect(factionCssVar("albescent", suffix)).not.toContain("albescent");
    }
    expect(
      JSON.stringify(SHAPES.map((shape) => factionFill("albescent", shape))),
    ).not.toContain("albescent");
  });
});

/**
 * The name gate (#1891) and opt-in REDACTION (ADR-0082 §2). `factionName` reads a
 * module-level flag `AuthContext` sets, so it is global state: reset after each
 * case. Labels stay masked as `na`; only two surfaces redact. Both halves are
 * one ruling, asserted together so neither collapses into the other.
 */
describe("Albescent's name is masked, and two surfaces redact instead (#2409)", () => {
  // Not `beforeEach`: must also undo the LAST case's `true`.
  afterEach(() => setAlbescentRevealed(false));

  it("reads as Unaffiliated to a viewer who was never invited", () => {
    setAlbescentRevealed(false);
    expect(factionName("albescent")).toBe(factionName("na"));
  });

  it("is a NAME, not a blank — a blank advertises the omission", () => {
    setAlbescentRevealed(false);
    expect(factionName("albescent").trim().length).toBeGreaterThan(0);
    expect(factionName("albescent")).not.toBe("-");
  });

  it("keeps the LABEL masked while the two surfaces redact — the boundary", () => {
    // The case this block exists for (ADR-0082 §2).
    setAlbescentRevealed(false);

    // A LABEL (byline, card, seal, aria-label): masked word, never the mark.
    expect(factionName("albescent")).toBe(factionName("na"));
    expect(factionName("albescent")).not.toBe(REDACTED);
    // Description's only page is behind `AlbescentGate`.
    expect(factionDescription("albescent")).not.toBe(REDACTED);

    // A surface ABOUT the society (select tile, leaderboard lane) gets the mark,
    // off the same key `factionName` reads (#2806): the split is the caller.
    expect(redactableText("factions:names.albescent")).toBe(REDACTED);
    expect(isFactionRedacted("albescent")).toBe(true);
  });

  it("redacts every Albescent-scoped key, not just the name", () => {
    setAlbescentRevealed(false);
    // Two namespaces: the gate matches the segment, not the prefix.
    for (const key of [
      "factions:names.albescent",
      "feed:factionSelect.albescent.blurb",
      "feed:factionSelect.albescent.status.locked",
      "feed:factionSelect.albescent.cta",
    ]) {
      expect(redactableText(key), key).toBe(REDACTED);
    }
    expect(redactableText("feed:factionSelect.coven.cta")).not.toBe(REDACTED);
  });

  it("says its own name once the viewer is revealed", () => {
    setAlbescentRevealed(true);
    expect(factionName("albescent")).not.toBe(factionName("na"));
    // Non-vacuity: a missing catalog entry would green the unrevealed cases.
    expect(factionName("albescent")).toContain("Albescent");
    expect(redactableText("feed:factionSelect.albescent.cta")).not.toBe(
      REDACTED,
    );
  });

  it("defaults to hidden, so first paint and logged-out are the secret state", () => {
    // Module default: fail CLOSED before `/auth/me` answers.
    expect(factionName("albescent")).toBe(factionName("na"));
    expect(isFactionRedacted("albescent")).toBe(true);
    expect(redactableText("factions:names.albescent")).toBe(REDACTED);
  });

  it("paints and disables off the SAME answer the words redact on", () => {
    // Un-redact and unlock together, or a readable card gets a dead button.
    setAlbescentRevealed(false);
    expect(isFactionRedacted("albescent")).toBe(true);
    expect(isFactionRedacted("na")).toBe(false);
    expect(isFactionRedacted("ua")).toBe(false);
    expect(isFactionRedacted(null)).toBe(false);

    setAlbescentRevealed(true);
    expect(isFactionRedacted("albescent")).toBe(false);
  });

  it("touches no other slug in either state", () => {
    for (const revealed of [false, true]) {
      setAlbescentRevealed(revealed);
      expect(factionName("ua"), `ua @ ${revealed}`).not.toBe(factionName("na"));
      expect(factionName(null), `null @ ${revealed}`).toBe(factionName("na"));
      expect(factionName("not_a_faction"), `unknown @ ${revealed}`).toBe(
        factionName("na"),
      );
    }
  });

  it("removes the row from a CHOOSER rather than masking it", () => {
    // Masking would show two identical "Unaffiliated" rows: louder than the leak.
    setAlbescentRevealed(false);
    expect(isFactionHiddenFromChoosers("albescent")).toBe(true);
    expect(isFactionHiddenFromChoosers("na")).toBe(false);
    expect(isFactionHiddenFromChoosers("ua")).toBe(false);
    expect(isFactionHiddenFromChoosers(null)).toBe(false);

    setAlbescentRevealed(true);
    expect(isFactionHiddenFromChoosers("albescent")).toBe(false);
  });
});

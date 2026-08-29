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
      "var(--faction-default-rainbow-conic)",
    );
  });

  it("is as anonymous as a missing slug, not merely as `na`", () => {
    // This used to read factionColor(), a second hex table that has since been
    // deleted (#1269) — its primary-colour half is now the `undefined` suffix
    // above. What that loop does NOT cover is the null slug: a surface with no
    // faction at all. Albescent must be indistinguishable from that too, or the
    // society is visible to anyone who diffs a themed row against a bare one.
    expect(factionCssVar("albescent")).toBe(factionCssVar(null));
    expect(factionFill("albescent", "disc")).toEqual(factionFill(null, "disc"));
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
    // #232); it simply has none of its own. There is no alias map left to
    // check, so the resolved variables ARE the whole assertion.
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

/**
 * The name gate (#1891), now a REDACTION (#2409, ADR-0082).
 *
 * The look was already indistinguishable — everything above proves it — but the
 * WORD leaked through every surface that labels a thing with its faction.
 *
 * `factionName` is deliberately impure: it reads a module-level flag that
 * `AuthContext` sets, which is what makes ~35 call sites and every page written
 * later secret by construction. The cost of that decision is paid here — the
 * flag is global mutable state, it outlives the case that set it, and a leaked
 * `true` would make a later assertion pass for the wrong reason. Hence the
 * unconditional reset.
 *
 * WHAT #2409 ADDED, AND WHAT IT POINTEDLY DID NOT. #2409 first shipped as a
 * global rename: `factionName` answered `[REDACTED]`, so every label site
 * inverted at once. The owner ruled that back (ADR-0082 §2). `factionName` and
 * `factionDescription` are therefore UNCHANGED from #1891 — the mask holds
 * wherever a name labels a thing already on screen — and the redaction is an
 * OPT-IN seam that exactly two surfaces reach for. Both halves are asserted
 * below, in the same block, on purpose: they are one ruling and the failure
 * mode is a future change quietly collapsing them back into each other.
 */
describe("Albescent's name is masked, and two surfaces redact instead (#2409)", () => {
  // Not `beforeEach`: this must also undo a `true` left by the LAST case in the
  // block, which no `beforeEach` here would reach.
  afterEach(() => setAlbescentRevealed(false));

  it("reads as Unaffiliated to a viewer who was never invited", () => {
    setAlbescentRevealed(false);
    // Equality against `na` rather than the literal, for the reason the whole
    // file compares slugs: pinning the copy lets the two drift apart.
    expect(factionName("albescent")).toBe(factionName("na"));
  });

  it("is a NAME, not a blank — a blank advertises the omission", () => {
    setAlbescentRevealed(false);
    // A dash or an empty string where every other card carries a name tells the
    // viewer something is being withheld, which is the opposite of secret.
    expect(factionName("albescent").trim().length).toBeGreaterThan(0);
    expect(factionName("albescent")).not.toBe("-");
  });

  it("keeps the LABEL masked while the two surfaces redact — the boundary", () => {
    // THE CASE THIS BLOCK EXISTS FOR (ADR-0082 §2). The two halves are one
    // ruling, and a future change that "fixes the inconsistency" in either
    // direction breaks exactly here rather than silently on a byline nobody
    // rendered in a test.
    setAlbescentRevealed(false);

    // A LABEL — a praxis byline, a task card, a seal, the switcher, an
    // aria-label. All ~35 of them route through this one call, and it must
    // still say the masked word, never the mark.
    expect(factionName("albescent")).toBe(factionName("na"));
    expect(factionName("albescent")).not.toBe(REDACTED);
    // Same for the description: the only page that draws it sits behind
    // `AlbescentGate`, which no unrevealed account reaches.
    expect(factionDescription("albescent")).not.toBe(REDACTED);

    // A SURFACE THAT IS ABOUT THE SOCIETY — the `/factions` select tile and the
    // leaderboard's eighth lane. They ask, and get the mark. The tile reads the
    // CANONICAL name key since #2806, which is the same key `factionName`
    // reads one line above — so the two halves of the ruling now sit on ONE
    // string, and the split is purely in which function asks for it.
    expect(redactableText("factions:names.albescent")).toBe(REDACTED);
    expect(isFactionRedacted("albescent")).toBe(true);
  });

  it("redacts every Albescent-scoped key, not just the name", () => {
    setAlbescentRevealed(false);
    // The generalisation #2409 asks for. The select tile draws its slots off
    // `feed:factionSelect.albescent.*` — and, since #2806, its NAME off
    // `factions:names.albescent` in a second namespace. One gate has to cover
    // all of them or each is a place a future slot can be forgotten, and the
    // two namespaces below are what makes "matches the segment, not the
    // prefix" a tested property rather than a docblock claim.
    for (const key of [
      "factions:names.albescent",
      "feed:factionSelect.albescent.blurb",
      "feed:factionSelect.albescent.status.locked",
      "feed:factionSelect.albescent.cta",
    ]) {
      expect(redactableText(key), key).toBe(REDACTED);
    }
    // A neighbouring faction's identical slot must be untouched — otherwise the
    // regex is matching the shape of the key rather than the society.
    expect(redactableText("feed:factionSelect.coven.cta")).not.toBe(REDACTED);
  });

  it("says its own name once the viewer is revealed", () => {
    setAlbescentRevealed(true);
    expect(factionName("albescent")).not.toBe(factionName("na"));
    // Guards the gate from passing vacuously: if the catalog entry vanished,
    // the unrevealed assertions would go green for the wrong reason.
    expect(factionName("albescent")).toContain("Albescent");
    expect(redactableText("feed:factionSelect.albescent.cta")).not.toBe(
      REDACTED,
    );
  });

  it("defaults to hidden, so first paint and logged-out are the secret state", () => {
    // No setter call at all — this is the module's own starting value. Every
    // state before `/auth/me` answers must fail CLOSED: a name withheld for one
    // extra frame costs nothing, a name leaked once cannot be taken back.
    expect(factionName("albescent")).toBe(factionName("na"));
    expect(isFactionRedacted("albescent")).toBe(true);
    expect(redactableText("factions:names.albescent")).toBe(REDACTED);
  });

  it("paints and disables off the SAME answer the words redact on", () => {
    // #2409's comment thread: the card un-redacts and unlocks in the same
    // moment. A surface that asked a second question here could show a readable
    // card with a dead button.
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
    // The two halves are deliberately different answers. Masking a chooser row
    // would hand an unrevealed player two identical "Unaffiliated" checkboxes,
    // which is louder than the leak it replaces.
    setAlbescentRevealed(false);
    expect(isFactionHiddenFromChoosers("albescent")).toBe(true);
    expect(isFactionHiddenFromChoosers("na")).toBe(false);
    expect(isFactionHiddenFromChoosers("ua")).toBe(false);
    expect(isFactionHiddenFromChoosers(null)).toBe(false);

    setAlbescentRevealed(true);
    expect(isFactionHiddenFromChoosers("albescent")).toBe(false);
  });
});

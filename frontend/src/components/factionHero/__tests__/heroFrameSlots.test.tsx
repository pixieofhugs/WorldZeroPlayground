/**
 * THE SEAM: the markup every registered `factionHero` renders (#2997).
 *
 * The anatomy was already agreed — mark, kicker, name, tagline, counts — and
 * hand-authored eight times, with nothing holding any hero to it. Two guards
 * already exist because of that: `heroDrawsTheTileTagline` was written after
 * **ua drew no tagline at all**, and `factionWordmarkWrap` after four heroes
 * separately licensed a mid-word break on their own `<h1>`. Both are the same
 * defect — a decision that should be made once, made eight times, wrong in some
 * of them — and neither could have happened behind a frame that owns the
 * element.
 *
 * `heroFrame` owns three of the five slots as ELEMENTS (the kicker, the
 * wordmark, the counts row) so that "does this hero draw one?" stops being each
 * kit's private decision. This file is what makes the population claim true: for
 * every slug the manifest registers, all five slots are present, and the three
 * that share one reading column are in order.
 *
 * WHY ORDER IS ASSERTED ON THREE SLOTS AND NOT FIVE. The issue described the
 * five as drawn "in the same order"; the code disagrees, and the code wins.
 * Ephemerists, Snide and Singularity all mount their mark in a RIGHT-HAND column
 * that comes after the text column in the DOM, so mark-before-kicker is false
 * for three of the nine and asserting it would only pin today's flex order.
 * What is genuinely ordered everywhere is the reading stack the frame owns:
 * kicker -> wordmark -> tagline. The mark and the counts are asserted PRESENT,
 * which is the property the two guards above were filed for.
 *
 * The population is the MANIFEST's, never a list typed here (#2815, and the
 * hand-listed `SITES` array #2955 is open for): a tenth kit joins this sweep by
 * registering a `factionHero`, which is the only way a claim about "every
 * faction" stays true.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ComponentType } from "react";
import { describe, it, expect } from "vitest";

import "../../../i18n";
import i18n from "../../../i18n";
import { factionName } from "../../../utils/factions";
import type { FactionHeroProps } from "../../../pages/FactionDetail";
import { surfaceMap } from "../../../factions";
import { resolvedArchetype } from "../../../factions/lazyArchetype";

const HEROES = Object.entries(surfaceMap("factionHero"));

/**
 * Distinctive counts. The guard reads the three figures back out of the markup
 * to prove the row drew all of them, so they must not collide with a padding
 * value, a token or each other — `9` and `214` both appear inside unrelated
 * inline styles on several of these heroes.
 */
const COUNTS = { members: 2147, tasks: 3391, praxes: 1489 };

const render = (slug: string, lazy: ComponentType<FactionHeroProps>) => {
  const Hero = resolvedArchetype(lazy);
  // Not an `expect`: an unresolved archetype renders `null`, so every assertion
  // below would look like a missing slot instead of a warm-up failure.
  if (!Hero) throw new Error(`${slug}'s hero archetype never resolved`);
  return renderToStaticMarkup(
    <MemoryRouter>
      <Hero slug={slug} name={factionName(slug)} {...COUNTS} />
    </MemoryRouter>,
  );
};

describe("every faction hero mounts the frame's five slots (#2997)", () => {
  it("finds all nine kits, so the sweep cannot pass by looping nothing", () => {
    expect(HEROES).toHaveLength(9);
    expect(HEROES.map(([slug]) => slug)).toContain("na");
  });

  it.each(HEROES)("%s draws all five slots", (slug, Hero) => {
    const html = render(slug, Hero);

    // ── mark ── every kit draws its own (#2997 ruling 2); none is forced
    // through `FactionSigil`, so the assertion is only that a drawing exists.
    // Not `<svg`: na's and Albescent's mark is `FactionSigil`'s masked conic
    // disc, a `<div role="img">` with no SVG in it at all, and seven bespoke
    // marks are free to do the same tomorrow.
    expect(html, `${slug} draws a mark`).toMatch(/<svg|role="img"/);

    // ── kicker ── the frame's element. Singularity had none until #2997:
    // its boot sequence was read as filling the slot, and the owner ruled that
    // uniformity wins.
    expect(html, `${slug} draws a kicker`).toContain('data-hero-slot="kicker"');

    // ── name ── the wordmark, and the only h1 a hero draws.
    expect(html, `${slug} draws a wordmark`).toContain("<h1");

    // ── tagline ── the tile's key, not the hero's own (#2805).
    const tagline = i18n.t(`feed:factionSelect.${slug}.tagline`, { defaultValue: "" });
    expect(tagline, `${slug} has a tagline to draw`).not.toBe("");
    expect(html, `${slug} draws its tagline`).toContain(tagline);

    // ── counts ── the row is the frame's, so a kit cannot quietly draw two of
    // the three. The figures are read back rather than the labels, because each
    // faction names `members` in its own voice.
    expect(html, `${slug} draws a counts row`).toContain('data-hero-slot="counts"');
    for (const [name, value] of Object.entries(COUNTS)) {
      expect(html, `${slug} draws its ${name} count`).toContain(String(value));
    }
  });

  it.each(HEROES)("%s stacks kicker, wordmark and tagline in that order", (slug, Hero) => {
    const html = render(slug, Hero);
    const tagline = i18n.t(`feed:factionSelect.${slug}.tagline`, { defaultValue: "" });

    const kicker = html.indexOf('data-hero-slot="kicker"');
    const wordmark = html.indexOf("<h1");
    const taglineAt = html.indexOf(tagline);

    // Guards against a vacuous pass: `indexOf` returns -1 for a slot that was
    // never drawn, and -1 sits below every real index, so the two orderings
    // below would both hold for a hero that drew nothing at all.
    for (const [name, at] of [["kicker", kicker], ["wordmark", wordmark], ["tagline", taglineAt]] as const) {
      expect(at, `${slug} draws a ${name} to order`).toBeGreaterThan(-1);
    }

    expect(kicker, `${slug}'s kicker sits above its wordmark`).toBeLessThan(wordmark);
    expect(wordmark, `${slug}'s wordmark sits above its tagline`).toBeLessThan(taglineAt);
  });
});

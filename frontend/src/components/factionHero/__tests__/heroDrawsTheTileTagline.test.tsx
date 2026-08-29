/**
 * THE SEAM IS THE HERO'S TAGLINE SLOT (#2805).
 *
 * `feed:factionHero.{F}.motto` and `feed:factionSelect.{F}.tagline` were one
 * string in two keys: #2782 ruled the hero says what the tile says and set all
 * eight mottos to their faction's tagline, after which nothing held them
 * together. The first edit to either desynchronises them silently — the faction
 * page and the select tile start saying different things about the same faction
 * and no test fails.
 *
 * So the motto keys are gone and every hero reads the tile's tagline. This file
 * is what makes that a property rather than a coincidence: nine surfaces, one
 * key family, asserted per faction.
 *
 * IT IS ALSO THE FILE THAT WENT RED ON THE TWO HOLES THE FOLD CLOSED, which is
 * why it is a loop over the whole population rather than six repointed strings:
 *
 *   - **ua drew no tagline at all.** `UaFactionHero` renders no motto — #2782
 *     minted `factionHero.ua.motto` for a slot that did not exist, and the UA
 *     redesign's docblock recorded the Latin motto RIBBON's removal, which a
 *     reader took as settling the line too. The owner ruled on #2805 that the
 *     slot is restored: not the ribbon, a line in the hero's own quiet
 *     treatment, taking Coven's cut.
 *   - **na drew none either.** `feed:factionHero` has no `na` block, so
 *     `DefaultFactionHero` resolved its motto to `defaultValue: ""`.
 *     `factionSelect.na.tagline` has said "We play for the love of the game"
 *     all along; reading the tagline key mounts it without minting anything.
 *
 * Rendered at the COMPONENT the manifest names, not at the page, unlike
 * `defaultFactionHero.test.tsx`: the dispatch is that file's subject and is
 * covered there, and this harness has to reach `na`, which has no faction page
 * the page harness can build (`factions:na.join.*` does not exist).
 *
 * The assertion is on the KEY's resolved value rather than a hardcoded literal,
 * deliberately and in the opposite direction from
 * `defaultFactionHero.test.tsx`'s Albescent case — that one pins the WORDING
 * because #2504/#2519 got the wording wrong while reading the right key. This
 * one pins the KEY, because the wording is now authored in exactly one place
 * and the failure mode left is a surface that stops reading it.
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

/**
 * The population is the MANIFEST's, not a list typed here (#2814/#2815): each
 * slug's hero is the component the site actually mounts for it, code-split and
 * warmed by `src/test/preloadArchetypes.ts`. A tenth kit joins this sweep by
 * registering a `factionHero`, which is the only way a completeness claim about
 * "every faction" stays true. Seven are bespoke, Albescent's is a WRAPPER over
 * the fall-through, and `na`'s IS the fall-through.
 *
 * The archetype is resolved INSIDE each case and not at module scope: the warm
 * -up runs in `beforeAll`, so a lazy read up here would hand every case the
 * `null`-rendering stub and the whole file would assert against empty markup.
 */
const HEROES = Object.entries(surfaceMap("factionHero"));

const render = (slug: string, lazy: ComponentType<FactionHeroProps>) => {
  const Hero = resolvedArchetype(lazy);
  // Not an `expect`: an unresolved archetype renders `null`, so every assertion
  // downstream would look like a copy bug instead of a warm-up one.
  if (!Hero) throw new Error(`${slug}'s hero archetype never resolved`);
  return renderToStaticMarkup(
    <MemoryRouter>
      <Hero slug={slug} name={factionName(slug)} members={214} tasks={9} praxes={1489} />
    </MemoryRouter>,
  );
};

describe("every faction hero draws its tile's tagline (#2805)", () => {
  it("finds all nine kits, so the sweep cannot pass by looping nothing", () => {
    expect(HEROES).toHaveLength(9);
    expect(HEROES.map(([slug]) => slug)).toContain("na");
  });

  it.each(HEROES)("%s prints its factionSelect tagline", (slug, Hero) => {
    // `defaultValue` for the same reason `DefaultFactionHero` passes one: the
    // generated key union does not accept a computed key without it.
    const tagline = i18n.t(`feed:factionSelect.${slug}.tagline`, { defaultValue: "" });
    // Guards against a vacuous pass: a missing key resolves to "" here, and ""
    // is contained in every string ever rendered.
    expect(tagline, `${slug} has a tagline to draw`).not.toBe("");
    expect(render(slug, Hero), `${slug}'s hero prints its tagline`).toContain(tagline);
  });

  it("keeps the motto key family deleted, so the two cannot re-fork", () => {
    // The fold is only worth anything while there is ONE string. A re-minted
    // `factionHero.{F}.motto` would resolve, render, and drift.
    for (const [slug] of HEROES) {
      expect(i18n.exists(`feed:factionHero.${slug}.motto`), slug).toBe(false);
    }
  });
});

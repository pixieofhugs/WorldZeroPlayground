/**
 * Every hero prints its select tile's tagline (#2805): one key family, so the
 * page and tile can't drift. Rendered at the manifest's component (not the page)
 * so `na` is reachable. Asserts the KEY's value, not wording: wording lives in
 * one place now (`defaultFactionHero.test.tsx` pins Albescent's wording).
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
 * The manifest's population (#2815). Resolved inside each case: warm-up runs in
 * `beforeAll`, so a module-scope read would get the `null` stub.
 */
const HEROES = Object.entries(surfaceMap("factionHero"));

const render = (slug: string, lazy: ComponentType<FactionHeroProps>) => {
  const Hero = resolvedArchetype(lazy);
  // Throw, so a warm-up failure doesn't look like a copy bug.
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
    // Escaped as the markup escapes apostrophes.
    const tagline = i18n
      .t(`feed:factionSelect.${slug}.tagline`, { defaultValue: "" })
      .replace(/'/g, "&#x27;");
    // "" would match anything.
    expect(tagline, `${slug} has a tagline to draw`).not.toBe("");
    expect(render(slug, Hero), `${slug}'s hero prints its tagline`).toContain(tagline);
  });

  it("keeps the motto key family deleted, so the two cannot re-fork", () => {
    for (const [slug] of HEROES) {
      expect(i18n.exists(`feed:factionHero.${slug}.motto`), slug).toBe(false);
    }
  });
});

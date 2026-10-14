/**
 * THE SEAM IS THE HEADER'S AND THE TILE'S MEMBER NOUN (#3178).
 *
 * #3148 gave every faction one member noun, but Albescent's header read the
 * shared "Members" while its tile read "Players". Each surface is rendered at the
 * component the manifest names, so a surface that stops reading the faction's
 * catalog entry fails here.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import "../../../i18n";
import i18n from "../../../i18n";
import { factionName, setAlbescentRevealed } from "../../../utils/factions";
import { surfaceMap } from "../../../factions";
import { resolvedArchetype } from "../../../factions/lazyArchetype";
import FactionSelectCard from "../../selectCard/FactionSelectCard";

const SLUGS = Object.keys(surfaceMap("factionHero"));

/** Tags to spaces, whitespace collapsed, the apostrophe entity unescaped. */
const words = (html: string): string =>
  html.replace(/<[^>]*>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ");

describe("a faction's header and its tile count members in one noun (#3178)", () => {
  beforeEach(() => setAlbescentRevealed(true));
  afterEach(() => setAlbescentRevealed(false));

  it.each(SLUGS)("%s", (slug) => {
    const Hero = resolvedArchetype(surfaceMap("factionHero")[slug]);
    if (!Hero) throw new Error(`${slug}'s hero archetype never resolved`);
    for (const count of [1, 214]) {
      const hero = words(
        renderToStaticMarkup(
          <MemoryRouter>
            <Hero slug={slug} name={factionName(slug)} members={count} tasks={9} praxes={4} />
          </MemoryRouter>,
        ),
      );
      const tile = words(
        renderToStaticMarkup(<FactionSelectCard faction={slug} state="eligible" members={count} />),
      );
      // na has no block of its own and reads the shared noun on both surfaces.
      const own = `feed:factionHero.${slug}.stats.members`;
      const noun = i18n.t(i18n.exists(own, { count }) ? own : "feed:factionHero.stats.members", {
        count,
        defaultValue: "",
      });
      // Whole words: "Player" is a substring of "Players". Hero markup orders count and
      // label per kit, so the header is checked for the label, the tile for count + label.
      expect(hero, `${slug} header`).toMatch(new RegExp(`(^| )${noun}( |$)`));
      expect(tile, `${slug} tile`).toContain(`${count} ${noun}`);
    }
  });

  it("Albescent's noun is Players, singular and plural", () => {
    expect(i18n.t("feed:factionHero.albescent.stats.members", { count: 1 })).toBe("Player");
    expect(i18n.t("feed:factionHero.albescent.stats.members", { count: 5 })).toBe("Players");
  });
});

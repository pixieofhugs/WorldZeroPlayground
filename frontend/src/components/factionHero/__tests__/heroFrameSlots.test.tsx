/**
 * Every registered `factionHero` mounts the frame's five slots (#2997); the
 * population is the manifest's (#2815). Order is asserted only for kicker ->
 * wordmark -> tagline: three kits put the mark in a right-hand column after the
 * text in the DOM, so mark and counts are asserted present only.
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

/** Distinctive: `9` and `214` collide with inline styles on some heroes. */
const COUNTS = { members: 2147, tasks: 3391, praxes: 1489 };

/**
 * One slot's markup by div depth. Scoped, or ornament `<svg>` and stray figures
 * would satisfy document-wide checks.
 */
function slot(html: string, name: "mark" | "counts"): string {
  const marker = `data-hero-slot="${name}"`;
  const at = html.indexOf(marker);
  expect(at, `the hero draws a ${name} slot`).toBeGreaterThan(-1);
  const open = html.lastIndexOf("<div", at);
  expect(open, `the ${name} slot's marker sits on no div`).toBeGreaterThan(-1);

  let depth = 0;
  for (let i = open; i < html.length; i++) {
    if (html.startsWith("<div", i)) depth++;
    else if (html.startsWith("</div>", i) && --depth === 0) {
      return html.slice(open, i + "</div>".length);
    }
  }
  throw new Error(`${name} slot is never closed`);
}

const render = (slug: string, lazy: ComponentType<FactionHeroProps>) => {
  const Hero = resolvedArchetype(lazy);
  // Throw, so a warm-up failure doesn't look like a missing slot.
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

    // A drawing in the slot: `<svg>` (kits), `role="img"` (na), or
    // `mask-image` (Albescent's labyrinth).
    expect(slot(html, "mark"), `${slug} draws a mark in its mark slot`).toMatch(
      /<svg|role="img"|mask-image/,
    );

    expect(html, `${slug} draws a kicker`).toContain('data-hero-slot="kicker"');

    // The frame's h1, fingerprinted by its pinned wrap rule.
    expect(html, `${slug} draws a wordmark`).toContain("<h1");
    expect(html, `${slug}'s wordmark is the frame's`).toMatch(
      /<h1[^>]*overflow-wrap:\s*normal/,
    );

    // Escaped as the markup escapes apostrophes.
    const tagline = i18n
      .t(`feed:factionSelect.${slug}.tagline`, { defaultValue: "" })
      .replace(/'/g, "&#x27;");
    expect(tagline, `${slug} has a tagline to draw`).not.toBe("");
    expect(html, `${slug} draws its tagline`).toContain(tagline);

    // Figures, not labels (`members` is per-faction), read inside the row.
    const counts = slot(html, "counts");
    for (const [name, value] of Object.entries(COUNTS)) {
      expect(counts, `${slug} draws its ${name} count in the counts row`).toContain(
        String(value),
      );
    }
  });

  it.each(HEROES)("%s stacks kicker, wordmark and tagline in that order", (slug, Hero) => {
    const html = render(slug, Hero);
    const tagline = i18n
      .t(`feed:factionSelect.${slug}.tagline`, { defaultValue: "" })
      .replace(/'/g, "&#x27;");

    const kicker = html.indexOf('data-hero-slot="kicker"');
    const wordmark = html.indexOf("<h1");
    const taglineAt = html.indexOf(tagline);

    // -1 would satisfy the orderings vacuously.
    for (const [name, at] of [["kicker", kicker], ["wordmark", wordmark], ["tagline", taglineAt]] as const) {
      expect(at, `${slug} draws a ${name} to order`).toBeGreaterThan(-1);
    }

    expect(kicker, `${slug}'s kicker sits above its wordmark`).toBeLessThan(wordmark);
    expect(wordmark, `${slug}'s wordmark sits above its tagline`).toBeLessThan(taglineAt);
  });
});

describe("Singularity's kicker is spoken as a word, not leetspeak (#3248)", () => {
  it("hides the visible H4CKZ3R$ and exposes only 'Hackers' to a screen reader", () => {
    const html = render("singularity", HEROES.find(([slug]) => slug === "singularity")![1]);
    const kicker = html.match(/<p data-hero-slot="kicker".*?<\/p>/)![0];
    expect(kicker).toMatch(/<span aria-hidden="true">[^<]*H4CKZ3R\$<\/span>/);
    expect(kicker).toMatch(/<span class="sr-only">Hackers<\/span>/);
  });
});

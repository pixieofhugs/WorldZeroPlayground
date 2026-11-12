/**
 * Faction-select dispatch — the unaffiliated tile must not wear UA's costume
 * (#796, cf. #418/#636). Archetypes are warmed by `src/test/preloadArchetypes.ts`.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, it, expect } from "vitest";

import FactionSelectCard from "../FactionSelectCard";
import UaSelectCard from "../UaSelectCard";
import DefaultSelectCard from "../DefaultSelectCard";
import { surfaceMap } from "../../../factions";
import { resolveVariant } from "../../../utils/factionDispatch";
import { resolvedArchetype } from "../../../factions/lazyArchetype";
import { setAlbescentRevealed, UNAFFILIATED_FACTION_SLUG } from "../../../utils/factions";
import i18n from "../../../i18n";

const REST = { state: "eligible", members: 3 } as const;

const markup = (element: React.ReactElement): string => renderToStaticMarkup(element);

describe("FactionSelectCard fallback", () => {
  it("renders the unaffiliated slug through DefaultSelectCard, not UA's", () => {
    const viaDispatcher = markup(
      <FactionSelectCard faction={UNAFFILIATED_FACTION_SLUG} {...REST} />,
    );
    expect(viaDispatcher).toBe(markup(<DefaultSelectCard {...REST} />));
    expect(viaDispatcher).not.toBe(markup(<UaSelectCard {...REST} />));
  });

  it("wires the na row itself to DefaultSelectCard", () => {
    // Pins component identity, not just markup; `na` is a manifest row (#2530).
    const cards = surfaceMap("factionSelectCard");
    expect(cards[UNAFFILIATED_FACTION_SLUG]).toBeDefined();
    expect(
      resolvedArchetype(resolveVariant(cards, UNAFFILIATED_FACTION_SLUG)),
    ).toBe(DefaultSelectCard);
  });

  it("renders an unknown slug through DefaultSelectCard", () => {
    expect(markup(<FactionSelectCard faction="not-a-faction" {...REST} />)).toBe(
      markup(<DefaultSelectCard {...REST} />),
    );
  });

  it("borrows no faction's costume for the unaffiliated tile", () => {
    // On tokens, so repointing the fallback at ANY faction fails.
    const html = markup(<FactionSelectCard faction={UNAFFILIATED_FACTION_SLUG} {...REST} />);
    for (const slug of Object.keys(surfaceMap("factionSelectCard"))) {
      expect(html, `${slug} tokens on the unaffiliated tile`).not.toContain(
        `--faction-${slug}-`,
      );
    }
  });

  it("carries the spectrum rather than degrading to grey (ADR-0039)", () => {
    const html = markup(<DefaultSelectCard {...REST} />);
    // Both in full: the frame's name is a prefix of the sigil's conic (#1127).
    expect(html).toContain("var(--faction-default-rainbow)");
    expect(html).toContain("var(--faction-default-rainbow-conic)");
  });

  it("renders the na copy slots", () => {
    const text = markup(<DefaultSelectCard {...REST} />).replace(/<[^>]*>/g, "");
    // Name from the canonical catalog (#2806).
    expect(text).toContain(i18n.t("factions:names.na"));
    expect(text).toContain(i18n.t("feed:factionSelect.na.blurb"));
    expect(text).toContain(i18n.t("feed:factionSelect.na.status.eligible"));
    expect(text).toContain(i18n.t("feed:factionSelect.na.cta"));
    expect(text).toContain(`3 ${i18n.t("feed:factionHero.stats.members", { count: 3 })}`);
  });
});

describe("a select tile counts its members in the faction page header's noun", () => {
  const text = (slug: string, members: number): string =>
    markup(<FactionSelectCard faction={slug} state="eligible" members={members} />).replace(
      /<[^>]*>/g,
      "",
    );
  // Every registered tile but na, which has no header block and is pinned above.
  const slugs = Object.keys(surfaceMap("factionSelectCard")).filter(
    (slug) => slug !== UNAFFILIATED_FACTION_SLUG,
  );
  beforeEach(() => setAlbescentRevealed(true));
  afterEach(() => setAlbescentRevealed(false));

  it.each(slugs)("%s agrees with the count", (slug) => {
    for (const count of [1, 7]) {
      const noun = i18n.t(`feed:factionHero.${slug}.stats.members`, { count, defaultValue: "" });
      expect(noun, `${slug} has a header noun`).not.toBe("");
      expect(text(slug, count)).toContain(`${count} ${noun}`);
    }
    expect(i18n.t(`feed:factionHero.${slug}.stats.members`, { count: 1, defaultValue: "" })).not.toBe(
      i18n.t(`feed:factionHero.${slug}.stats.members`, { count: 7, defaultValue: "" }),
    );
  });
});

describe("every select tile speaks its standing in all three states (#3138)", () => {
  beforeEach(() => setAlbescentRevealed(true));
  afterEach(() => setAlbescentRevealed(false));

  // "Every faction has a locked standing line" (#3130) is this loop.
  it.each(Object.keys(surfaceMap("factionSelectCard")))("%s", (slug) => {
    for (const state of ["locked", "eligible", "member"] as const) {
      const standing = i18n.t(`feed:factionSelect.${slug}.status.${state}`, { defaultValue: "" });
      expect(standing, `${slug} has a ${state} standing`).not.toBe("");
      // UA's locked key holds owed copy and is not drawn; #3140 removes this exemption.
      if (slug === "ua" && state === "locked") continue;
      // Compared as markup: the renderer escapes the catalog's apostrophes.
      expect(markup(<FactionSelectCard faction={slug} state={state} />)).toContain(
        markup(<>{standing}</>),
      );
    }
  });
});

describe("FactionSelectCard registered tiles are unchanged", () => {
  it("keeps UA on its own gilt placard", () => {
    const viaDispatcher = markup(<FactionSelectCard faction="ua" {...REST} />);
    expect(viaDispatcher).toBe(markup(<UaSelectCard {...REST} />));
    expect(viaDispatcher).not.toBe(markup(<DefaultSelectCard {...REST} />));
  });

  it("renders every registered faction in its own costume", () => {
    const fallback = markup(<DefaultSelectCard {...REST} />);
    // na excluded: its row IS the fallback (#2530), asserted above.
    const bespoke = Object.keys(surfaceMap("factionSelectCard")).filter(
      (slug) => slug !== UNAFFILIATED_FACTION_SLUG,
    );
    for (const slug of bespoke) {
      expect(
        markup(<FactionSelectCard faction={slug} {...REST} />),
        `${slug} keeps its own tile`,
      ).not.toBe(fallback);
    }
  });

  it("keeps the legacy slugs pointed at their live archetype", () => {
    const fallback = markup(<DefaultSelectCard {...REST} />);
    for (const [legacy, live] of [
      ["gestalt", "coven"],
      ["journeymen", "ephemerists"],
    ]) {
      const html = markup(<FactionSelectCard faction={legacy} {...REST} />);
      expect(html, `${legacy} → ${live}`).toBe(
        markup(<FactionSelectCard faction={live} {...REST} />),
      );
      expect(html, `${legacy} did not fall through`).not.toBe(fallback);
    }
  });
});

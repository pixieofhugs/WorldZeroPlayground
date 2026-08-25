/**
 * Faction-select dispatch — the unaffiliated tile must not wear UA's costume
 * (#796, the third instance of #418/#636).
 *
 * The dispatcher's fallback used to be `UaSelectCard`, so `na` — and every
 * unknown slug, and Albescent if its tile were ever unregistered — rendered UA's
 * gilt placard. The blocker was that no `DefaultSelectCard` existed. It does
 * now, and these assertions pin the two halves of the fix: the neutral card is
 * what an unaffiliated player gets, and no faction with its own tile lost it.
 *
 * `renderToStaticMarkup` only — no jsdom, no testing-library, effects never run.
 * Archetypes are code-split and are warmed by `src/test/preloadArchetypes.ts`.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";

import FactionSelectCard from "../FactionSelectCard";
import UaSelectCard from "../UaSelectCard";
import DefaultSelectCard from "../DefaultSelectCard";
import { surfaceMap } from "../../../factions";
import { resolveVariant } from "../../../utils/factionDispatch";
import { resolvedArchetype } from "../../../factions/lazyArchetype";
import { UNAFFILIATED_FACTION_SLUG } from "../../../utils/factions";
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
    // The markup check above would also pass if some future map row happened to
    // render identical HTML; this pins the component identity. `na` HAS a
    // manifest since #2530 — the registration used to be `pickVariant`'s third
    // argument at this dispatcher, which is exactly the second mechanism that
    // issue removed — so the row must exist AND point at DefaultSelectCard.
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
    // UA's tile is the one that used to be handed out. Assert on the tokens
    // rather than on the whole string, so this still fails if the fallback is
    // repointed at any OTHER faction later.
    const html = markup(<FactionSelectCard faction={UNAFFILIATED_FACTION_SLUG} {...REST} />);
    for (const slug of Object.keys(surfaceMap("factionSelectCard"))) {
      expect(html, `${slug} tokens on the unaffiliated tile`).not.toContain(
        `--faction-${slug}-`,
      );
    }
    expect(html).not.toContain("--albescent-reveal");
  });

  it("carries the spectrum rather than degrading to grey (ADR-0039)", () => {
    const html = markup(<DefaultSelectCard {...REST} />);
    // The frame's fill and the sigil's conic ring — both via factionFill /
    // --faction-default-*, never the neutral scalar. Both names are asserted in
    // full: since #1127 pointed the sigil at --faction-default-rainbow-conic,
    // "--faction-default-rainbow" is a PREFIX of the conic's name, so a bare
    // toContain on it would pass on the sigil alone and stop proving the frame
    // is painted at all.
    expect(html).toContain("var(--faction-default-rainbow)");
    expect(html).toContain("var(--faction-default-rainbow-conic)");
  });

  it("renders the na copy slots", () => {
    const text = markup(<DefaultSelectCard {...REST} />).replace(/<[^>]*>/g, "");
    expect(text).toContain(i18n.t("feed:factionSelect.na.name"));
    expect(text).toContain(i18n.t("feed:factionSelect.na.blurb"));
    expect(text).toContain(i18n.t("feed:factionSelect.na.status.eligible"));
    expect(text).toContain(i18n.t("feed:factionSelect.na.cta"));
    expect(text).toContain(i18n.t("feed:factionSelect.na.members", { count: 3 }));
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

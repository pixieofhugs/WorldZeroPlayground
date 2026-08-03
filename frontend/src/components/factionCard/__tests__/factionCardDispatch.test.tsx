/**
 * Faction-card dispatch + content-slot guard (#782).
 *
 * `FactionCard` was the one dispatcher that bypassed `pickVariant`, raw-switching
 * on `props.faction.slug`, and it had NO test of any kind — `factionCardSlots`
 * covers the task/praxis/comment archetypes, not this file. Folding it into the
 * shared seam therefore needed its own guard, which is this.
 *
 * Every archetype must render the same CONTENT slots in its own costume: the
 * faction's name and the invitation eyebrow. We render to static markup and
 * assert on the text each slot leaves behind.
 *
 * The status badge is deliberately NOT in that list. Writing this test turned up
 * that the Everymen card — a recruitment poster — renders no status badge at
 * all, and shouts its copy in uppercase. That is a pre-existing archetype
 * difference, not a regression, and per house style each faction keeps its own
 * card archetype rather than being flattened into a shared one. The status slot
 * is therefore asserted on the Default card only.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";

import FactionCard, { DefaultFactionCard } from "../FactionCard";
import { surfaceMap } from "../../../factions";
import i18n from "../../../i18n";
import { factionName } from "../../../utils/factions";
import type { FactionOut } from "../../../api/factions";

// `GET /factions` sends the slug and the row's own visibility, and nothing
// else: #461 moved name/description into the factions.json catalog, and this
// fixture went on asserting them behind an `as FactionOut` that hid the fact
// (#1400). `factionName(slug)` is where the words come from now.
function faction(slug: string): FactionOut {
  return { slug, status: "visible" };
}

function markup(element: React.ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(element);
  // Several archetypes split the name across spans (SNIDE's masthead, the
  // Ephemerists' lapis last word), so the slot only reads contiguously once the
  // tags are stripped.
  return { html, text: html.replace(/<[^>]*>/g, "") };
}

const MEMBER_LABEL = i18n.t("feed:factionCard.status.member");

// Archetypes are free to SHOUT: the Everymen card is a recruitment poster and
// renders its copy uppercased. Compare case-insensitively so the slot check
// tests presence, not typography.
const shout = (value: string) => value.toUpperCase();

// The dispatcher's own archetypes, plus the Default that every unregistered
// faction lands on — the default is a registered renderable too.
const archetypes = {
  ...surfaceMap("factionCard"),
  __default__: DefaultFactionCard,
};

describe("faction-card content-slot invariant", () => {
  for (const [slug, Card] of Object.entries(archetypes)) {
    const subject = slug === "__default__" ? "albescent" : slug;

    it(`${slug} renders the faction name slot`, () => {
      const { text } = markup(
        <Card faction={faction(subject)} status="member" />,
      );
      expect(shout(text), "name slot").toContain(shout(factionName(subject)));
    });

    it(`${slug} renders the invitation eyebrow when one is set`, () => {
      const { text } = markup(
        <Card
          faction={faction(subject)}
          status="invited"
          invitationNote="Bring a trowel."
        />,
      );
      expect(shout(text), "invitation slot").toContain(shout("Bring a trowel."));
    });
  }
});

describe("FactionCard dispatch", () => {
  it("routes each faction with a bespoke card to its own archetype", () => {
    // Six factions ship a bespoke card; each must render something other than
    // the generic default for the same inputs.
    for (const slug of Object.keys(surfaceMap("factionCard"))) {
      const bespoke = markup(
        <FactionCard faction={faction(slug)} status="member" />,
      ).html;
      const fallback = markup(
        <DefaultFactionCard faction={faction(slug)} status="member" />,
      ).html;
      expect(bespoke, `${slug} renders its own card`).not.toBe(fallback);
    }
  });

  it("renders albescent through the Default card, not a borrowed costume", () => {
    // Albescent has no bespoke faction card and never did: the old raw switch
    // had no `albescent` case because there is no `AlbescentCard` to name. This
    // pins that it lands on the neutral Default rather than inheriting another
    // faction's skin — the behaviour the conversion had to preserve exactly.
    const viaDispatcher = markup(
      <FactionCard faction={faction("albescent")} status="member" />,
    ).html;
    const viaDefault = markup(
      <DefaultFactionCard faction={faction("albescent")} status="member" />,
    ).html;
    expect(viaDispatcher).toBe(viaDefault);
  });

  it("renders the status badge on the Default card", () => {
    const { text } = markup(
      <DefaultFactionCard faction={faction("albescent")} status="member" />,
    );
    expect(text, "status slot").toContain(MEMBER_LABEL);
  });

  it("renders an unaffiliated / unknown slug through the Default card", () => {
    const html = markup(
      <FactionCard faction={faction("na")} status="not_invited" />,
    ).html;
    expect(html).toBe(
      markup(
        <DefaultFactionCard faction={faction("na")} status="not_invited" />,
      ).html,
    );
  });
});

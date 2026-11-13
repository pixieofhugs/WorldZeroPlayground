/**
 * The faction page's spine, asserted by name for every body (#2546/#2547/#2548).
 * One stacked order at every width (#3182), shared `.wz-faction-grid`:
 * hero (page), About, band (Standing + Champion), Tasks, Praxis, Members (last:
 * the roll is uncapped). By name, not count: a census passes when a body draws one
 * region twice. Bodies imported directly: `lazyArchetype` wrappers don't SSR.
 */
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ComponentType } from "react";
import { describe, it, expect } from "vitest";
// Initialize the i18n catalog so faction copy keys resolve to English text.
import "../../../i18n";
import i18n from "../../../i18n";
import type { CharacterOut } from "../../../api/auth";
import type { FactionDetailState } from "../useFactionDetail";
import AlbescentFactionBody from "../archetypes/AlbescentFactionBody";
import CovenFactionBody from "../archetypes/CovenFactionBody";
import DefaultFactionBody from "../archetypes/DefaultFactionBody";
import EphemeristsFactionBody from "../archetypes/EphemeristsFactionBody";
import EverymenFactionBody from "../archetypes/EverymenFactionBody";
import SingularityFactionBody from "../archetypes/SingularityFactionBody";
import SnideFactionBody from "../archetypes/SnideFactionBody";
import UaFactionBody from "../archetypes/UaFactionBody";
import WowFactionBody from "../archetypes/WowFactionBody";

type Body = ComponentType<{ state: FactionDetailState }>;

/** `albescent` wraps `DefaultFactionBody` (na); listed separately for #2546. */
const BODIES: Array<[string, Body]> = [
  ["na", DefaultFactionBody as Body],
  ["albescent", AlbescentFactionBody as Body],
  ["coven", CovenFactionBody as Body],
  ["ephemerists", EphemeristsFactionBody as Body],
  ["everymen", EverymenFactionBody as Body],
  ["singularity", SingularityFactionBody as Body],
  ["snide", SnideFactionBody as Body],
  ["ua", UaFactionBody as Body],
  ["wow", WowFactionBody as Body],
];

function aCharacter(over: Partial<CharacterOut> = {}): CharacterOut {
  return {
    all_time_score: 100,
    avatar_url: "",
    badges: [],
    bio: "",
    created_at: "2026-01-01T00:00:00Z",
    display_name: "Ada",
    faction_slug: "coven",
    id: 1,
    invitations: [],
    level: 4,
    location: "",
    score: 100,
    status: "active",
    tagline: "",
    username: "ada",
    ...over,
  };
}

/**
 * Two members so a champion and a roll both exist; scores out of order so an
 * unsorted body names the wrong champion. `display_name` === `username` because
 * na's `CharacterBadge` prints the handle while bespoke kits print the name.
 */
const TOP = "TopScorer";
const RUNNER_UP = "RunnerUp";
const MEMBERS: CharacterOut[] = [
  aCharacter({ id: 1, display_name: RUNNER_UP, username: RUNNER_UP, all_time_score: 40 }),
  aCharacter({ id: 2, display_name: TOP, username: TOP, all_time_score: 900 }),
];

function stateFor(slug: string): FactionDetailState {
  return {
    slug,
    loading: false,
    faction: { slug },
    fetchError: null,
    members: MEMBERS,
    tasks: [],
    recentPraxis: [],
    sections: undefined,
    membership: {
      state: "eligible",
      currentFactionSlug: null,
      join: async () => {},
      joining: false,
      joinError: null,
    },
  } as unknown as FactionDetailState;
}

function markup(slug: string, Body: Body): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <Body state={stateFor(slug)} />
    </MemoryRouter>,
  );
}

/**
 * Spelled out, not a template literal: that widens past the typed key union and
 * `typecheck:design-sync` refuses it (TS2345).
 */
const CHAMPION_LABEL = {
  na: "factions:detail.spotlightLabel",
  albescent: "factions:detail.spotlightLabel",
  coven: "factions:coven.spotlight.label",
  ephemerists: "factions:ephemerists.spotlight.label",
  everymen: "factions:everymen.spotlight.label",
  singularity: "factions:singularity.spotlight.label",
  snide: "factions:snide.spotlight.label",
  ua: "factions:ua.spotlight.label",
  wow: "factions:wow.spotlight.label",
} as const;

function championLabel(slug: string): string {
  const key = CHAMPION_LABEL[slug as keyof typeof CHAMPION_LABEL];
  expect(key, `a champion-label key is listed for ${slug}`).toBeTruthy();
  const label = i18n.t(key);
  // A missing key echoes back, and `toContain` would match it against itself.
  expect(label, `${key} resolves to real copy`).not.toBe(key);
  return label;
}

function membersHeading(): string {
  return i18n.t("factions:detail.default.membersHeading", { total: MEMBERS.length });
}

describe("A. every faction body roots on the shared stack", () => {
  for (const [slug, Body] of BODIES) {
    it(`${slug} mounts .wz-faction-grid`, () => {
      // #2546
      expect(markup(slug, Body)).toContain("wz-faction-grid");
    });
  }
});

describe("B. every faction body draws all six spine regions", () => {
  for (const [slug, Body] of BODIES) {
    it(`${slug} draws About`, () => {
      // #2547
      expect(markup(slug, Body)).toContain(i18n.t("factions:detail.aboutHeading"));
    });

    it(`${slug} draws Champion`, () => {
      // #2548
      expect(markup(slug, Body)).toContain(championLabel(slug));
    });

    it(`${slug} draws Members`, () => {
      expect(markup(slug, Body)).toContain(membersHeading());
    });

    it(`${slug} draws Tasks and Recently-completed`, () => {
      const html = markup(slug, Body);
      expect(html, "tasks").toContain(i18n.t("factions:detail.default.tasksHeading", { total: 0 }));
      expect(html, "praxis").toContain(i18n.t("factions:detail.default.recentHeading"));
    });
  }
});

describe("C. Members come after Tasks and Praxis", () => {
  for (const [slug, Body] of BODIES) {
    it(`${slug} puts Members below Tasks and Praxis in document order`, () => {
      // #2548; document order stands in for layout.
      const html = markup(slug, Body);
      const members = html.indexOf(membersHeading());
      const tasks = html.indexOf(i18n.t("factions:detail.default.tasksHeading", { total: 0 }));
      const praxis = html.indexOf(i18n.t("factions:detail.default.recentHeading"));

      expect(members, "Members rendered").toBeGreaterThan(-1);
      expect(tasks, "Tasks rendered").toBeGreaterThan(-1);
      expect(praxis, "Praxis rendered").toBeGreaterThan(-1);
      expect(members, "Members after Tasks").toBeGreaterThan(tasks);
      expect(members, "Members after Praxis").toBeGreaterThan(praxis);
    });
  }
});

describe("D. the champion is the highest ALL-TIME score, everywhere", () => {
  for (const [slug, Body] of BODIES) {
    it(`${slug} names the top scorer, not the first member given`, () => {
      // `all_time_score` survives an era reset, so the card never blanks on day one.
      const html = markup(slug, Body);
      const label = championLabel(slug);
      const at = html.indexOf(label);
      expect(at, `${slug} draws its champion label`).toBeGreaterThan(-1);
      const top = html.indexOf(TOP, at);
      const runnerUp = html.indexOf(RUNNER_UP, at);
      expect(top, "the top scorer is named after the champion label").toBeGreaterThan(-1);
      expect(top, "and named before the runner-up").toBeLessThan(
        runnerUp === -1 ? Number.MAX_SAFE_INTEGER : runnerUp,
      );
    });
  }
});

describe("E. one carrier per plate (#2576, ADR-0083 3b)", () => {
  // A plate holds either Albescent's 3px `.alb-plate-edge` ring or na's
  // `PLATE_RULE` hairline, never both. Asserted per plate by name, not counted.

  /** The open tag of the `.faction-plate` section that holds `heading`. */
  function plateOf(html: string, heading: string): string {
    const at = html.indexOf(heading);
    expect(at, `a plate carries ${JSON.stringify(heading)}`).toBeGreaterThan(-1);
    const open = html.lastIndexOf('<section class="faction-plate"', at);
    expect(open, `${JSON.stringify(heading)} sits inside a .faction-plate`).toBeGreaterThan(-1);
    const close = html.indexOf("</section>", at);
    return html.slice(open, close);
  }

  it("na keeps its hairline on all five plates", () => {
    const html = markup("na", DefaultFactionBody as Body);
    for (const heading of [
      i18n.t("factions:detail.aboutHeading"),
      i18n.t("factions:detail.spotlightLabel"),
      membersHeading(),
      i18n.t("factions:detail.default.tasksHeading", { total: 0 }),
      i18n.t("factions:detail.default.recentHeading"),
    ]) {
      const plate = plateOf(html, heading);
      expect(plate, `na's ${heading} plate draws the hairline`).toContain("faction-plate-rule");
      expect(plate, `na's ${heading} plate mounts no 3px carrier`).not.toContain("alb-plate-edge");
    }
  });

  // Card plates have no ring (cards carry their own edges), so they keep the hairline.
  it("albescent's text plates carry the ring alone", () => {
    const html = markup("albescent", AlbescentFactionBody as Body);
    for (const heading of [
      i18n.t("factions:detail.aboutHeading"),
      i18n.t("factions:detail.spotlightLabel"),
      membersHeading(),
    ]) {
      const plate = plateOf(html, heading);
      expect(plate, `${heading} mounts the 3px carrier`).toContain("alb-plate-edge");
      expect(plate, `${heading} draws no second, thinner rainbow`).not.toContain(
        "faction-plate-rule",
      );
    }
  });

  it("albescent's card plates keep the hairline, having no ring", () => {
    const html = markup("albescent", AlbescentFactionBody as Body);
    for (const heading of [
      i18n.t("factions:detail.default.tasksHeading", { total: 0 }),
      i18n.t("factions:detail.default.recentHeading"),
    ]) {
      const plate = plateOf(html, heading);
      expect(plate, `${heading} mounts no ring`).not.toContain("alb-plate-edge");
      expect(plate, `${heading} keeps its hairline`).toContain("faction-plate-rule");
    }
  });
});

describe("F. one stacked order, no rail (#3182)", () => {
  for (const [slug, Body] of BODIES) {
    it(`${slug}: About, band (Standing + Champion), Tasks, Praxis, Members`, () => {
      const html = markup(slug, Body);
      const at = (needle: string) => html.indexOf(needle);
      const order = [
        at(i18n.t("factions:detail.aboutHeading")),
        at('class="wz-faction-band"'),
        at(championLabel(slug)),
        at(i18n.t("factions:detail.default.tasksHeading", { total: 0 })),
        at(i18n.t("factions:detail.default.recentHeading")),
        at(membersHeading()),
      ];
      expect(order.every((i) => i > -1), `every region drawn: ${order}`).toBe(true);
      expect(order, "in the ruled order").toEqual([...order].sort((a, b) => a - b));
    });
  }

  it("the stylesheet carries no rail track", () => {
    const css = readFileSync("src/css/03-faction-chrome-1.css", "utf8");
    expect(css).not.toContain("1fr 322px");
    expect(css).not.toContain("max-width: 860px");
  });
});

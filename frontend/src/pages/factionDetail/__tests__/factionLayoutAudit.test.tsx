/**
 * THE FACTION PAGE'S SPINE, asserted by name for every body (#2546/#2547/#2548).
 *
 * Every faction page is the same six regions in the same two columns, and the
 * shape is NOT a per-skin choice — `.wz-faction-grid` in `index.css` is the
 * shared seam (`1fr 322px`, 34px gap, one column at `max-width: 860px`).
 *
 *   ①  hero                        above, full width — the PAGE draws it
 *   ②  About                       main
 *   ④  Tasks                       main
 *   ⑤  Recently-completed praxis   main
 *   ③  Join / gate / standing      rail
 *   ⑥  Champion + Members          rail
 *
 * Three separate audit findings all reduced to "one body is not doing that", and
 * all three are fixed together because this file is the shared artefact they
 * needed:
 *
 *   #2546  `DefaultFactionBody` never mounted `.wz-faction-grid` at all, so
 *          Albescent — which renders it whole through a six-line wrapper — was
 *          the one live faction page with no rail on a laptop.
 *   #2547  `SingularityFactionBody` was the only body on the site that never
 *          read `detail.aboutHeading`, so its first region was the only one a
 *          reader met unlabelled.
 *   #2548  `WowFactionBody` drew its muster roll in the MAIN column and named no
 *          champion, so Members rendered BEFORE Tasks on that page alone.
 *
 * WHY BY NAME AND NOT BY COUNT. A census ("every body draws six regions") passes
 * for the wrong reason as soon as a body draws one region twice, and it cannot
 * say WHICH one is missing when it fails. Each assertion below names the body and
 * the region, so a failure reads as the finding rather than as arithmetic.
 *
 * The bodies are imported directly rather than through `surfaceMap('factionBody')`
 * because that registry hands back `lazyArchetype` wrappers, which
 * `renderToStaticMarkup` cannot resolve synchronously. `wowFactionBody.test.tsx`
 * imports directly for the same reason.
 */
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

/**
 * Every registered body, keyed by the slug it dresses. `na` is
 * `DefaultFactionBody`; `albescent` is its wrapper, listed separately because
 * the wrapper is exactly what #2546's defect reached the site through.
 */
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
 * Two members, so a champion AND a roll below it both exist — the state #2548's
 * `membersEmptyWithSpotlight` line distinguishes. The scores are deliberately
 * out of order so a body that forgets to sort names the wrong champion.
 *
 * `display_name` and `username` carry the SAME token on purpose. The bodies do
 * not agree on which one they print — na's champion goes through
 * `CharacterBadge`, which draws the handle, while the bespoke kits draw the
 * display name — and a fixture that distinguishes the two members in only one of
 * those fields makes this file's assertions depend on which field a given kit
 * happens to pick. Matching them means the probe reads the same either way.
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
    viewerFactionSlug: null,
    gameFactions: [],
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
 * The champion label each kit uses: its own, or na's shared one.
 *
 * Spelled out rather than built as `factions:${slug}.spotlight.label`. The copy
 * keys are typed as a literal union, so a template literal widens past it and
 * `typecheck:design-sync` refuses it (TS2345) — the app typecheck and the
 * preview-kit typecheck both read this file. Listing them also means a faction
 * whose label key is renamed fails here by name instead of resolving to a raw
 * key string that `toContain` would happily match against itself.
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
  // A missing key makes i18next echo the key back, which would make every
  // `toContain` below pass against itself.
  expect(label, `${key} resolves to real copy`).not.toBe(key);
  return label;
}

function membersHeading(): string {
  return i18n.t("factions:detail.default.membersHeading", { total: MEMBERS.length });
}

describe("A. every faction body roots on the shared main+rail grid", () => {
  for (const [slug, Body] of BODIES) {
    it(`${slug} mounts .wz-faction-grid`, () => {
      // #2546: `DefaultFactionBody` did not, and Albescent inherited that, so a
      // laptop got one stacked column and the join verb in a bare 420px box.
      expect(markup(slug, Body)).toContain("wz-faction-grid");
    });
  }
});

describe("B. every faction body draws all six spine regions", () => {
  for (const [slug, Body] of BODIES) {
    it(`${slug} draws About`, () => {
      // #2547: Singularity was the only body that never read this key.
      expect(markup(slug, Body)).toContain(i18n.t("factions:detail.aboutHeading"));
    });

    it(`${slug} draws Champion`, () => {
      // #2548: WOW named no champion — the top scorer was just row 1 of the roll.
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

describe("C. the rail regions come after the main-column regions", () => {
  for (const [slug, Body] of BODIES) {
    it(`${slug} puts Members below Tasks and Praxis in document order`, () => {
      // #2548: WOW's Members landed BEFORE its Tasks, because the roll was in the
      // main column. Document order is the readable proxy for "which column" in a
      // harness with no layout engine — the rail is the grid's second child, so
      // everything in it necessarily serialises after everything in main.
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
      // `all_time_score` rather than the era `score`, for the reason every body
      // already states: the two agree inside an era and only that one survives a
      // reset, so the card does not blank itself on day one. MEMBERS is supplied
      // out of order, so a body that skips the sort names "Runner Up".
      const html = markup(slug, Body);
      const label = championLabel(slug);
      const at = html.indexOf(label);
      expect(at, `${slug} draws its champion label`).toBeGreaterThan(-1);
      // The champion's name has to appear somewhere after its own label, and
      // before the runner-up does — the roll is ranked below the card.
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
  /**
   * The three text-holding plates each mounted TWO spectrum carriers at once:
   * `plateOrnament` — Albescent's 3px `.alb-plate-edge` ring around the whole
   * plate — and `PLATE_RULE`, na's 2px/0.55 hairline under the heading. Nothing
   * suppressed the hairline, so both painted: two rainbows on one object, the
   * same doubling #2527 took off the field desk, #2559 off the score stamp and
   * #2553 off the composer. This was the fourth site and the last the sweep
   * found.
   *
   * ASSERTED BY NAME, not by counting. The issue asks for it explicitly, and the
   * reason is that a census which counts spectrum rules per page lets a NEW plate
   * be wrong twice and still total correctly. So each case below names a plate
   * by its own heading and says which carrier that plate is allowed to hold.
   *
   * `PLATE_RULE` is NOT deleted: it is correct for the seven factions that hand
   * no ornament, where it is the only spectrum on the plate. It yields to the
   * thicker carrier and to nothing else.
   */

  /** The open tag of the `.faction-plate` section that holds `heading`. */
  function plateOf(html: string, heading: string): string {
    const at = html.indexOf(heading);
    expect(at, `a plate carries ${JSON.stringify(heading)}`).toBeGreaterThan(-1);
    const open = html.lastIndexOf('<section class="faction-plate"', at);
    expect(open, `${JSON.stringify(heading)} sits inside a .faction-plate`).toBeGreaterThan(-1);
    const close = html.indexOf("</section>", at);
    return html.slice(open, close);
  }

  /** na hands no ornament, so every plate keeps the hairline it always had. */
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

  /**
   * Albescent's three TEXT plates take the ring and give up the hairline; its two
   * CARD plates never had a ring (the cards carry their own edges) so they keep
   * the hairline. Both halves matter: dropping the rule everywhere would strip
   * the card plates of their only spectrum.
   */
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

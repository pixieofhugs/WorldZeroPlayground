/**
 * THE SEAM IS THE FRONTISPIECE DISPATCH (#2504, epic #2496 ruling 11).
 *
 * `pickVariant(surfaceMap('factionHero'), slug)` had no fallback, so a faction
 * that registers no hero got `PageTitle` + a description card while the other
 * seven got a frontispiece. This file is rendered at the PAGE, not at the
 * component, because the defect lives in the dispatch: a component test of a new
 * `DefaultFactionHero` would pass happily while nothing on the site mounted it.
 *
 * Four things hold:
 *   1. the fall-through slug draws the na hero, with all five slots;
 *   2. the SIGIL is dispatched by slug — the hero hardcodes no mark, so
 *      Albescent gets its labyrinth and na would get the swept ring;
 *   3. the seven bespoke heroes are untouched — a new fallback must not reach
 *      any faction that already registers one;
 *   4. the description still appears exactly ONCE (#2137). The fall-through
 *      chrome was where it used to live, so removing that chrome without giving
 *      the na body an About plate would take it to zero.
 *
 * Harness is `defaultFactionPlate.test.tsx`'s, for its reasons: the real
 * dispatch, no DOM, `useFactionDetail` mocked because effects never run under
 * `renderToStaticMarkup`.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../i18n";
import i18n from "../../../i18n";
import { factionDescription } from "../../../utils/factions";
import type { CharacterOut } from "../../../api/auth";
import type { FactionDetailState } from "../useFactionDetail";
import { aTask, aPraxisCard } from "../../../test/fixtures";

/** Local rather than shared: `test/fixtures.ts` ships no character builder. */
const aCharacter = (over: Partial<CharacterOut> = {}): CharacterOut => ({
  id: 7,
  username: "ada",
  display_name: "Ada Reed",
  bio: "",
  tagline: "",
  avatar_url: "",
  location: "",
  level: 4,
  score: 120,
  all_time_score: 340,
  faction_slug: "albescent",
  status: "active",
  created_at: "2026-01-01T00:00:00Z",
  badges: [],
  invitations: [],
  ...over,
});

const mocks = vi.hoisted(() => ({
  state: undefined as unknown as FactionDetailState,
}));

vi.mock("../useFactionDetail", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../useFactionDetail")>()),
  useFactionDetail: () => mocks.state,
}));

const FactionDetail = (await import("../../FactionDetail")).default;

/** The one slug with no `factionHero` row of its own. */
const FALL_THROUGH = "albescent";
const BESPOKE = ["coven", "ephemerists", "everymen", "singularity", "snide", "ua", "wow"];

function page(slug: string, members = [aCharacter({ id: 7 })]): string {
  mocks.state = {
    slug,
    loading: false,
    faction: { slug, status: "visible" },
    fetchError: null,
    members,
    tasks: [aTask({ id: 1 })],
    recentPraxis: [aPraxisCard({ id: 1 })],
    viewerFactionSlug: null,
    gameFactions: [],
    onSignup: undefined,
    signupMsg: null,
    membership: {
      state: "none",
      currentFactionSlug: null,
      join: async () => {},
      joining: false,
      joinError: null,
    },
  } as unknown as FactionDetailState;
  return renderToStaticMarkup(
    <MemoryRouter>
      <FactionDetail slug={slug} />
    </MemoryRouter>,
  );
}

/** `renderToStaticMarkup` escapes `& < > " '`; undo that so copy matches plainly. */
function decode(value: string): string {
  return value
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

describe("a faction with no bespoke hero gets the na frontispiece (#2504)", () => {
  it("draws the five slots — sigil, kicker, name, tagline, counts", () => {
    const html = decode(page(FALL_THROUGH));
    expect(html).toContain("faction-hero");
    expect(html).toContain("faction-hero-sigil");
    expect(html).toContain("faction-hero-kicker");
    expect(html).toContain("faction-hero-name");
    expect(html).toContain("faction-hero-counts");
    // Three counts, each a value and a label.
    expect((html.match(/faction-hero-count-value/g) ?? []).length).toBe(3);
    expect(html).toContain(i18n.t("feed:factionHero.stats.tasks"));
  });

  it("prints the tagline the design canvas puts under the name (#2519)", () => {
    // #2504 took `feed:factionHero.albescent.motto` because the key was already
    // sitting unused in the catalog, and flagged it as a judgement call in its
    // own PR. The board prints the faction's thesis there instead, so the value
    // was reversed — one catalog string, no code. Asserted on the LITERAL and
    // not on the key, because reading the key back is what made the wrong line
    // look right.
    expect(decode(page(FALL_THROUGH))).toContain(
      "No colours of its own. You notice it by the light.",
    );
  });

  it("dispatches the SIGIL by slug rather than hardcoding a mark", () => {
    // The labyrinth is an asset reference, so its filename is the proof that
    // `FactionSigil` resolved albescent — the hero itself knows no slugs.
    expect(page(FALL_THROUGH)).toContain("labyrinth.svg");
  });

  it("still says the faction's description exactly once (#2137)", () => {
    const blurb = factionDescription(FALL_THROUGH).split(/\n\s*\n/)[0].trim();
    const html = decode(page(FALL_THROUGH));
    expect(html.split(blurb).length - 1).toBe(1);
  });

  it("names a champion from the members the page already has", () => {
    const html = decode(
      page(FALL_THROUGH, [
        aCharacter({ id: 1, username: "runnerup", all_time_score: 10 }),
        aCharacter({ id: 2, username: "topdog", all_time_score: 99 }),
      ]),
    );
    const label = i18n.t("factions:detail.spotlightLabel");
    expect(html).toContain(label);
    // The champion is the highest all-time score, and the roll below drops them
    // rather than printing the same player twice.
    expect(html.indexOf("topdog")).toBeLessThan(html.indexOf("runnerup"));
    expect(html.split("topdog").length - 1).toBe(1);
  });

  it("wraps that hero and body in Albescent's ornament, without forking either", () => {
    const html = page(FALL_THROUGH);
    expect(html).toContain("alb-faction-hero");
    expect(html).toContain("alb-faction-body");
  });

  /* ── THE EDGE IS FOR PLATES THAT HOLD TEXT (#2519, epic #2496) ──
     The design canvas gives every plate the spectrum as a 3px travelling border
     — *"it is the Albescent tell"* — and then cuts the rule the other way for
     two of the five: *"the edge is for plates that hold text, the rule is for
     plates that hold cards with edges of their own."* Tasks and
     Recently-completed hold task and praxis cards that already wear a 3px
     spectrum border, so a ring on the plate around them is a frame enclosing
     frames (WORLD_ZERO_STYLE §5). Counted rather than checked for presence,
     because five-of-five and three-of-five both contain the class. ── */
  it("rings the three text plates and neither of the two card plates", () => {
    const html = page(FALL_THROUGH, [aCharacter({ id: 1, username: "topdog" })]);
    const count = (needle: string) => html.split(needle).length - 1;
    // About, Champion, Members, Tasks, Recently completed.
    expect(count("faction-plate-kicker")).toBe(5);
    expect(count("alb-plate-edge")).toBe(3);
  });

  it("the two card plates keep the plate's own hairline", () => {
    // What they carry INSTEAD of the edge, and it is na's own.
    //
    // THE COUNT WAS 5 AND IS NOW 2 (#2576), which is the first time it has
    // matched this test's own name. Five meant every plate drew the hairline --
    // including the three that also mount the 3px `.alb-plate-edge` ring, so
    // those three carried two structural rainbows at once. ADR-0083 3b: one
    // carrier per object, and the thinner one yields. Two is the two card
    // plates, which mount no ring and therefore keep it.
    const html = page(FALL_THROUGH, [aCharacter({ id: 1, username: "topdog" })]);
    expect(html.split("faction-plate-rule").length - 1).toBe(2);
  });
});

describe("the seven bespoke heroes are untouched by the new fallback (#2504)", () => {
  for (const slug of BESPOKE) {
    it(`${slug} still draws its own frontispiece`, () => {
      expect(page(slug)).not.toContain("faction-hero-sigil");
    });
  }
});

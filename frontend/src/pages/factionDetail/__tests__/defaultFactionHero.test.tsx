/**
 * The hero fall-through, tested at the PAGE because the seam is the dispatch
 * (#2504): a component test would pass with nothing mounting it.
 *   1. the fall-through slug draws the na hero with all five slots;
 *   2. the sigil is dispatched by slug, not hardcoded;
 *   3. the seven bespoke heroes are untouched;
 *   4. the description still appears exactly once (#2137).
 * `useFactionDetail` is mocked: effects never run under `renderToStaticMarkup`.
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

/** `test/fixtures.ts` has no character builder. */
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
    expect((html.match(/faction-hero-count-value/g) ?? []).length).toBe(3);
    expect(html).toContain(i18n.t("feed:factionHero.stats.tasks"));
  });

  it("prints the tagline the design canvas puts under the name (#2519)", () => {
    // From the `factionSelect` tagline. Asserted on the LITERAL, not the key:
    // reading the key back is what made the wrong line look right.
    expect(decode(page(FALL_THROUGH))).toContain(
      "You don't stop playing when you get old, you get old when you stop playing",
    );
  });

  it("dispatches the SIGIL by slug rather than hardcoding a mark", () => {
    // The filename proves `FactionSigil` resolved albescent.
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
    // Highest all-time score; the roll below drops them.
    expect(html.indexOf("topdog")).toBeLessThan(html.indexOf("runnerup"));
    expect(html.split("topdog").length - 1).toBe(1);
  });

  it("wraps that hero and body in Albescent's ornament, without forking either", () => {
    const html = page(FALL_THROUGH);
    expect(html).toContain("alb-faction-hero");
    expect(html).toContain("alb-faction-body");
  });

  /* The edge is for plates holding text (#2519); card plates' cards already
     wear one (frames in frames, WORLD_ZERO_STYLE §5). Counted, not presence. */
  it("rings the three text plates and neither of the two card plates", () => {
    const html = page(FALL_THROUGH, [aCharacter({ id: 1, username: "topdog" })]);
    const count = (needle: string) => html.split(needle).length - 1;
    // About, Champion, Members, Tasks, Recently completed.
    expect(count("faction-plate-kicker")).toBe(5);
    expect(count("alb-plate-edge")).toBe(3);
  });

  it("the two card plates keep the plate's own hairline", () => {
    // One rainbow carrier per object (ADR-0083 3b, #2576): ringed plates drop it.
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

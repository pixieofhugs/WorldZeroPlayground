/**
 * Unaffiliated praxis detail (#1088, ADR-0061). Shared slots:
 * `archetypeSlots.test.tsx`. `useFormFactor` is mocked.
 */
import { describe, it, expect, vi } from "vitest";
import i18n from "../../../i18n";
import type { PraxisDetailState } from "../usePraxisDetail";
import type { CommentOut } from "../../../api/comments";
import { aPraxis } from "../../../test/fixtures";
import { CO_MEMBER, MEMBER, VOTERS, aPraxisDetailState, indexOf, skinRenderer } from "../../../test/praxisDetail";

const mocks = vi.hoisted(() => ({ formFactor: "desktop" as "desktop" | "mobile" }));
vi.mock("../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));

const PRAXIS = aPraxis({
  task_title: "A Chore Nobody Logged",
  created_by_id: 3,
  created_by_display_name: "Ada",
  members: [MEMBER],
});


/** One row the page fetched alongside the praxis (#1281). */
const COMMENT: CommentOut = {
  id: 7,
  praxis_id: 1,
  task_id: null,
  body_text: "seedlings along the estuary",
  is_edited: false,
  created_at: "2026-01-04T00:00:00Z",
  updated_at: "2026-01-04T00:00:00Z",
  author: {
    id: 42,
    username: "ada",
    display_name: "Adabel",
    avatar_url: "",
    faction_slug: "na",
  },
  mentions: [],
};

const state = (overrides: Partial<PraxisDetailState> = {}): PraxisDetailState =>
  aPraxisDetailState({ praxis: PRAXIS, voters: VOTERS, ...overrides });

const render = skinRenderer("na", mocks);

describe("Unaffiliated praxis detail — layout contract", () => {

  it("moves the score block above the proof on mobile and into the aside on desktop", () => {
    const wide = render(state());
    expect(wide.text.match(/Score/g)?.length, "one score block on desktop").toBe(1);
    expect(indexOf(wide.html, "Proof"), "proof precedes the aside rail").toBeLessThan(
      indexOf(wide.html, "Score"),
    );

    const phone = render(state(), "mobile");
    expect(phone.text.match(/Score/g)?.length, "one score block on mobile").toBe(1);
    expect(indexOf(phone.html, "Score"), "rail rides above the proof on mobile").toBeLessThan(
      indexOf(phone.html, "Proof"),
    );
  });

  // The eight-design contract (#1117–#1123): where this design differs from the
  // other eight, the eight win, so every skin inherits these.

  it("mounts the comments region with the layout's heading, not the thread's", () => {
    const { text } = render(state());
    expect(text, "the layout's section head").toContain("Discussion");
    expect(text, "and not a second heading for the same list").not.toContain("0 comments");
  });

  it("feeds the thread the rows the PAGE fetched, not a second round trip", () => {
    // #1281: `usePraxisDetail` seeds the thread. No effects run here, so a row
    // in the markup can only have come from the page's fetch.
    const { text } = render(state({ comments: [COMMENT] }));
    expect(text, "the page's rows").toContain(COMMENT.body_text);
    expect(text, "nothing left to wait for").not.toContain("Loading…");
  });
});

describe("Unaffiliated praxis detail — the state axes", () => {
  it("renders the score readout from the shared resolver", () => {
    const { text } = render(state());
    expect(text, "base").toContain("12");
    expect(text, "points from votes").toContain("4");
    expect(text, "total").toContain("16");
  });

  // #2634: the multiplier is a chip on the base line, always followed by its subtotal.
  it("shows the multiplier chip only when the factor is not 1.0", () => {
    const neutral = render(state()).text;
    expect(neutral, "neutral era hides it").not.toContain("×");
    expect(neutral, "and hides its result with it").not.toContain("subtotal");
    const boosted = state({
      praxis: { ...PRAXIS, display_multiplier: 1.1, score: 17.2 },
    });
    const { text } = render(boosted);
    expect(text).toContain("×1.10");
    expect(text).toContain("subtotal");
    expect(text, "12 × 1.1, through formatPoints").toContain("13.2");
  });

  it("names the metatask contribution only when one is applied", () => {
    expect(render(state()).text).not.toContain("meta");
    const sealed = state({
      praxis: { ...PRAXIS, metatask_points: 5, score: 21 },
    });
    expect(render(sealed).text).toContain("meta");
  });

  it("draws the votes tally only when there are votes (ADR-0076)", () => {
    const unvoted = state({
      praxis: { ...PRAXIS, points_from_votes: 0, score: 12 },
    });
    const { text } = render(unvoted);
    expect(text).not.toContain("from votes");
    expect(text, "the total still stands alone").toContain("12");
  });

  // #1444: the section goes with the stamp, or a headed empty "Score" remains.
  it("drops the score section on a failed praxis and keeps it on a scored one", () => {
    const failed = state({
      praxis: { ...PRAXIS, moderation_status: "failed", admin_note: "Not the task." },
    });
    const { text } = render(failed);
    expect(text, "no headed empty panel").not.toContain("Score");
    expect(text, "no total nobody banked").not.toContain("16");
    // #1373: the banner stays.
    expect(text).toContain("Not the task.");

    expect(render(state()).text, "a visible praxis still stamps").toContain("16");
  });

  it("banners flagged, failed-with-note, and the crown", () => {
    expect(render(state()).text, "clean praxis has no banner").not.toContain("FLAGGED");

    const flagged = state({ praxis: { ...PRAXIS, moderation_status: "flagged" } });
    expect(render(flagged).text).toContain("FLAGGED");

    const failed = state({
      praxis: {
        ...PRAXIS,
        moderation_status: "failed",
        admin_note: "The photo is of a different ridge.",
      },
    });
    expect(render(failed).text, "the admin note is the banner's body").toContain(
      "The photo is of a different ridge.",
    );

    // The crown is the score stamp's corner fleur (#1710), not a banner.
    const crown = `title="${i18n.t("feed:taskCrown.title")}"`;
    const crowned = state({ praxis: { ...PRAXIS, is_top_for_task: true } });
    expect(render(crowned).html).toContain(crown);
    expect(render(state()).html).not.toContain(crown);
  });

  it("credits every co-author and shows the members section on a published collab", () => {
    const solo = render(state());
    expect(solo.html, "solo links one author").toContain('href="/characters/3"');
    expect(solo.text, "and draws no members section").not.toContain("Members");

    const collab = state({
      praxis: { ...PRAXIS, type: "collab", members: [MEMBER, CO_MEMBER] },
    });
    const { html, text } = render(collab);
    expect(html, "each co-author is reachable").toContain('href="/characters/4"');
    expect(text).toContain("Beth");
    expect(text, "the crew reads as Members, the domain noun").toContain("Members");
  });

  it("shows the steward bar only in admin mode", () => {
    expect(render(state()).text).not.toContain("ADMIN");
    const steward = state({ showAdminBar: true });
    expect(render(steward).text).toContain("ADMIN");
  });
});

// Who-voted rungs (#1143). A per-dot gradient (#842) passes a dot count, so
// assert the relationship: one row-wide `background-size`, each dot windowed
// by `background-position-x`.

function votersPanel(html: string): string {
  const start = html.indexOf("Who voted");
  expect(start, "the panel renders").toBeGreaterThan(-1);
  // The flag card follows in the rail; the panel nests no <section>, so the
  // first close is its own.
  const end = html.indexOf("</section>", start);
  expect(end, "the panel closes").toBeGreaterThan(-1);
  return html.slice(start, end);
}

/** Each voter row's five dot `style` payloads, in row order. */
function voterRows(html: string): string[][] {
  return votersPanel(html)
    .split(/href="\/characters\//)
    .slice(1)
    .map((row) => [...row.matchAll(/style="([^"]*background-size[^"]*)"/g)].map((hit) => hit[1]));
}

function styleValue(style: string, property: string): number {
  const hit = new RegExp(`(?:^|;)${property}:([^;]*)`).exec(style);
  expect(hit, `${property} missing from ${style}`).not.toBeNull();
  return Number.parseFloat(hit![1]);
}

describe("Unaffiliated praxis detail — the Who-voted rung", () => {
  it("windows ONE rainbow across the row rather than painting each dot (#842)", () => {
    for (const dots of voterRows(render(state()).html)) {
      expect(dots.length, "five rungs, reached or not").toBe(5);

      const spans = dots.map((dot) => /background-size:([^;"]*)/.exec(dot)![1]);
      expect(new Set(spans).size, "one gradient means one size on every dot").toBe(1);

      const rowSpan = Number.parseFloat(spans[0]);
      const dotWidth = styleValue(dots[0], "width");
      expect(rowSpan, "the gradient is stretched over the ROW, not the dot").toBeGreaterThan(
        dotWidth,
      );

      const offsets = dots.map((dot) => styleValue(dot, "background-position-x"));
      const pitch = -offsets[1];
      expect(pitch, "dots are spaced apart").toBeGreaterThan(0);
      expect(offsets, "each dot shows the slice that falls where it sits").toEqual([
        0,
        -pitch,
        -pitch * 2,
        -pitch * 3,
        -pitch * 4,
      ]);
      expect(
        pitch * 4 + dotWidth,
        "and the rainbow ends exactly on the last dot's right edge",
      ).toBe(rowSpan);
    }
  });

  it("fills to the voter's own value and leaves the rest as hollow rings", () => {
    const rows = voterRows(render(state()).html);
    const reached = rows.map(
      (dots) => dots.filter((dot) => dot.includes("var(--faction-default-rainbow)")).length,
    );
    expect(reached, "Cy voted 5, Dov voted 3").toEqual([5, 3]);

    const hollow = rows[1][4];
    expect(hollow, "the unreached dot is the shared ring token").toContain(
      "var(--faction-default-dot-ring)",
    );
    expect(hollow, "and carries no rainbow").toContain("background-image:none");
    expect(hollow, "the caster's glow is an input affordance, not a readout").not.toContain(
      "spectrum-glow",
    );
  });

  it("drops the numeral but keeps the value in the accessible name", () => {
    const html = render(state()).html;
    expect(html, "the dot row names the value it draws").toContain('aria-label="3 of 5"');
    expect(html, "for every voter").toContain('aria-label="5 of 5"');

    const text = votersPanel(html).replace(/<[^>]*>/g, "");
    const rowsOnly = text.slice(text.indexOf("Cy"));
    expect(rowsOnly.replace(/\s+/g, ""), "names only — the dots are the reading").toBe("CyDov");
  });
});

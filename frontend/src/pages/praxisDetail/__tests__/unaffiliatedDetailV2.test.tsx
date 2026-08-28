/**
 * Praxis detail v2 — the Unaffiliated page's own contract (#1088, ADR-0061).
 *
 * `archetypeSlots.test.tsx` guards the slots EVERY praxis-detail archetype must
 * emit. This file guards what is specific to the rebuilt Unaffiliated page: the
 * layout contract (breadcrumb / grid / comments region), the responsive move of
 * the score block, and that each state axis the issue lists actually renders.
 *
 * Harness note: `renderToStaticMarkup`, no DOM, no effects (see
 * SPEC-testing.md). `useFormFactor` is therefore MOCKED rather than driven off
 * `matchMedia` — the mobile assertions are about the form factor reaching the
 * page, not about a real viewport. Light vs dark is a pure `[data-theme]` CSS
 * cascade with no branch in this component, so there is nothing here to assert
 * about it; it is an eyeball check.
 */
import { describe, it, expect, vi } from "vitest";
import i18n from "../../../i18n";
import type { PraxisDetailState } from "../usePraxisDetail";
import type { CommentOut } from "../../../api/comments";
import { PraxisFlagBlock } from "../shared";
import { aCharacter, aCurrentUser, aPraxis } from "../../../test/fixtures";
import { CO_MEMBER, MEMBER, VOTERS, aPraxisDetailState, indexOf, markup, skinRenderer } from "../../../test/praxisDetail";

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

const VIEWER = aCurrentUser({ character: aCharacter({ level: 4 }) });

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
  it("draws no navigation of its own, at either width (#2102)", () => {
    // It drew a bespoke trail on desktop and swapped it for a back link to
    // /praxis on mobile. Both are gone: the breadcrumb is neutral site chrome
    // now, drawn once above this column by `components/nav/Breadcrumb`, and what
    // the trail CONTAINS is pinned in `pages/__tests__/breadcrumbAcrossSurfaces`
    // for every skin at both widths. What is left to say here is the negative.
    for (const factor of ["desktop", "mobile"] as const) {
      const { html } = render(state(), factor);
      const sheet = html.slice(html.indexOf("</nav>") + 1);
      expect(sheet, `${factor}: no crumb inside the surface`).not.toContain('href="/tasks"');
      expect(html, `${factor}: no phone back bar`).not.toContain('href="/praxis"');
    }
  });

  it("moves the score block above the proof on mobile and into the aside on desktop", () => {
    // The score heading and the proof heading are the two anchors; only their
    // ORDER changes, and each renders exactly once at both form factors.
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

  it("carries its ground on the column, never the viewport", () => {
    // WORLD_ZERO_STYLE §5 / #1028: the site background must still show around
    // the page. `.na-backdrop` is `position: fixed; inset: 0`.
    expect(render(state()).html).not.toContain("na-backdrop");
  });

  // ─── The eight-design contract (#1117–#1123) ──────────────────────────────
  //
  // This page is the foundation the seven faction skins dress, so where the
  // Unaffiliated design differs from the other eight, the eight win. These are
  // the three facts that differed; guarded here so each skin inherits them
  // instead of working around them seven times.

  it("gives the desktop aside a 330px track, not the Unaffiliated design's 340", () => {
    const wide = render(state());
    expect(wide.html, "the eight designs' aside track").toContain("0 0 330px");
    expect(wide.html, "the outlier width is gone").not.toContain("340px");

    // Mobile drops the TRACK, not its contents — the rail stacks into flow.
    expect(render(state(), "mobile").html, "no fixed track on mobile").not.toContain(
      "0 0 330px",
    );
  });

  it("shows the crown at BOTH form factors on a crowned praxis", () => {
    // Never form-factor gated, keyed only on `is_top_for_task`. One design
    // (Everymen) draws `showCrownMobile: false`; that is the outlier.
    // The mark is the score stamp's corner fleur now — #1710 retired the
    // hero banner. The score block is in both layouts, so it is still never
    // form-factor gated, and it is still the one canonical `TaskCrown`.
    const crown = `title="${i18n.t("feed:taskCrown.title")}"`;
    const crowned = state({ praxis: { ...PRAXIS, is_top_for_task: true } });
    expect(render(crowned, "desktop").html, "crown on desktop").toContain(crown);
    expect(render(crowned, "mobile").html, "crown on mobile too").toContain(crown);
    expect(render(state(), "mobile").html, "and only when crowned").not.toContain(
      crown,
    );
  });

  it("leaves the report card outside the costume", () => {
    // ADR-0061: moderation and system chrome stay
    // neutral in every faction's dress. The card must not pick up the page's
    // faction tokens — including by INHERITING the sheet's text colour, which
    // is why every text node inside it carries its own neutral token.
    const { html } = markup(<PraxisFlagBlock state={state()} />);
    expect(html, "renders at all").toContain("Flag this praxis");
    expect(html, "neutral card chrome").toContain("sidebar-card");
    expect(html, "no faction dress anywhere inside").not.toContain("--faction-");
  });

  it("mounts the comments region with the layout's heading, not the thread's", () => {
    const { text } = render(state());
    expect(text, "the layout's section head").toContain("Discussion");
    expect(text, "and not a second heading for the same list").not.toContain("0 comments");
  });

  it("hides the comment region on a praxis that is not visible", () => {
    const hidden = state({ praxis: { ...PRAXIS, moderation_status: "hidden" } });
    expect(render(hidden).text).not.toContain("Discussion");
  });

  it("feeds the thread the rows the PAGE fetched, not a second round trip", () => {
    // #1281: the thread sits behind the visibility gate above, so its own
    // effect could not run until the praxis had landed and the region mounted
    // — comments were always one wave late. `usePraxisDetail` now fetches them
    // in the same `Promise.all` as the praxis and seeds the thread. This
    // harness runs no effects, so a row in the markup can ONLY have come from
    // the page's fetch.
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

  // #1091: the rows come from the mounted `ScoreStamp` now, so they speak the
  // shared `card.stamp.*` vocabulary the praxis cards already use. The page's
  // own duplicate strip is gone — one readout, one set of words.
  // #2634 turned the multiplier ROW into a CHIP on the base line, on all nine
  // stamps, so there is no `mult` word to look for any more — the ratio is the
  // whole of it. Its result arrives with it: a chip is always followed by the
  // subtotal it produced, under the sheet's rule.
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

  // ADR-0076 reversed the 2026-07-20 call that kept `+ 0 from votes` here. On
  // this page the rail is the mounted `ScoreStamp`, so the ruling arrives
  // through the same resolver as everywhere else: no votes, no votes row, and a
  // base-only praxis reads as its total.
  it("draws the votes tally only when there are votes (ADR-0076)", () => {
    const unvoted = state({
      praxis: { ...PRAXIS, points_from_votes: 0, score: 12 },
    });
    const { text } = render(unvoted);
    expect(text).not.toContain("from votes");
    expect(text, "the total still stands alone").toContain("12");
  });

  /**
   * #1444 — the whole score SECTION leaves a praxis that banked nothing, not
   * just the mark inside it.
   *
   * The stamp is gated in its dispatcher, which every surface mounts; the panel
   * has to go with it or the page keeps a headed "Score" section with nothing
   * under it. Both halves are asserted: a gate that hid the section ALWAYS would
   * satisfy the first case on its own.
   */
  it("drops the score section on a failed praxis and keeps it on a scored one", () => {
    const failed = state({
      praxis: { ...PRAXIS, moderation_status: "failed", admin_note: "Not the task." },
    });
    const { text } = render(failed);
    expect(text, "no headed empty panel").not.toContain("Score");
    expect(text, "no total nobody banked").not.toContain("16");
    // The banner is the honest signal and it stays (the #1373 ruling).
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

    // The crown axis is the score stamp's corner fleur now (#1710); this page
    // no longer carries a banner for it, so only the mark is asserted.
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

  it("shows owner controls to a member and nothing to a visitor", () => {
    // #1397: the cluster is anchored on the UNSUBMIT control now. On a
    // submitted solo `/edit` redirects straight back to this page, so the edit
    // link is hidden and unsubmitting is the way into the composer.
    expect(render(state()).text, "a visitor gets no owner controls").not.toContain(
      "unsubmit",
    );
    const owner = state({ isOwner: true, user: VIEWER });
    expect(render(owner).text).toContain("unsubmit");
    expect(render(owner).html, "and nothing that round-trips").not.toContain(
      'href="/praxis/1/edit"',
    );
  });

  it("shows the steward bar only in admin mode", () => {
    expect(render(state()).text).not.toContain("ADMIN");
    const steward = state({ showAdminBar: true });
    expect(render(steward).text).toContain("ADMIN");
  });

  it("lists who voted and each voter's own rung, never an average", () => {
    const { html, text } = render(state());
    expect(text).toContain("Who voted");
    expect(html).toContain('href="/characters/11"');
    expect(text, "the count, not the mean").toContain("2 votes");

    const unvoted = state({ voters: [] });
    expect(render(unvoted).text, "no empty voter panel").not.toContain("Who voted");
  });
});

// ─── The Who-voted rungs (#1143) ────────────────────────────────────────────
//
// Seam: the markup `DefaultPraxisDetail` emits for the Who-voted panel. The
// rung is five dots now, and the assertions below are aimed squarely at the
// mistake #842 already caught once in the interactive caster: a PER-DOT
// gradient looks right in a screenshot and is wrong. Counting five dots would
// pass against it, so what is asserted is the RELATIONSHIP — one shared
// `background-size` spanning the whole row, and a `background-position-x` that
// windows each dot to where it actually sits.

/** The Who-voted panel, sliced out of the page it shares with the flag card. */
function votersPanel(html: string): string {
  const start = html.indexOf("Who voted");
  expect(start, "the panel renders").toBeGreaterThan(-1);
  // Stop at the panel's own closing tag: the neutral flag card follows it in
  // the rail (ADR-0061) and its "FLAG" pip is text that would leak in. The
  // panel nests no <section> of its own, so the first close is the right one.
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

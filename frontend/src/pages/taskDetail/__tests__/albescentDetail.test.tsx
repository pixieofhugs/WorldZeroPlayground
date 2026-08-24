/**
 * Albescent task detail — the light, not the layout (#1038).
 *
 * `archetypeSlots` already guards the content slots and `detailContract` guards
 * the comments gate across every registered skin, and this wrapper inherits both
 * for free by rendering `DefaultTaskDetail` whole. What those two cannot see is
 * the only thing that makes this surface Albescent's, and the two ways a
 * "faithful to the design" edit would break it:
 *
 *  1. **It stays a WRAPPER.** It must render Default's anatomy — the same
 *     neutral `detail.*` copy an unaffiliated player reads — PLUS the light
 *     layers. The day someone forks it into a ninth skin, Default's structure
 *     and the wrapper's drift apart silently; this pins that they have not.
 *  2. **The design's voice never comes back.** The vendored design is the most
 *     heavily voiced file in the set. ADR-0057 makes the copy shared, and
 *     ADR-0027 is the sharper reason: a page announcing itself as Albescent
 *     un-hides a society whose whole premise is being indistinguishable from an
 *     unaffiliated player. Nothing but this test stops one of those words
 *     drifting back in as "flavour".
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
// Initialize the i18n catalog so copy keys resolve to English text.
import "../../../i18n";
import AlbescentTaskDetail from "../archetypes/AlbescentTaskDetail";
import DefaultTaskDetail from "../archetypes/DefaultTaskDetail";
import type { TaskDetailState } from "../useTaskDetail";
import { aPraxisCard, aTask } from '../../../test/fixtures'
import { REDACTED, setAlbescentRevealed } from "../../../utils/factions";

const TITLE = "Sit with something until it turns pale";
const BRIEF =
  "Choose one small thing and attend it without fixing it, and change nothing.";

/**
 * Every voiced string the design draws, verbatim. ADR-0057 + ADR-0027 cut all of
 * them; see the file header for why re-adding any one is a reveal, not flavour.
 */
const CUT_VOCABULARY = [
  "Correspondence",
  "in confidence",
  "In hand",
  "The Ask",
  "in the hand of the keeper",
  "accounts inscribed",
  "most witnessed",
  "Acknowledge",
  "withdraw",
  "Said quietly",
  "Set something down",
  "unfiled",
  "returned",
  "standing met",
];

const TASK = aTask({
  id: 207,
  title: TITLE,
  description: BRIEF,
  created_by: 31,
  primary_faction_slug: "albescent",
  in_progress_count: 6,
  created_by_display_name: "Wren Abalone",
  created_by_faction_slug: "albescent",
  created_by_level: 4,
});

function baseState(overrides: Partial<TaskDetailState> = {}): TaskDetailState {
  return {
    loading: false,
    task: TASK,
    fetchError: null,
    submissions: [],
    comments: null,
    friends: new Set(),
    foes: new Set(),
    mySubmission: undefined,
    isInProgress: false,
    inProgressPraxisId: null,
    canSignUp: true,
    levelJumpSignup: false,
    slotsOpen: 2,
    maxTaskSlots: 3,
    basePoints: 18,
    factionMultiplier: 1.0,
    modifiedPoints: 18,
    inProgressCount: 6,
    topScore: 0,
    voteCount: 0,
    submissionSort: "score",
    setSubmissionSort: () => {},
    sortedSubmissions: [],
    signupError: null,
    handleSignup: async () => {},
    handleDrop: async () => {},
    dropConfirm: null,
    ...overrides,
  };
}

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
  return { html, text: html.replace(/<[^>]*>/g, "") };
}

describe("Albescent task detail — Default plus the light", () => {
  it("renders Default's whole anatomy, not a skin of its own", () => {
    const { text } = render(<AlbescentTaskDetail state={baseState()} />);
    // The shared neutral copy, word for word as na reads it (ADR-0057).
    for (const shared of [
      "Task Description",
      "Discussion",
      "Sign up",
      "Level",
      "people working on this",
      // `base` is NOT in this list any more: #1704 drops the base row at the
      // identity multiplier, on this skin's own worth slot as on Default's, so
      // at ×1.00 the ring's total is the only worth text. The row's inheritance
      // is asserted below, where a real factor makes it say something.
      "POINTS",
    ]) {
      expect(text, `inherited slot: ${shared}`).toContain(shared);
    }
    expect(text).toContain(TITLE);
    expect(text).toContain(BRIEF);
    // The faction line resolves through `factionName()`, like every skin — and
    // since #2409 that means it reads `[REDACTED]` to a viewer who was never
    // invited, where #1891 had it read "Unaffiliated". This assertion is the
    // ordinary-surface half of that inversion: the society is no longer
    // disguised as the unaffiliated state, it is visibly withheld.
    //
    // The skin itself is UNCHANGED, which is #1891 ruling 1 and is why every
    // other assertion above still holds — the look stays, only the word goes.
    // `not.toContain(factionName("na"))` deliberately is NOT asserted: "na"
    // resolves to "Unaffiliated", a word this page can legitimately carry for
    // other reasons. The revealed half is asserted below.
    expect(text).toContain(REDACTED);
    expect(text).not.toContain("Albescent");
  });

  it("names the order once the viewer has been revealed to it (#1891)", () => {
    // The mask is a module-level flag, so it outlives the case that sets it —
    // reset unconditionally or a later test passes for the wrong reason.
    setAlbescentRevealed(true);
    try {
      const { text } = render(<AlbescentTaskDetail state={baseState()} />);
      expect(text).toContain("Albescent");
    } finally {
      setAlbescentRevealed(false);
    }
  });

  it("inherits the base row once a factor makes it worth saying", () => {
    const { text } = render(
      <AlbescentTaskDetail
        state={baseState({ factionMultiplier: 1.25, modifiedPoints: 23 })}
      />,
    );
    expect(text).toContain("base");
    expect(text).toContain("×1.25");
  });

  it("adds the light layers and nothing else structural", () => {
    const { html } = render(<AlbescentTaskDetail state={baseState()} />);
    for (const layer of [
      "alb-detail",
      // #2499: the ground, as a class on the wrapper rather than a span. The
      // aurora it replaced is asserted gone below.
      "alb-prism",
      "alb-detail-foil",
      "alb-detail-edge",
      "alb-detail-ring",
    ]) {
      expect(html, `light layer: ${layer}`).toContain(layer);
    }
    expect(html, "no overlay wash beside the ground").not.toContain("alb-detail-aurora");
    // Ornament only — it must never sit in the tab order or eat a click.
    expect(html).toContain("aria-hidden");
  });

  it("strips to Default: the wrapper adds no copy of its own", () => {
    const words = (markup: string) =>
      new Set(markup.match(/[A-Za-z]{3,}/g) ?? []);
    const wrapped = words(render(<AlbescentTaskDetail state={baseState()} />).text);
    const plain = words(render(<DefaultTaskDetail state={baseState()} />).text);
    // The prism ring is an ARRANGEMENT of the same numbers, so the vocabulary is
    // identical in BOTH directions: Albescent drops none of Default's words, and
    // introduces none of its own. That equality is what makes this a wrapper.
    expect([...plain].filter((word) => !wrapped.has(word))).toEqual([]);
    expect([...wrapped].filter((word) => !plain.has(word))).toEqual([]);
  });

  it("speaks none of the design's cut vocabulary", () => {
    const { text } = render(
      <AlbescentTaskDetail
        state={baseState({ isInProgress: true, inProgressPraxisId: 99 })} />,
    );
    for (const cut of CUT_VOCABULARY) {
      expect(text.toLowerCase(), `cut word resurfaced: ${cut}`).not.toContain(
        cut.toLowerCase(),
      );
    }
  });

  it("shows the worth ring's total and hides the badge at the identity factor", () => {
    const { text } = render(<AlbescentTaskDetail state={baseState()} />);
    expect(text).toContain("18");
    expect(text).toContain("POINTS");
    expect(text).not.toContain("×");

    const lifted = render(
      <AlbescentTaskDetail
        state={baseState({ factionMultiplier: 1.25, modifiedPoints: 23 })} />,
    ).text;
    // The raw factor, never reconstructed from modified/base (ADR-0055).
    expect(lifted).toContain("×1.25");
    expect(lifted).toContain("23");
  });

  it("renders the in-progress population as a header count", () => {
    const { text } = render(<AlbescentTaskDetail state={baseState()} />);
    expect(text).toContain("people working on this");
    expect(text).toContain("6");
  });
});

/**
 * The drift stops at user media, here too (#1646 ruling, #1942 scope).
 *
 * THE SEAM: the class hooks this page emits, paired with the stylesheet contract
 * asserted in `components/praxisCard/__tests__/albescentDriftStopsAtMedia`. Drop
 * either and the other is decorative — a class nobody reads, or a rule nothing
 * matches.
 *
 * WHAT NO TEST HERE CAN PROVE. `renderToStaticMarkup` has no DOM, no layout and
 * no computed styles, so nothing below shows a photograph coming out untinted.
 * The overlap is visual QA, and it is outstanding on the PR.
 *
 * The scope ruling (owner, 2026-08-20) is the gallery AS WELL AS the byline: a
 * photograph in the submissions row is as much the player's as the one beside
 * the title. Those thumbnails already carried `.user-media` from #1941 and were
 * washed twice all the same — once by their own card's `.alb-rainbow`, which they
 * escaped, and again by `.alb-detail-aurora`, which they could not, because the
 * 1200 column's `z-index: 1` capped them.
 *
 * #2499 MADE THE DOUBLE WASH STRUCTURALLY IMPOSSIBLE, and that is worth stating
 * because it is the strongest thing the move off an overlay bought. Both washes
 * are now the same TOKEN — `.alb-prism` sets `--faction-default-card-sheet` on
 * the page wrapper and again on each card inside it — and a custom property is
 * resolved once per element. Two declarations of one value paint one ground.
 * What is still an overlay on this page is the prism WHEEL at `z-index: 2`, so
 * the lift and the trap-clearing below both stand; they are simply defending
 * against one layer rather than two.
 */
describe("the drift stops at user media on this page too (#1942)", () => {
  const PHOTO = {
    id: 91,
    praxis_id: 55,
    type: "image" as const,
    file_path: "proofs/estuary.png",
    display_order: 0,
    created_at: "2026-01-01T00:00:00Z",
  };

  it("clears the stacking trap by naming the sheet", () => {
    // The one hook the CSS fix needs. Without it `.alb-detail .task-detail-sheet`
    // matches nothing and the lift stays inert however large its number.
    const { html } = render(<AlbescentTaskDetail state={baseState()} />);
    expect(html, "the 1200 column's class").toContain('class="task-detail-sheet"');
    const sheet = html.slice(html.indexOf('class="task-detail-sheet"'));
    // And the number is gone from that tag's inline style, which is the whole
    // reason a selector can reach it — an inline `z-index` cannot be overridden.
    expect(
      sheet.slice(0, sheet.indexOf(">")),
      "no inline z-index left on the sheet",
    ).not.toContain("z-index");
  });

  it("hooks the byline photograph", () => {
    const { html } = render(
      <AlbescentTaskDetail
        state={baseState({
          task: aTask({ ...TASK, created_by_avatar_url: "avatars/wren.png" }),
        })}
      />,
    );
    expect(html, "the author's own photo").toContain("user-media");
  });

  it("leaves the initials fallback in the wash — it is the site's furniture", () => {
    // #1646's distinction, and the whole of the ruling: a generated monogram is
    // not a photograph. `TASK` carries no avatar url, so this is the fallback.
    const { html } = render(<AlbescentTaskDetail state={baseState()} />);
    expect(html).not.toContain("user-media");
  });

  it("carries the gallery's thumbnails out with it", () => {
    // Owner's scope ruling. The hook is #1941's, already on `PraxisMediaGallery`
    // — no duplicate was added — so what this pins is that the gallery reaches
    // this page WITH it, on the Albescent card the dispatcher picks for an
    // Albescent task.
    const { html } = render(
      <AlbescentTaskDetail
        state={baseState({
          sortedSubmissions: [
            aPraxisCard({
              id: 55,
              task_faction_slug: "albescent",
              media_items: [PHOTO],
            }),
          ],
        })}
      />,
    );
    expect(html, "the Albescent card the gallery dispatches to").toContain(
      "alb-praxis-card",
    );
    expect(html, "its thumbnails' hook").toContain("user-media");
    // Both scopes are present on one page — the card's ground and the page's —
    // and since #2499 they are the same declaration, so the wash cannot stack.
    expect(html.match(/alb-prism/g) ?? [], "the page and the card").toHaveLength(2);
    // The wheel is what the lift still has to clear, and it is still here.
    expect(html).toContain("alb-detail-foil");
  });
});

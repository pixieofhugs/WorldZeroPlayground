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
import i18n from "../../../i18n";
import AlbescentTaskDetail from "../archetypes/AlbescentTaskDetail";
import DefaultTaskDetail from "../archetypes/DefaultTaskDetail";
import type { TaskDetailState } from "../useTaskDetail";
import { aPraxisCard, aTask } from '../../../test/fixtures'
import { factionName, setAlbescentRevealed } from "../../../utils/factions";

/**
 * The worth panel's unit word, read from the catalog rather than typed.
 *
 * It used to be the literal "POINTS". #2598 moved the shout out of the catalog
 * value and into CSS — the catalog holds "Point"/"Points" and each of the nine
 * skins uppercases the element that draws it — so a STATIC render now reads the
 * catalog's case, while a browser still paints caps. Same move, and the same
 * reason, as `everymenBillOrnament.test.tsx`'s struck seal.
 *
 * 18 is `modifiedPoints` in every state below, so this is the plural.
 */
const POINTS_UNIT = i18n.t("tasks:detail.points.total", { count: 18 });


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
      POINTS_UNIT,
    ]) {
      expect(text, `inherited slot: ${shared}`).toContain(shared);
    }
    expect(text).toContain(TITLE);
    expect(text).toContain(BRIEF);
    // The faction line resolves through `factionName()`, like every skin — and
    // since #1891 that means it reads "Unaffiliated" to a viewer who was never
    // invited. The skin itself is UNCHANGED: the look stays, only the word goes,
    // which is why every other assertion above still holds. The revealed half
    // of this is asserted below.
    expect(text).toContain(factionName("na"));
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
    expect(text).toContain("Base");
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
    // CASE-INSENSITIVE since #2554. Default's worth cell is
    // `DefaultScoreStamp`, which letters `praxis:card.stamp.points`
    // lower-case; Albescent's ring still prints `tasks:detail.points.total`
    // through the `worthSlot` seam, which is sentence case. Both catalogs
    // say the same word, and a wrapper that added a word of its OWN would
    // still be caught — case is the one difference this comparison may not
    // treat as vocabulary.
    const words = (markup: string) =>
      new Set((markup.match(/[A-Za-z]{3,}/g) ?? []).map((w) => w.toLowerCase()));
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
    expect(text).toContain(POINTS_UNIT);
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

describe("Albescent task detail — the overlay traces the sheet (#2549)", () => {
  /**
   * The two light layers used to be siblings of `DefaultTaskDetail`, positioned
   * off `.alb-detail` and inset by `--space-2xl` top and bottom on the stated
   * assumption that the inset "lands exactly on `DefaultTaskDetail`'s sheet,
   * whose own `py-8` band that is". #2102 broke that by inserting the shared
   * `Breadcrumb` INSIDE the band, above the sheet: the bottoms still agreed
   * exactly, but the top floated free by the breadcrumb's own box, so the ring's
   * rounded corner landed across the trail.
   *
   * The fix is structural rather than arithmetic — the layers are now the
   * sheet's own first children, so `inset` is measured from the very box they
   * are supposed to trace and cannot drift again when something else is added
   * to that band. A guard on the pixel count would have passed just as happily
   * with a magic offset.
   *
   * Read as ORDER, which is what makes it a containment claim: the layers must
   * now precede the sheet's content. As siblings mounted after the whole column
   * they came after all of it, so this assertion is the one that separates the
   * two arrangements.
   */
  it("mounts both light layers as the sheet's first children, before its content", () => {
    const { html } = render(<AlbescentTaskDetail state={baseState()} />);
    const sheetOpen = html.indexOf('class="task-detail-sheet"');
    expect(sheetOpen, "the shared sheet rendered").toBeGreaterThan(-1);

    // Content the sheet certainly holds, drawn after the overlay slot. The
    // brief, not the title: `Breadcrumb` prints the title too, and it sits
    // ABOVE the sheet, so the title's first occurrence is outside it.
    const content = html.indexOf(BRIEF);
    expect(content, "the sheet's content rendered").toBeGreaterThan(sheetOpen);

    for (const layer of ["alb-detail-foil", "alb-detail-edge"]) {
      const at = html.indexOf(layer);
      expect(at, `${layer} rendered`).toBeGreaterThan(sheetOpen);
      expect(at, `${layer} precedes the sheet content`).toBeLessThan(content);
    }
  });
});

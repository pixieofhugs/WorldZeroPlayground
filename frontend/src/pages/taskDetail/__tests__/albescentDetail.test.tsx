/**
 * Albescent task detail (#1038). Slots and comments are covered elsewhere; this
 * pins that it stays a WRAPPER over Default and that the design's voice never
 * returns (ADR-0057; ADR-0027: a voiced page un-hides the society).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import i18n from "../../../i18n";
import AlbescentTaskDetail from "../archetypes/AlbescentTaskDetail";
import DefaultTaskDetail from "../archetypes/DefaultTaskDetail";
import type { TaskDetailState } from "../useTaskDetail";
import { aPraxisCard, aTask } from '../../../test/fixtures'
import { factionName, setAlbescentRevealed } from "../../../utils/factions";

/** Caps are CSS (#2598); 18 = `modifiedPoints`, hence plural. */
const POINTS_UNIT = i18n.t("tasks:detail.points.total", { count: 18 });


const TITLE = "Sit with something until it turns pale";
const BRIEF =
  "Choose one small thing and attend it without fixing it, and change nothing.";

/** The design's voiced strings, all cut (ADR-0057, ADR-0027). */
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
    for (const shared of [
      "Task Description",
      "Discussion",
      "Sign up",
      "Level",
      "people working on this",
      // No `base`: dropped at ×1.0 (#1704); asserted below with a real factor.
      POINTS_UNIT,
    ]) {
      expect(text, `inherited slot: ${shared}`).toContain(shared);
    }
    expect(text).toContain(TITLE);
    expect(text).toContain(BRIEF);
    // #1891: reads "Unaffiliated" to an uninvited viewer; only the word goes.
    expect(text).toContain(factionName("na"));
    expect(text).not.toContain("Albescent");
  });

  it("names the order once the viewer has been revealed to it (#1891)", () => {
    // Module-level flag: reset unconditionally.
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
      // #2499: the ground is a class on the wrapper.
      "alb-prism",
      "alb-detail-foil",
      "alb-detail-edge",
      "alb-detail-ring",
    ]) {
      expect(html, `light layer: ${layer}`).toContain(layer);
    }
    expect(html, "no overlay wash beside the ground").not.toContain("alb-detail-aurora");
    expect(html).toContain("aria-hidden");
  });

  it("strips to Default: the wrapper adds no copy of its own", () => {
    // Case-insensitive (#2554): the stamp and the ring use differently cased keys.
    const words = (markup: string) =>
      new Set((markup.match(/[A-Za-z]{3,}/g) ?? []).map((w) => w.toLowerCase()));
    const wrapped = words(render(<AlbescentTaskDetail state={baseState()} />).text);
    const plain = words(render(<DefaultTaskDetail state={baseState()} />).text);
    // Equal vocabulary in both directions is what makes this a wrapper.
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
    // Raw factor (ADR-0055).
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
 * Class hooks paired with the stylesheet contract in
 * `praxisCard/__tests__/albescentDriftStopsAtMedia` (#1646, #1942). Static
 * markup cannot prove a photo comes out untinted; that is visual QA. Scope covers
 * the gallery too. Since #2499 both washes are one token, so they cannot stack;
 * the wheel overlay (`z-index: 2`) is what the lift still clears.
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
    // `.alb-detail .task-detail-sheet` needs this hook.
    const { html } = render(<AlbescentTaskDetail state={baseState()} />);
    expect(html, "the 1200 column's class").toContain('class="task-detail-sheet"');
    const sheet = html.slice(html.indexOf('class="task-detail-sheet"'));
    // An inline z-index could not be overridden by a selector.
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
    // #1646: a monogram is not a photograph. `TASK` has no avatar url.
    const { html } = render(<AlbescentTaskDetail state={baseState()} />);
    expect(html).not.toContain("user-media");
  });

  it("carries the gallery's thumbnails out with it", () => {
    // The hook is #1941's, on `PraxisMediaGallery`; pins it reaches this page.
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
    // Page and card both scope it; one token, so no stacking (#2499).
    expect(html.match(/alb-prism/g) ?? [], "the page and the card").toHaveLength(2);
    expect(html).toContain("alb-detail-foil");
  });
});

describe("Albescent task detail — the overlay traces the sheet (#2549)", () => {
  /**
   * The layers are the sheet's first children, so they trace it even with the
   * Breadcrumb above. Asserted as ORDER: that is the containment claim.
   */
  it("mounts both light layers as the sheet's first children, before its content", () => {
    const { html } = render(<AlbescentTaskDetail state={baseState()} />);
    const sheetOpen = html.indexOf('class="task-detail-sheet"');
    expect(sheetOpen, "the shared sheet rendered").toBeGreaterThan(-1);

    // The brief, not the title: Breadcrumb prints the title above the sheet.
    const content = html.indexOf(BRIEF);
    expect(content, "the sheet's content rendered").toBeGreaterThan(sheetOpen);

    for (const layer of ["alb-detail-foil", "alb-detail-edge"]) {
      const at = html.indexOf(layer);
      expect(at, `${layer} rendered`).toBeGreaterThan(sheetOpen);
      expect(at, `${layer} precedes the sheet content`).toBeLessThan(content);
    }
  });
});

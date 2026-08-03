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
import type { TaskOut } from "../../../api/tasks";

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

const TASK: TaskOut = {
  id: 207,
  title: TITLE,
  description: BRIEF,
  point_value: 18,
  level_required: 2,
  status: "active",
  task_type: "standard",
  created_by: 31,
  primary_faction_slug: "albescent",
  metatask_faction_slug: null,
  created_at: "2026-01-01T00:00:00Z",
  created_by_avatar_url: "",
  signup_reason: null,
  in_progress_count: 6,
  created_by_display_name: "Wren Abalone",
  created_by_faction_slug: "albescent",
  created_by_level: 4,
  can_sign_up: true,
  allowed_modes: ["solo"],
  eligible_for_current_user: true,
};

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
      "In progress",
      "base",
    ]) {
      expect(text, `inherited slot: ${shared}`).toContain(shared);
    }
    expect(text).toContain(TITLE);
    expect(text).toContain(BRIEF);
    // The faction line resolves from factions.json by slug, like every skin.
    expect(text).toContain("Albescent");
  });

  it("adds the light layers and nothing else structural", () => {
    const { html } = render(<AlbescentTaskDetail state={baseState()} />);
    for (const layer of [
      "alb-detail",
      "alb-detail-aurora",
      "alb-detail-foil",
      "alb-detail-edge",
      "alb-detail-ring",
    ]) {
      expect(html, `light layer: ${layer}`).toContain(layer);
    }
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
    expect(text).toContain("In progress");
    expect(text).toContain("6");
  });
});

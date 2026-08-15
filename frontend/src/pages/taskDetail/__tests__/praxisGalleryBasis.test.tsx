/**
 * The task-detail praxis gallery constrains the card basis (#1137).
 *
 * A task detail mounts the SAME `<PraxisCard>` the `/praxes` feed does — one
 * responsive component per faction since ADR-0067 — and the card carries its own
 * `flex` basis. On the feed that basis is the whole layout; inside a task page it
 * is a transplanted feed card, so few fit per row and the gallery reads as
 * somebody else's list dropped in.
 *
 * The fix is a CONSTRAINT AT THE MOUNT, not a second card: `frameBase` takes its
 * basis from `--praxis-card-basis` (defaulting to the feed's 394px), and the
 * eight task-detail galleries set that variable via `.praxis-gallery`. So the
 * seam this file pins is exactly two facts:
 *
 *  1. every registered task-detail archetype's gallery carries `.praxis-gallery`;
 *  2. `frameBase` actually READS the variable, and its fallback is still the
 *     feed's 394px — which is what leaves `/praxes`, the profile and the faction
 *     pages byte-identical, since none of them sets the variable.
 *
 * Drop either and the other is decorative: a class nobody reads, or a variable
 * nobody sets.
 *
 * CEILING (`renderToStaticMarkup`, no jsdom, no layout, no computed styles):
 * this cannot prove a card got smaller, that three land in a row, or that a skin
 * is not cramped. Those are visual QA. It proves the wiring is connected.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import { surfaceMap } from "../../../factions";
import DefaultTaskDetail from "../archetypes/DefaultTaskDetail";
import { frameBase } from "../../../components/praxisCard/desktop/shared";
import type { TaskDetailState } from "../useTaskDetail";
import type { PraxisCardOut } from "../../../api/praxis";
import { aTask } from '../../../test/fixtures'

const TASK = aTask({
  title: "Reforestation",
  description: "Mangrove",
  point_value: 30,
  level_required: 3,
  created_by: 3,
  primary_faction_slug: "snide",
  created_by_display_name: "",
});

/** Four filed praxis — one past the 3-card preview, so the gallery is populated. */
const PRAXIS: PraxisCardOut[] = [1, 2, 3, 4].map((n) => ({
  id: n,
  task_id: 7,
  task_title: TASK.title,
  task_point_value: 30,
  task_level_required: 3,
  type: "solo",
  status: "submitted",
  title: `Seedlings ${n}`,
  moderation_status: "visible",
  created_by_id: 40 + n,
  created_by_display_name: `Planter ${n}`,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  submitted_at: "2026-01-02T00:00:00Z",
  member_count: 1,
  score: 5 - n,
  voter_count: 0,
  metatask_points: 0,
  display_multiplier: 1.0,
  points_from_votes: 0,
  habit_bonus_points: 0,
  is_top_for_task: false,
  applied_metatasks: [],
  body_text: null,
  created_by_avatar_url: "",
  created_by_faction_slug: null,
  duel_id: null,
  media_items: [],
  members: [],
  opponent_display_name: null,
  opponent_faction_slug: null,
  opponent_praxis_id: null,
  submit_proposed_at: null,
  viewer_can_vote: true,
  viewer_vote: null,
  voted_by_name: null,
  task_faction_slug: "snide",
}));

function baseState(overrides: Partial<TaskDetailState> = {}): TaskDetailState {
  return {
    loading: false,
    task: TASK,
    fetchError: null,
    submissions: PRAXIS,
    comments: null,
    friends: new Set(),
    foes: new Set(),
    mySubmission: undefined,
    isInProgress: false,
    inProgressPraxisId: null,
    canSignUp: false,
    levelJumpSignup: false,
    slotsOpen: 2,
    maxTaskSlots: 3,
    basePoints: 30,
    factionMultiplier: 1.0,
    modifiedPoints: 30,
    inProgressCount: 0,
    topScore: 0,
    voteCount: 0,
    submissionSort: "score",
    setSubmissionSort: () => {},
    sortedSubmissions: PRAXIS,
    signupError: null,
    handleSignup: async () => {},
    handleDrop: async () => {},
    ...overrides,
  };
}

function render(element: ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
}

// The Default fallback is a renderable surface too — guard it with the registry.
const archetypes = { ...surfaceMap("taskDetail"), __default__: DefaultTaskDetail };

describe("task-detail praxis gallery basis (#1137)", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} wraps its praxis gallery in .praxis-gallery`, () => {
      const html = render(<Archetype state={baseState()} />);
      expect(html, "gallery constraint class").toContain("praxis-gallery");
    });
  }

  it("the card frame reads the variable the gallery sets", () => {
    expect(frameBase.flex).toContain("var(--praxis-card-basis");
  });

  it("the card frame still falls back to the feed's 394px basis", () => {
    // Nothing outside `.praxis-gallery` sets the variable, so `/praxes`, the
    // character profile and the faction pages render exactly as before.
    expect(frameBase.flex).toContain("394px");
  });
});

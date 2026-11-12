/**
 * The task-detail gallery constrains the shared `<PraxisCard>` basis at the mount
 * (#1137): every archetype's gallery carries `.praxis-gallery`, and `frameBase`
 * reads `--praxis-card-basis` with the feed's 394px fallback. Plus a 50% cap on
 * children (#1897, #2229), separate from the wrap basis. Static markup proves the
 * wiring, not the layout; that is visual QA.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import { ruleBodies, stripComments } from "../../../utils/__tests__/cssVars";
import { surfaceMap } from "../../../factions";
import DefaultTaskDetail from "../archetypes/DefaultTaskDetail";
import { frameBase } from "../../../components/praxisCard/desktop/shared";
import type { TaskDetailState } from "../useTaskDetail";
import type { PraxisCardOut } from "../../../api/praxis";
import { aTask } from '../../../test/fixtures'
import { readIndexCss } from "../../../test/indexCss";

const TASK = aTask({
  title: "Reforestation",
  description: "Mangrove",
  point_value: 30,
  level_required: 3,
  created_by: 3,
  primary_faction_slug: "snide",
  created_by_display_name: "",
});

/** One past the 3-card preview. */
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
  opponent_avatar_url: "",
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
    dropConfirm: null,
    ...overrides,
  };
}

function render(element: ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
}

const archetypes = { ...surfaceMap("taskDetail"), __default__: DefaultTaskDetail };

const css = stripComments(
  readIndexCss(),
);

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
    // Nothing outside `.praxis-gallery` sets the variable.
    expect(frameBase.flex).toContain("394px");
  });
});

describe("a lone praxis card takes half the row (#1897, refined by #2229)", () => {
  const capped = ruleBodies(css, ".praxis-gallery > *");
  const gallery = ruleBodies(css, ".praxis-gallery");

  it("the gallery caps its children at half the row", () => {
    // `frameBase` grows, so a lone card ate the row (#1897); 320px read squished (#2229).
    expect(capped.length, ".praxis-gallery > * rule must exist").toBeGreaterThan(0);
    for (const body of capped) {
      expect(body).toMatch(/max-width\s*:\s*50%/);
    }
  });

  it("the cap no longer reads the wrap basis", () => {
    // #2229: basis = where the row wraps; cap = how wide a lone card grows.
    for (const body of capped) {
      expect(body).not.toMatch(/--praxis-card-basis/);
    }
  });

  it("leaves the wrap basis at 320px", () => {
    expect(gallery.length, ".praxis-gallery rule must exist").toBeGreaterThan(0);
    expect(gallery.join("\n")).toMatch(/--praxis-card-basis\s*:\s*320px/);
  });

  it("leaves the card's 280px phone floor alone", () => {
    // Deliberate: `min-width` beats `max-width`, so the floor holds on phones.
    expect(frameBase.minWidth).toBe(280);
    for (const body of capped) {
      expect(body).not.toMatch(/min-width/);
    }
  });

  it("does not set width, which would fight the card's inline style", () => {
    // `max-width` avoids fighting `frameBase`'s inline `width: 100%`.
    for (const body of capped) {
      expect(body).not.toMatch(/(^|[\s;])width\s*:/);
    }
  });
});

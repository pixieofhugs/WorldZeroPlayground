/**
 * "Your praxis" on task detail points at the read page, not `/edit` (#1397):
 * `mySubmission` is submitted by construction and `/edit` redirects a submitted
 * praxis back (#1164). The draft link is asserted too, so "dropped the dead link"
 * is distinguishable from "dropped editing".
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import "../../../i18n";
import { surfaceMap } from "../../../factions";
import DefaultTaskDetail from "../archetypes/DefaultTaskDetail";
import type { TaskDetailState } from "../useTaskDetail";
import type { PraxisCardOut } from "../../../api/praxis";
import { aTask } from '../../../test/fixtures'

const TASK = aTask({
  id: 207,
  title: "A Very Human Thing",
  description: "Make something small and honest.",
  created_by: 31,
  in_progress_count: 6,
  created_by_display_name: "Wren Abalone",
  created_by_level: 4,
});

/** Always `submitted`: it comes from the submissions gallery. */
const MY_SUBMISSION = {
  id: 91,
  task_id: 207,
  task_title: TASK.title,
  task_point_value: 18,
  task_level_required: 2,
  type: "solo",
  status: "submitted",
  title: "Estuary",
  moderation_status: "visible",
  created_by_id: 42,
  created_by_display_name: "Adabel",
  created_at: "2026-01-02T00:00:00Z",
  updated_at: "2026-01-03T00:00:00Z",
  submitted_at: "2026-01-03T00:00:00Z",
  member_count: 1,
  score: 18,
  voter_count: 0,
  metatask_points: 0,
  display_multiplier: 1.0,
  points_from_votes: 0,
  is_top_for_task: false,
  task_faction_slug: null,
} as PraxisCardOut;

function baseState(overrides: Partial<TaskDetailState> = {}): TaskDetailState {
  return {
    loading: false,
    task: TASK,
    fetchError: null,
    comments: null,
    submissions: [],
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

function render(element: ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
}

const archetypes = {
  ...surfaceMap("taskDetail"),
  __default__: DefaultTaskDetail,
};

describe("the submitted-praxis button reaches a page that exists (#1397)", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} sends the author to the praxis, not to a redirect`, () => {
      const html = render(
        <Archetype state={baseState({ mySubmission: MY_SUBMISSION, canSignUp: false })} />,
      );
      expect(html, "no link into the handoff").not.toContain('href="/praxis/91/edit"');
      expect(html, "the read page, where reopening lives").toContain('href="/praxis/91"');
    });

    it(`${slug} still opens a DRAFT in the composer`, () => {
      const html = render(
        <Archetype
          state={baseState({
            isInProgress: true,
            inProgressPraxisId: 91,
            canSignUp: false,
          })}
        />,
      );
      expect(html, "a draft belongs in /edit").toContain('href="/praxis/91/edit"');
    });
  }
});

/**
 * Mobile task-detail slot invariant — the mobile twin of archetypeSlots.test.
 * Walks the surfaceMap('mobileTaskDetail') registry plus the Default mobile skin and
 * asserts each still emits the invariant content slots (title, description,
 * all-tasks breadcrumb, sort toggle, signup CTA, edit/continue controls). Guards
 * the Default fallback plus every bespoke mobile skin — Everymen is the first
 * (#497); the rest land in #496–#500.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { surfaceMap } from "../../../factions";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
// Initialize the i18n catalog so shared copy keys resolve to English text.
import "../../../i18n";
import DefaultMobileTaskDetail from "../mobileArchetypes/DefaultTaskDetail";
import type { TaskDetailState } from "../useTaskDetail";
import type { TaskOut } from "../../../api/tasks";
import type { PraxisCardOut } from "../../../api/praxis";

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
  return { html, text: html.replace(/<[^>]*>/g, "") };
}

const TASK: TaskOut = {
  id: 7,
  title: "Reforestation",
  description: "Mangrove",
  point_value: 30,
  level_required: 3,
  status: "active",
  task_type: "standard",
  created_by: 3,
  primary_faction_slug: "snide",
  metatask_faction_slug: null,
  is_task_vision_eligible: false,
  created_at: "2026-01-01T00:00:00Z",
  can_submit_praxis: true,
  allowed_modes: ["solo"],
  eligible_for_current_user: true,
};

const MY_PRAXIS: PraxisCardOut = {
  id: 55,
  task_id: 7,
  task_title: "Reforestation",
  task_point_value: 30,
  task_level_required: 3,
  type: "solo",
  status: "submitted",
  title: "Seedlings",
  moderation_status: "visible",
  created_by_id: 3,
  created_by_display_name: "Ada",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  submitted_at: "2026-01-02T00:00:00Z",
  member_count: 1,
  score: 4.2,
  voter_count: 0,
  metatask_points: 0,
  display_multiplier: 1.0,
  points_from_votes: 0,
  is_top_for_task: false,
  task_faction_slug: "snide",
};

function baseState(overrides: Partial<TaskDetailState>): TaskDetailState {
  return {
    loading: false,
    task: TASK,
    fetchError: null,
    submissions: [],
    signups: [],
    friends: new Set(),
    foes: new Set(),
    mySubmission: undefined,
    isInProgress: false,
    inProgressPraxisId: null,
    canSignUp: false,
    slotsOpen: 13,
    maxTaskSlots: 17,
    factionMultiplier: 1.0,
    modifiedPoints: 4242,
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

const archetypes = { ...surfaceMap('mobileTaskDetail'), __default__: DefaultMobileTaskDetail };

describe("mobile task-detail content-slot invariant", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} renders title, description, breadcrumb + sort toggle`, () => {
      const { html, text } = render(<Archetype state={baseState({ canSignUp: true })} />);
      expect(text, "title slot").toContain("Reforestation");
      expect(text, "description slot").toContain("Mangrove");
      expect(html, "all-tasks breadcrumb slot").toContain('href="/tasks"');
      expect(html.toLowerCase(), "sort-toggle slot").toContain("recent");
    });

    it(`${slug} renders the signup CTA when canSignUp`, () => {
      const { text } = render(<Archetype state={baseState({ canSignUp: true })} />);
      expect(text.toLowerCase(), "signup-CTA slot").toContain("earn up to");
    });

    it(`${slug} renders the edit control for a submitted praxis`, () => {
      const { html } = render(<Archetype state={baseState({ mySubmission: MY_PRAXIS })} />);
      expect(html, "edit-submission slot").toContain('href="/praxes/55/edit"');
    });

    it(`${slug} renders the continue control while in progress`, () => {
      const { html } = render(<Archetype state={baseState({ isInProgress: true, inProgressPraxisId: 99 })} />);
      expect(html, "continue-in-progress slot").toContain('href="/praxes/99/edit"');
    });
  }
});

/**
 * Task-detail content-slot invariant guard (ADR-0002).
 *
 * Every per-faction task-detail archetype wears a wildly different skin (gilt
 * salon, ransom dossier, terminal printout, union poster…) but must render the
 * same CONTENT slots. The slots are convention-only — an archetype may *arrange*
 * them freely but may not *drop* one. This test walks the real
 * `ARCHETYPE_BY_SLUG` registry (plus the Default fallback) and asserts every
 * registered archetype still emits the invariant slots. A new faction that drops
 * a slot fails here, so the guard scales free as factions are added.
 *
 * We render to static markup (no DOM, no context) and assert on the structural
 * anchors each slot leaves behind: slot text and the stable hrefs
 * (`/tasks`, `/praxes/:id/edit`). Distinctive fixture values keep the substring
 * checks from colliding with incidental markup. Submissions are left empty so
 * the test never has to mount the context-bound <PraxisCard> wrapper — the
 * praxis section is anchored instead by its always-present sort toggle, and
 * PraxisCard composition is guarded separately by factionCardSlots.test.tsx.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import { ARCHETYPE_BY_SLUG } from "../../TaskDetail";
import DefaultTaskDetail from "../archetypes/DefaultTaskDetail";
import type { TaskDetailState } from "../useTaskDetail";
import type { TaskOut } from "../../../api/tasks";
import type { PraxisCardOut } from "../../../api/praxis";

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
  // Tag-stripped text — several archetypes split the title across spans (SNIDE's
  // ransom-note fragments, the Ephemerists' lapis last-word), so the title slot
  // only reads contiguously once the wrapping tags are removed.
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
  is_top_for_task: false,
  task_faction_slug: "snide",
};

/** Base state — every flag off; scenarios override what they exercise. */
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

// Default fallback is a registered renderable too — guard it alongside the map.
const archetypes = { ...ARCHETYPE_BY_SLUG, __default__: DefaultTaskDetail };

describe("task-detail content-slot invariant", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} renders title, description, breadcrumb + sort toggle`, () => {
      const { html, text } = render(
        <Archetype state={baseState({ canSignUp: true })} />,
      );
      expect(text, "title slot").toContain("Reforestation");
      expect(text, "description slot").toContain("Mangrove");
      expect(html, "all-tasks breadcrumb slot").toContain('href="/tasks"');
      // Sort toggle: every archetype labels the recency option "recent".
      expect(html.toLowerCase(), "sort-toggle slot").toContain("recent");
    });

    it(`${slug} renders the signup CTA when canSignUp`, () => {
      const { text } = render(
        <Archetype state={baseState({ canSignUp: true })} />,
      );
      // Every signup CTA quotes the points-on-offer ("earn up to N pts").
      expect(text.toLowerCase(), "signup-CTA slot").toContain("earn up to");
    });

    it(`${slug} renders the edit control for a submitted praxis`, () => {
      const { html } = render(
        <Archetype state={baseState({ mySubmission: MY_PRAXIS })} />,
      );
      expect(html, "edit-submission slot").toContain('href="/praxes/55/edit"');
    });

    it(`${slug} renders the continue control while in progress`, () => {
      const { html } = render(
        <Archetype
          state={baseState({ isInProgress: true, inProgressPraxisId: 99 })}
        />,
      );
      expect(html, "continue-in-progress slot").toContain(
        'href="/praxes/99/edit"',
      );
    });
  }
});

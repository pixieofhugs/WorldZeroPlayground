/**
 * Task-detail content-slot invariant guard (ADR-0002).
 *
 * Every per-faction task-detail archetype wears a wildly different skin (gilt
 * salon, ransom dossier, terminal printout, union poster…) but must render the
 * same CONTENT slots. The slots are convention-only — an archetype may *arrange*
 * them freely but may not *drop* one. This test walks the real
 * `surfaceMap('taskDetail')` registry (plus the Default fallback) and asserts every
 * registered archetype still emits the invariant slots. A new faction that drops
 * a slot fails here, so the guard scales free as factions are added.
 *
 * We render to static markup (no DOM, no context) and assert on the structural
 * anchors each slot leaves behind: slot text and the stable hrefs
 * (`/tasks`, `/praxis/:id`, `/praxis/:id/edit`). Distinctive fixture values keep the substring
 * checks from colliding with incidental markup. Submissions are left empty so
 * the test never has to mount the context-bound <PraxisCard> wrapper — the
 * praxis section is anchored instead by its always-present sort toggle, and
 * PraxisCard composition is guarded separately by factionCardSlots.test.tsx.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { surfaceMap } from "../../../factions";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
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
  metatask_points: 0,
  display_multiplier: 1.0,
  points_from_votes: 0,
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
    comments: null,
    friends: new Set(),
    foes: new Set(),
    mySubmission: undefined,
    isInProgress: false,
    inProgressPraxisId: null,
    canSignUp: false,
    levelJumpSignup: false,
    slotsOpen: 13,
    maxTaskSlots: 17,
    basePoints: 4242,
    factionMultiplier: 1.0,
    modifiedPoints: 4242,
    inProgressCount: 0,
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
const archetypes = { ...surfaceMap('taskDetail'), __default__: DefaultTaskDetail };

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
      // Two vocabularies coexist while C1–C8 (#1031–#1038) land. The faction
      // skins still speak their own voice and quote the points on the CTA
      // ("earn up to N pts"); a skin rebuilt on the shared neutral copy
      // (ADR-0057) says plainly "Sign up" and moves the points into the action
      // panel's base/×mult/total readout. Either satisfies the slot; an
      // archetype with no sign-up affordance at all satisfies neither.
      const lower = text.toLowerCase();
      expect(
        lower.includes("earn up to") || lower.includes("sign up"),
        "signup-CTA slot",
      ).toBe(true);
    });

    it(`${slug} renders the my-submission control`, () => {
      const { html } = render(
        <Archetype state={baseState({ mySubmission: MY_PRAXIS })} />,
      );
      // #1397: the slot points at the READ page. `mySubmission` is submitted by
      // construction, and `/edit` bounces a submitted praxis straight back to
      // `/praxis/:id` — the button used to change nothing at all.
      expect(html, "my-submission slot").toContain('href="/praxis/55"');
    });

    it(`${slug} renders the continue control while in progress`, () => {
      const { html } = render(
        <Archetype
          state={baseState({ isInProgress: true, inProgressPraxisId: 99 })}
        />,
      );
      expect(html, "continue-in-progress slot").toContain(
        'href="/praxis/99/edit"',
      );
    });
  }
});

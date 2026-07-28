/**
 * Mobile task-detail UA dispatch + rendered identity (#525, #852).
 *
 * The registry half asserts the mobile map resolves a `ua` task to the bespoke
 * mobile skin and that the desktop archetype is untouched. The rendered half is
 * the one that matters now the salon is dead (#788): it asserts the MARKUP —
 * the ensō carrying the point value, the mandala at `texture` behind the hero
 * and nowhere else, the one dashed orange rule, and the absence of the legacy
 * gold family.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
// Initialize the i18n catalog so copy keys resolve to English text.
import "../../../i18n";
import { pickVariant } from "../../../utils/factionDispatch";
import { surfaceMap } from "../../../factions";
import DefaultMobileTaskDetail from "../mobileArchetypes/DefaultTaskDetail";
import UAMobileTaskDetail from "../mobileArchetypes/UaTaskDetail";
import UADesktopTaskDetail from "../archetypes/UaTaskDetail";
import type { TaskDetailState } from "../useTaskDetail";
import type { TaskOut } from "../../../api/tasks";

const TASK: TaskOut = {
  id: 7,
  title: "Render the old library façade in charcoal",
  description: "Draw only what the light is doing.",
  point_value: 30,
  level_required: 2,
  status: "active",
  task_type: "standard",
  created_by: 3,
  primary_faction_slug: "ua",
  metatask_faction_slug: null,
  is_task_vision_eligible: false,
  created_at: "2026-01-01T00:00:00Z",
  can_submit_praxis: true,
  allowed_modes: ["solo"],
  eligible_for_current_user: true,
};

function baseState(overrides: Partial<TaskDetailState> = {}): TaskDetailState {
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
    canSignUp: true,
    levelJumpSignup: false,
    slotsOpen: 3,
    maxTaskSlots: 8,
    basePoints: 42,
    factionMultiplier: 1.0,
    modifiedPoints: 42,
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

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
  return { html, text: html.replace(/<[^>]*>/g, "") };
}

describe("mobile task-detail UA dispatch", () => {
  it("mobile + a UA task resolves to the bespoke UA mobile skin", () => {
    expect(pickVariant(surfaceMap('mobileTaskDetail'), "ua", DefaultMobileTaskDetail)).toBe(
      UAMobileTaskDetail,
    );
  });

  it("mobile + any other slug falls through to the Default mobile skin", () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(surfaceMap('mobileTaskDetail'), slug, DefaultMobileTaskDetail)).toBe(
        DefaultMobileTaskDetail,
      );
    }
  });

  it("desktop keeps its own UA archetype, never the mobile skin", () => {
    const desktop = pickVariant(surfaceMap('taskDetail'), "ua", DefaultMobileTaskDetail);
    expect(desktop).toBe(UADesktopTaskDetail);
    expect(desktop).not.toBe(UAMobileTaskDetail);
  });
});

describe("UA mobile task detail — what it draws", () => {
  it("writes the point value inside the ensō", () => {
    const { html, text } = render(<UAMobileTaskDetail state={baseState()} />);
    // The one ensō (#908): the vendored brush drawing, painted through a mask.
    expect(html).toContain("/factionMarks/enso.svg");
    expect(html).toContain("var(--faction-ua-vermil)");
    expect(text).toContain("42");
  });

  it("runs the mandala behind the hero at texture strength, and nowhere else", () => {
    const { html } = render(<UAMobileTaskDetail state={baseState()} />);
    // The mandala's outer guide circle; the ensō draws no such hairline stroke.
    expect(html.match(/stroke-width="0\.6"/g)).toHaveLength(1);
    expect(html).toContain("opacity:0.14");
  });

  it("draws the one dashed orange rule", () => {
    const { html } = render(<UAMobileTaskDetail state={baseState()} />);
    expect(html.match(/1\.5px dashed var\(--faction-ua\)/g)).toHaveLength(1);
  });

  it("lifts a signup error instead of washing it in the now-opaque tint (#848)", () => {
    const { html, text } = render(<UAMobileTaskDetail state={baseState({ signupError: "no sheet free" })} />);
    expect(text).toContain("no sheet free");
    expect(html).toContain("var(--faction-ua-lift)");
    // --faction-ua-light stopped being translucent in #848, so it can no longer
    // whisper behind a message; this surface must not reach for it.
    expect(html).not.toContain("var(--faction-ua-light)");
  });

  it("carries no gold: the legacy --ua-* palette and Cinzel are gone here", () => {
    const { html } = render(<UAMobileTaskDetail state={baseState()} />);
    expect(html).not.toMatch(/--ua-(gold|gilt|paper|wall|line|ink|sub|muted|orange)/);
    expect(html).not.toMatch(/--font-faction-engraved/);
  });
});

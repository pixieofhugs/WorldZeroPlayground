/**
 * WOW task detail — the parchment field (#1037).
 *
 * This is the NET-NEW case in the epic: WOW had no desktop `taskDetail`
 * archetype at all, so a WOW task rendered the **na dossier** (one of #951's
 * four bullets). Two of these tests exist purely because of that:
 * `registers the taskDetail surface` pins the registry row that makes the page
 * reachable, and `is not wearing the na dossier` pins that it stopped being the
 * fallback — a green render proves neither on its own.
 *
 * `archetypeSlots.test.tsx` already walks this archetype for the shared content
 * slots and `detailContract.test.tsx` for the comments gate, so neither is
 * repeated here. What is left is what only WOW can get wrong: its dress, and
 * ADR-0057's rule that the dress is the ONLY thing it may bring.
 *
 * Static markup only — no DOM, no effects (the harness runs none), so anything
 * behind a fetch is asserted through its pre-fetch state.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import { surfaceMap } from "../../../factions";
import { resolvedArchetype } from "../../../factions/lazyArchetype";
import WowTaskDetail from "../archetypes/WowTaskDetail";
import type { TaskDetailState } from "../useTaskDetail";
import type { TaskOut, TaskSignupOut } from "../../../api/tasks";

const TASK: TaskOut = {
  id: 663,
  // No apostrophes in the fixtures: `renderToStaticMarkup` escapes them to
  // `&#x27;`, which survives the tag-strip and breaks a plain substring check.
  title: "Hauled the recycling to the depot",
  description: "Take the whole block, not only your bin.",
  point_value: 12,
  level_required: 3,
  status: "active",
  task_type: "standard",
  created_by: 31,
  primary_faction_slug: "wow",
  metatask_faction_slug: null,
  is_task_vision_eligible: false,
  created_at: "2026-01-01T00:00:00Z",
  in_progress_count: 4,
  created_by_display_name: "Wren Abalone",
  created_by_faction_slug: "wow",
  created_by_level: 4,
  can_submit_praxis: true,
  allowed_modes: ["solo"],
  eligible_for_current_user: true,
};

const SIGNUP: TaskSignupOut = {
  character_id: 88,
  display_name: "Ossuary Pete",
  avatar_url: "",
  faction_slug: "snide",
  level: 7,
  status: "in_progress",
  signed_up_at: "2026-01-03T00:00:00Z",
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
    slotsOpen: 5,
    maxTaskSlots: 12,
    basePoints: 12,
    factionMultiplier: 1.0,
    modifiedPoints: 12,
    inProgressCount: 4,
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

describe("wow task detail — the surface is reachable at all", () => {
  it("registers the taskDetail surface, so a WOW task stops falling to na", () => {
    // #951's first bullet. Before #1037 this entry was undefined and
    // `pickVariant` handed a WOW task straight to DefaultTaskDetail.
    expect(surfaceMap("taskDetail")["wow"]).toBeDefined();
    expect(resolvedArchetype(surfaceMap("taskDetail")["wow"])).toBe(WowTaskDetail);
  });

  it("renders the task without throwing", () => {
    const { text } = render(<WowTaskDetail state={baseState()} />);
    expect(text).toContain("Hauled the recycling to the depot");
    expect(text).toContain("Take the whole block, not only your bin.");
  });
});

describe("wow task detail — the dress is WOW's, and only the dress", () => {
  it("lays the page on the parchment field, not the na spectrum", () => {
    const { html } = render(<WowTaskDetail state={baseState()} />);
    expect(html).toContain("wow-detail-field");
    // The na kit's two ornaments. If either shows up here the archetype has
    // been copied without being re-dressed.
    expect(html).not.toContain("na-backdrop");
    expect(html).not.toContain("--faction-default-rainbow");
  });

  it("draws the ribbon, the shield and the googly balloons", () => {
    const { html } = render(<WowTaskDetail state={baseState()} />);
    expect(html, "the barber ribbon over the action plate").toContain(
      "--faction-wow-quest-ribbon",
    );
    expect(html, "the crossed-swords blades").toContain("--faction-wow-quest-blade");
    expect(html, "the balloon bunch").toContain("wow-balloon-bunch");
    // The pupils ride the faction's existing reduced-motion-gated wiggle rather
    // than an inline `animation:`, which would bypass the gate.
    expect(html).toContain("wow-balloon-eye");
    expect(html).not.toContain("animation:");
  });

  it("speaks the shared neutral copy — none of the design's faction voice", () => {
    const { text } = render(<WowTaskDetail state={baseState()} />);
    expect(text).toContain("Task Description");
    expect(text).toContain("Discussion");
    expect(text).toContain("Sign up");
    // ADR-0057: dress is WOW's, words are not. Every one of these is a word the
    // vendored design puts on this page.
    const lower = text.toLowerCase();
    expect(lower, "the design's 'You're on this quest'").not.toContain("quest");
    expect(lower, "the design's 'N submissions' heading").not.toContain("submission");
    expect(lower, "the design's 'highest scored' sort tab").not.toContain("highest scored");
    expect(lower, "the design's 'your points' plaque label").not.toContain("your points");
  });
});

describe("wow task detail — the contract points it inherits", () => {
  it("hides the multiplier badge at the identity factor", () => {
    const { text } = render(<WowTaskDetail state={baseState()} />);
    expect(text).not.toContain("×");
  });

  it("shows the raw multiplier once an era ships a real factor", () => {
    const { text } = render(
      <WowTaskDetail state={baseState({ factionMultiplier: 1.5, modifiedPoints: 18 })} />,
    );
    expect(text).toContain("×1.50");
    // Base and total both stay legible; the badge replaces neither.
    expect(text).toContain("12");
    expect(text).toContain("18");
  });

  it("renders no in-progress roster, only the header count", () => {
    // Owner ruling 2026-07-28, reversing epic #1028 decision 3. The design's own
    // header comment says the header count covers it.
    const { text } = render(<WowTaskDetail state={baseState({ signups: [SIGNUP] })} />);
    expect(text).not.toContain("Ossuary Pete");
    expect(text).toContain("In progress");
    expect(text).toContain("4");
  });

  it("keeps the metatask pill and the metatask-for line", () => {
    const { text } = render(
      <WowTaskDetail
        state={baseState({
          task: { ...TASK, task_type: "metatask", metatask_faction_slug: "coven" },
        })}
      />,
    );
    expect(text).toContain("META");
    expect(text).toContain("Metatask for Cozy Coven");
  });

  it("expands the gallery in place instead of the dead ?task_id= link", () => {
    // `/praxes?task_id=N` has never filtered — `usePraxes` reads no such param —
    // so every archetype's "view all" silently showed the whole feed (#1030).
    const { html } = render(<WowTaskDetail state={baseState()} />);
    expect(html).not.toContain("task_id=");
  });
});

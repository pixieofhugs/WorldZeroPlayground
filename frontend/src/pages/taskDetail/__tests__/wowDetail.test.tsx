/**
 * WOW task detail (#1037). WOW previously fell back to the na page (#951), so
 * the registry row and "not the na dress" are pinned explicitly; beyond that,
 * only the dress may differ (ADR-0057). Static markup only.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import { surfaceMap } from "../../../factions";
import { resolvedArchetype } from "../../../factions/lazyArchetype";
import WowTaskDetail from "../archetypes/WowTaskDetail";
import type { TaskDetailState } from "../useTaskDetail";
import { aTask } from '../../../test/fixtures'
import { factionName } from "../../../utils/factions";
import i18n from "../../../i18n";

const TASK = aTask({
  id: 663,
  // No apostrophes: they render as `&#x27;` and break substring checks.
  title: "Hauled the recycling to the depot",
  description: "Take the whole block, not only your bin.",
  point_value: 12,
  level_required: 3,
  created_by: 31,
  primary_faction_slug: "wow",
  in_progress_count: 4,
  created_by_display_name: "Wren Abalone",
  created_by_faction_slug: "wow",
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
    dropConfirm: null,
    ...overrides,
  };
}

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
  return { html, text: html.replace(/<[^>]*>/g, "") };
}

describe("wow task detail — the surface is reachable at all", () => {
  it("registers the taskDetail surface, so a WOW task stops falling to na", () => {
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
    // na ornaments here would mean a copy without re-dressing.
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
    // Motion via the reduced-motion-gated class, never inline.
    expect(html).toContain("wow-balloon-eye");
    expect(html).not.toContain("animation:");
  });

  it("speaks the shared neutral copy — none of the design's faction voice", () => {
    const { text } = render(<WowTaskDetail state={baseState()} />);
    expect(text).toContain("Task Description");
    expect(text).toContain("Discussion");
    expect(text).toContain("Sign up");
    // ADR-0057: the design's own words.
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
    expect(text).toContain("12");
    expect(text).toContain("18");
  });

  it("renders the in-progress population as a header count", () => {
    const { text } = render(<WowTaskDetail state={baseState()} />);
    expect(text).toContain("people working on this");
    expect(text).toContain("4");
  });

  it("keeps the metatask pill and the issuer line", () => {
    const { text } = render(
      <WowTaskDetail
        state={baseState({
          task: { ...TASK, task_type: "metatask", metatask_faction_slug: "coven" },
        })}
      />,
    );
    expect(text).toContain("META");
    // From the catalog: the issuer line (#2282).
    expect(text).toContain(
      i18n.t("tasks:detail.metataskIssuer", { faction: factionName("coven") }),
    );
  });

  it("expands the gallery in place instead of linking out to ?task_id=", () => {
    const { html } = render(<WowTaskDetail state={baseState()} />);
    expect(html).not.toContain("task_id=");
  });
});

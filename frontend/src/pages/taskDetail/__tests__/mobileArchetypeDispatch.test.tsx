/**
 * Mobile task-detail DISPATCH + sign-up wiring.
 *
 * TaskDetail.tsx selects the archetype with two `pickVariant` calls (mobile vs.
 * desktop registry). This test asserts that selection directly:
 *   · mobile + the pilot faction (everymen) → its bespoke mobile skin;
 *   · mobile + any other slug (incl. null) → the Default mobile skin;
 *   · desktop → the existing desktop archetype, never the mobile skin.
 *
 * It also guards that the mobile skins keep routing sign-up through the injected
 * `handleSignup` (the useTaskDetail handler that createPraxis → navigates to
 * `/praxes/:id/edit`). The node test env has no DOM, so we build each skin's
 * element tree directly (react-i18next stubbed to a plain t) and walk it for the
 * sign-up button, asserting its onClick is exactly that handler.
 */
import type { ReactElement } from "react";
import { describe, it, expect, vi } from "vitest";

// Stub only the i18n hook so the skins can be invoked as plain functions (no
// React renderer / hook dispatcher) when we walk their element trees below.
// The rest of react-i18next (initReactI18next, used by ../../../i18n) is real.
vi.mock("react-i18next", async (importActual) => {
  const actual = await importActual<typeof import("react-i18next")>();
  return { ...actual, useTranslation: () => ({ t: (key: string) => key }) };
});
// factionName/factionCssVar read the raw i18n instance, not the hook — init it.
import "../../../i18n";

import { MOBILE_ARCHETYPE_BY_SLUG, ARCHETYPE_BY_SLUG } from "../../TaskDetail";
import { pickVariant } from "../../../utils/factionDispatch";
import DefaultMobileTaskDetail from "../mobileArchetypes/DefaultTaskDetail";
import EverymenMobileTaskDetail from "../mobileArchetypes/EverymenTaskDetail";
import DefaultDesktopTaskDetail from "../archetypes/DefaultTaskDetail";
import EverymenDesktopTaskDetail from "../archetypes/EverymenTaskDetail";
import type { TaskDetailState } from "../useTaskDetail";
import type { TaskOut } from "../../../api/tasks";

const TASK: TaskOut = {
  id: 7,
  title: "Reforestation",
  description: "Mangrove",
  point_value: 30,
  level_required: 3,
  status: "active",
  task_type: "standard",
  created_by: 3,
  primary_faction_slug: "everymen",
  metatask_faction_slug: null,
  is_task_vision_eligible: false,
  created_at: "2026-01-01T00:00:00Z",
  can_submit_praxis: true,
  allowed_modes: ["solo"],
  eligible_for_current_user: true,
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
    canSignUp: true,
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

// Depth-first search for the element whose onClick is the given handler.
function findOnClick(
  node: unknown,
  handler: () => void,
): ((...args: unknown[]) => void) | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = findOnClick(child, handler);
      if (hit) return hit;
    }
    return null;
  }
  const props = (node as ReactElement).props as
    | { onClick?: (...args: unknown[]) => void; children?: unknown }
    | undefined;
  if (props?.onClick === handler) return props.onClick;
  return props ? findOnClick(props.children, handler) : null;
}

describe("mobile task-detail dispatch", () => {
  it("mobile + the pilot faction resolves to the bespoke Everymen skin", () => {
    expect(
      pickVariant(MOBILE_ARCHETYPE_BY_SLUG, "everymen", DefaultMobileTaskDetail),
    ).toBe(EverymenMobileTaskDetail);
  });

  it("mobile + any other slug falls through to the Default mobile skin", () => {
    for (const slug of ["snide", "singularity", "na", null]) {
      expect(
        pickVariant(MOBILE_ARCHETYPE_BY_SLUG, slug, DefaultMobileTaskDetail),
      ).toBe(DefaultMobileTaskDetail);
    }
  });

  it("desktop keeps its own archetype and never the mobile skin", () => {
    const desktop = pickVariant(
      ARCHETYPE_BY_SLUG,
      "everymen",
      DefaultDesktopTaskDetail,
    );
    expect(desktop).toBe(EverymenDesktopTaskDetail);
    expect(desktop).not.toBe(EverymenMobileTaskDetail);
  });
});

describe("mobile sign-up wires to the edit-praxis handler", () => {
  for (const [label, Skin] of [
    ["Default", DefaultMobileTaskDetail],
    ["Everymen", EverymenMobileTaskDetail],
  ] as const) {
    it(`${label} sign-up button calls handleSignup`, () => {
      const handleSignup = vi.fn();
      const tree = Skin({ state: baseState({ canSignUp: true, handleSignup }) });
      const onClick = findOnClick(tree, handleSignup);
      expect(onClick, "sign-up onClick wired to handleSignup").toBe(handleSignup);
      onClick?.();
      expect(handleSignup).toHaveBeenCalledTimes(1);
    });
  }
});

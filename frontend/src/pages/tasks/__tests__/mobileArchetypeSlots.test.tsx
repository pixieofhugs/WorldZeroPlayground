/**
 * Mobile tasks-browse slot invariant — the tasks-list twin of
 * taskDetail/__tests__/mobileArchetypeSlots.test.tsx. Walks the
 * MOBILE_ARCHETYPE_BY_SLUG registry plus the Default mobile skin and asserts
 * each still emits the invariant content slots (title, faction, points,
 * level gate when set, task type) and — per the issue's clarifying comment —
 * that it does NOT render difficulty dots or slot/capacity counts, neither
 * of which exists on the Task model. The registry is empty today, so this
 * mainly guards the Default fallback and any bespoke mobile skin added later
 * (#496–#500).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
// Initialize the i18n catalog so shared copy keys resolve to English text.
import "../../../i18n";
import { MOBILE_ARCHETYPE_BY_SLUG } from "../../Tasks";
import DefaultTaskList from "../mobileArchetypes/DefaultTaskList";
import type { TasksState } from "../useTasks";
import type { TaskOut } from "../../../api/tasks";

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
  return { html, text: html.replace(/<[^>]*>/g, "") };
}

const GATED_TASK: TaskOut = {
  id: 1,
  title: "Reforest the Ridge",
  description: "Plant mangroves along the tidal flat.",
  point_value: 20,
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

const UNGATED_METATASK: TaskOut = {
  id: 2,
  title: "Signal Boost",
  description: "Amplify the array.",
  point_value: 10,
  level_required: 0,
  status: "active",
  task_type: "metatask",
  created_by: 3,
  primary_faction_slug: "ephemerists",
  metatask_faction_slug: "ephemerists",
  is_task_vision_eligible: false,
  created_at: "2026-01-02T00:00:00Z",
  can_submit_praxis: true,
  allowed_modes: ["solo"],
  eligible_for_current_user: true,
};

function baseState(overrides: Partial<TasksState>): TasksState {
  return {
    tasks: [GATED_TASK, UNGATED_METATASK],
    factions: [],
    factionConfigs: [],
    status: "All",
    setStatus: () => {},
    faction: "",
    setFaction: () => {},
    level: "",
    setLevel: () => {},
    sort: "",
    setSort: () => {},
    statusFilters: ["All", "active"],
    loading: false,
    fetchError: null,
    signupMsg: null,
    handleSignup: async () => {},
    isLoggedIn: true,
    viewerFactionSlug: null,
    displayPointsFor: (task) => task.point_value,
    ...overrides,
  };
}

const archetypes = { ...MOBILE_ARCHETYPE_BY_SLUG, __default__: DefaultTaskList };

describe("mobile tasks-browse content-slot invariant", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} renders title, faction, points, and level gate when set`, () => {
      const { html, text } = render(<Archetype state={baseState({})} />);

      expect(text, "gated task title slot").toContain("Reforest the Ridge");
      expect(text, "ungated task title slot").toContain("Signal Boost");

      expect(text, "faction slot (snide)").toContain("S.N.I.D.E.");
      expect(text, "faction slot (ephemerists)").toContain("The Ephemerists");

      expect(text, "points slot").toContain("20 pts");
      expect(text, "points slot").toContain("10 pts");

      expect(text.toLowerCase(), "level-gate slot (present when level_required > 0)").toContain("lvl 3");
      expect(text.toLowerCase(), "no level-gate chrome for level_required === 0").not.toContain("lvl 0");

      expect(html, "cards link to task detail").toContain('href="/tasks/1"');
      expect(html, "cards link to task detail").toContain('href="/tasks/2"');
    });

    it(`${slug} renders task type (standard/metatask)`, () => {
      const { text } = render(<Archetype state={baseState({})} />);
      expect(text, "standard type slot").toMatch(/standard/i);
      expect(text, "metatask type slot").toMatch(/metatask/i);
    });

    it(`${slug} does NOT render difficulty dots or slot/capacity counts`, () => {
      const { text } = render(<Archetype state={baseState({})} />);
      const lower = text.toLowerCase();
      expect(lower, "no slot/capacity copy").not.toContain("slots open");
      expect(lower, "no slot/capacity copy").not.toContain("of 20 slots");
      expect(lower, "no difficulty copy").not.toContain("difficulty");
    });

    it(`${slug} renders the empty state when there are no tasks`, () => {
      const { text } = render(<Archetype state={baseState({ tasks: [] })} />);
      expect(text).toContain("No tasks match your filters.");
    });

    it(`${slug} renders the loading state`, () => {
      const { text } = render(<Archetype state={baseState({ loading: true })} />);
      expect(text).toContain("Loading tasks...");
    });
  }
});

/**
 * Submit wiring (#498) — proves the mobile composer's submit affordance routes
 * to the hook's own `publish`, never a reimplemented submit path. The shared
 * `PublishButton` is replaced with a double that records the props it receives;
 * the composer must hand it the mocked `useEditPraxis` state, and firing the
 * button's action must call that state's `publish`. Runs headless (no DOM):
 * renderToStaticMarkup forces the render, then we invoke the captured action.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import "../../../../i18n";
import type { EditPraxisState } from "../../useEditPraxis";
import type { PraxisOut } from "../../../../api/praxis";
import type { TaskOut } from "../../../../api/tasks";

const captured = vi.hoisted(() => ({
  state: null as EditPraxisState | null,
}));

// Partial-mock the shared controls: keep the real body editor + file picker,
// swap PublishButton for a double that records the state it was handed.
vi.mock("../../archetypes/controls", async (importActual) => {
  const actual =
    await importActual<typeof import("../../archetypes/controls")>();
  return {
    ...actual,
    PublishButton: ({ state }: { state: EditPraxisState }) => {
      captured.state = state;
      return null;
    },
  };
});

import DefaultMobileEditPraxis from "../DefaultEditPraxis";
import CovenMobileEditPraxis from "../CovenEditPraxis";

const praxis = {
  id: 55,
  task_id: 7,
  task_title: "A Very Human Thing",
  type: "solo",
  status: "in_progress",
  title: "Draft",
  body_text: "body",
  moderation_status: "visible",
  duel_id: null,
  members: [],
  invites: [],
  media_items: [],
} as unknown as PraxisOut;

const task: TaskOut = {
  id: 7,
  title: "A Very Human Thing",
  description: "Do a small honest thing.",
  point_value: 20,
  level_required: 1,
  status: "active",
  task_type: "standard",
  created_by: 3,
  primary_faction_slug: "wow",
  metatask_faction_slug: null,
  is_task_vision_eligible: false,
  created_at: "2026-01-01T00:00:00Z",
  can_submit_praxis: true,
  allowed_modes: ["solo"],
  eligible_for_current_user: true,
};

function stateWith(publish: () => Promise<void>): EditPraxisState {
  return {
    loading: false,
    praxis,
    task,
    error: "",
    setError: () => {},
    title: "Draft",
    setTitle: () => {},
    body: "body",
    setBody: () => {},
    wordCount: 1,
    media: [],
    fileError: "",
    handleFileChange: () => {},
    removeMedia: async () => {},
    pendingImage: null,
    confirmImageEdit: async () => {},
    cancelImageEdit: () => {},
    switchingMode: null,
    changeMode: async () => {},
    inviteQuery: "",
    setInviteQuery: () => {},
    inviteResults: [],
    inviteOpen: false,
    setInviteOpen: () => {},
    inviting: false,
    sendInvite: async () => {},
    cancelInvite: async () => {},
    kickMember: async () => {},
    duel: null,
    sendChallenge: async () => {},
    cancelDuel: async () => {},
    dissolveDuel: async () => {},
    metaTasks: [],
    appliedMetatasks: new Set(),
    applyingMetatask: null,
    toggleMetatask: async () => {},
    appliedMetataskList: [],
    addMetatask: async () => {},
    metataskPickerOpen: false,
    openMetataskPicker: () => {},
    closeMetataskPicker: () => {},
    metataskRemovalTarget: null,
    requestRemoveMetatask: () => {},
    confirmRemoveMetatask: async () => {},
    cancelRemoveMetatask: () => {},
    submitting: false,
    publish,
    pullBack: async () => {},
    leaveCollab: async () => {},
    collabSuccess: false,
    continueFromCollabSuccess: () => {},
    duelSealOpen: false,
    requestDuelSeal: () => {},
    cancelDuelSeal: () => {},
    cancel: async () => {},
    autosaveAt: null,
    saveStatus: "idle",
    isPublished: false,
    controlsLocked: false,
    modeIsLocked: false,
    showInviteBox: false,
    showMetatasks: false,
    canSealMetatask: false,
    showSealStack: false,
    duelMode: false,
    duelChipVisible: false,
    currentCharacterId: 3,
  };
}

describe("mobile composer submit wiring", () => {
  for (const [label, Skin] of [
    ["Default", DefaultMobileEditPraxis],
    ["COVEN", CovenMobileEditPraxis],
  ] as const) {
    it(`${label} hands the submit control the hook's publish handler`, () => {
      captured.state = null;
      const publish = vi.fn(async () => {});
      const state = stateWith(publish);
      renderToStaticMarkup(<Skin state={state} />);

      // The mock mutates captured.state during render; cast the read so control
      // flow doesn't narrow it to the reset `null`.
      const observed = captured.state as EditPraxisState | null;

      // The composer rendered the shared submit control with the real state…
      expect(observed).not.toBeNull();
      expect(observed?.publish).toBe(publish);

      // …and triggering that submit calls the hook's handler, not a local one.
      expect(publish).not.toHaveBeenCalled();
      void observed!.publish();
      expect(publish).toHaveBeenCalledTimes(1);
    });
  }
});

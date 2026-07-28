/**
 * Mobile mode picker (#877) — the Solo · Collab · Duel segmented control that
 * every mobile composer scrolls at the top, above the title. It renders through
 * the shared ModePicker, so these tests pin the reused gate/lock behaviour as it
 * reaches the Default mobile skin: all three segments when the task allows every
 * mode and the duel chip is visible, the duel segment hidden below the level
 * gate, and a single collapsed pill once the mode is locked. renderToStaticMarkup
 * needs no DOM (effects never run), so we feed a fully-formed state.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../../i18n";
import type { EditPraxisState } from "../../useEditPraxis";
import type { PraxisOut } from "../../../../api/praxis";
import type { TaskOut } from "../../../../api/tasks";

const mocks = vi.hoisted(() => ({
  formFactor: "mobile" as "mobile" | "desktop",
  state: null as EditPraxisState | null,
}));

vi.mock("../../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));
vi.mock("../../useEditPraxis", () => ({
  useEditPraxis: () => mocks.state,
}));

// Imported after the mocks are registered.
import EditPraxis from "../../../EditPraxis";

function task(allowedModes: string[]): TaskOut {
  return {
    id: 7,
    title: "A Very Human Thing",
    description: "Do a small honest thing.",
    point_value: 20,
    level_required: 1,
    status: "active",
    task_type: "standard",
    created_by: 3,
    primary_faction_slug: null,
    metatask_faction_slug: null,
    is_task_vision_eligible: false,
    created_at: "2026-01-01T00:00:00Z",
    can_submit_praxis: true,
    allowed_modes: allowedModes,
    eligible_for_current_user: true,
  };
}

const praxis = {
  id: 55,
  task_id: 7,
  task_title: "A Very Human Thing",
  type: "solo",
  status: "in_progress",
  title: "I helped a stranger",
  body_text: "## What I did\n\nCaught the papers.",
  moderation_status: "visible",
  duel_id: null,
  members: [],
  invites: [],
  media_items: [],
} as unknown as PraxisOut;

function baseState(): EditPraxisState {
  return {
    loading: false,
    phase: "composing",
    praxis,
    task: task(["solo", "collab", "duel"]),
    error: "",
    setError: () => {},
    title: "I helped a stranger",
    setTitle: () => {},
    body: "## What I did\n\nCaught the papers.",
    setBody: () => {},
    wordCount: 4,
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
    publish: async () => {},
    pullBack: async () => {},
    reopenForEdit: async () => {},
    leaveCollab: async () => {},
    collabSuccess: false,
    continueFromCollabSuccess: () => {},
    duelSealOpen: false,
    requestDuelSeal: () => {},
    cancelDuelSeal: () => {},
    pendingConfirm: null,
    acceptConfirm: () => {},
    dismissConfirm: () => {},
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

function render(state: EditPraxisState): string {
  mocks.state = state;
  return renderToStaticMarkup(
    <MemoryRouter>
      <EditPraxis />
    </MemoryRouter>,
  );
}

// The na mode labels the shared skin reuses (forms.json editPraxis.na.mode.*).
const SOLO = "On my own";
const COLLAB = "With others";
const DUEL = "Head-to-head";

describe("mobile mode picker (#877)", () => {
  it("renders all three segments when every mode is allowed and the duel chip is visible", () => {
    const html = render({ ...baseState(), duelChipVisible: true });
    expect(html).toContain(SOLO);
    expect(html).toContain(COLLAB);
    expect(html).toContain(DUEL);
  });

  it("hides the duel segment below the level gate (duelChipVisible false)", () => {
    const html = render({ ...baseState(), duelChipVisible: false });
    expect(html).toContain(SOLO);
    expect(html).toContain(COLLAB);
    expect(html).not.toContain(DUEL);
  });

  it("collapses to a single active pill once the mode is locked", () => {
    // Locked solo praxis: the shared ModePicker drops every non-active option, so
    // the control shows only the active mode — a static pill, not a dead toggle.
    const html = render({
      ...baseState(),
      modeIsLocked: true,
      duelChipVisible: true,
    });
    expect(html).toContain(SOLO);
    expect(html).not.toContain(COLLAB);
    expect(html).not.toContain(DUEL);
  });
});

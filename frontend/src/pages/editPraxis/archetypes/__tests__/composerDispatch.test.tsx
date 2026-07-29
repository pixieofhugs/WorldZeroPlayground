/**
 * Composer dispatch and the mode picker, at BOTH form factors (#1181).
 *
 * Successor to `mobileArchetypes/__tests__/dispatch.test.tsx` and
 * `modePicker.test.tsx`, which went with the `mobileEditPraxis` surface ADR-0065
 * retired. Those two proved the form-factor BRANCH (phone → the mobile twin,
 * desktop → the archetype) and the mode gates as they reached the phone skin.
 * There is no branch left to prove, so what replaces them is the claim the
 * collapse actually makes: **the same archetype answers at both widths, and the
 * shared ModePicker's gates behave identically there.**
 *
 * Rendered through `<EditPraxis />` rather than the archetype directly, so the
 * dispatcher is in the path — a regression that re-introduced a form-factor
 * branch, or dropped `editPraxis` from the surface map, fails here.
 *
 * The gates themselves are `controls.tsx`'s and are not re-derived per skin:
 * the duel chip hides below the level gate (#311, hide-don't-disable), and a
 * locked mode collapses to the single active option instead of a dead toggle.
 *
 * renderToStaticMarkup needs no DOM, matching the rest of this suite.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../../i18n";
import i18n from "../../../../i18n";
import type { EditPraxisState } from "../../useEditPraxis";
import type { PraxisOut } from "../../../../api/praxis";
import type { TaskOut } from "../../../../api/tasks";

const mocks = vi.hoisted(() => ({
  formFactor: "desktop" as "mobile" | "desktop",
  state: null as EditPraxisState | null,
}));

vi.mock("../../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));
// Partial: `isWaitingStage` stays REAL. It is the predicate every archetype
// asks before swapping in the waiting surface (#1189), and a stubbed one would
// let the dispatcher assertions below pass against a stage that never happens.
vi.mock("../../useEditPraxis", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../useEditPraxis")>()),
  useEditPraxis: () => mocks.state,
}));

// Imported after the mocks are registered.
import EditPraxis from "../../../EditPraxis";
import DefaultEditPraxis from "../DefaultEditPraxis";
import { surfaceMap } from "../../../../factions";
import { pickVariant } from "../../../../utils/factionDispatch";
import { resolvedArchetype } from "../../../../factions/lazyArchetype";

const SOLO = i18n.t("forms:editPraxis.composer.modeSolo");
const COLLAB = i18n.t("forms:editPraxis.composer.modeCollab");
const DUEL = i18n.t("forms:editPraxis.composer.modeDuel");

function task(allowedModes: string[], slug: string | null = null): TaskOut {
  return {
    id: 7,
    title: "A Very Human Thing",
    description: "Do a small honest thing.",
    point_value: 20,
    level_required: 1,
    status: "active",
    task_type: "standard",
    created_by: 3,
    primary_faction_slug: slug,
    metatask_faction_slug: null,
    is_task_vision_eligible: false,
    created_at: "2026-01-01T00:00:00Z",
    can_submit_praxis: true,
    allowed_modes: allowedModes,
    eligible_for_current_user: true,
  } as unknown as TaskOut;
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

function baseState(overrides: Partial<EditPraxisState> = {}): EditPraxisState {
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
    nudge: async () => {},
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
    saveDraft: async () => {},
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
    autoSubmitDays: 10,
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
    ...overrides,
  } as unknown as EditPraxisState;
}

function render(
  formFactor: "mobile" | "desktop",
  state: EditPraxisState,
): string {
  mocks.formFactor = formFactor;
  mocks.state = state;
  return renderToStaticMarkup(
    <MemoryRouter>
      <EditPraxis />
    </MemoryRouter>,
  );
}

/** Segment buttons carry `aria-pressed`; counting them beats substring matching. */
function segmentCount(markup: string): number {
  return (markup.match(/aria-pressed=/g) ?? []).length;
}

const WIDTHS = ["desktop", "mobile"] as const;

describe("editPraxis dispatch (ADR-0065: one component, both widths)", () => {
  it("registers no mobile twin surface — the map is gone, not empty", () => {
    // `surfaceMap` is typed against SURFACE_KEYS, so the retired key is not even
    // nameable here; this asserts the surviving surface still resolves.
    expect(
      resolvedArchetype(pickVariant(surfaceMap("editPraxis"), null, DefaultEditPraxis)),
    ).toBe(DefaultEditPraxis);
  });

  it.each(["__unregistered__", "na", "albescent", null])(
    "falls %s through to DefaultEditPraxis (ADR-0065 §4)",
    (slug) => {
      expect(
        resolvedArchetype(pickVariant(surfaceMap("editPraxis"), slug, DefaultEditPraxis)),
      ).toBe(DefaultEditPraxis);
    },
  );

  it.each(WIDTHS)("renders the composer's own regions on %s", (width) => {
    const markup = render(width, baseState());
    expect(markup).toContain(i18n.t("forms:editPraxis.composer.taskLabel"));
    expect(markup).toContain(i18n.t("forms:editPraxis.composer.titleLabel"));
    expect(markup).toContain(i18n.t("forms:editPraxis.composer.writeUpLabel"));
    expect(markup).toContain(i18n.t("forms:editPraxis.composer.proofLabel"));
    expect(markup).toContain(i18n.t("forms:editPraxis.composer.submit"));
  });

  it.each(WIDTHS)("draws exactly one breadcrumb on %s", (width) => {
    // The dispatcher's shared breadcrumb is now gated to the waiting surface
    // alone; the archetype paints its own at both widths. Before #1181 the gate
    // also fired on mobile, which would put two here.
    const markup = render(width, baseState());
    expect((markup.match(/<nav/g) ?? []).length).toBe(1);
  });
});

describe("mode picker gates, unchanged by the collapse (#311, #877)", () => {
  it.each(WIDTHS)("shows all three segments on %s when the duel chip is visible", (width) => {
    const markup = render(width, baseState({ duelChipVisible: true }));
    expect(segmentCount(markup)).toBe(3);
    expect(markup).toContain(SOLO);
    expect(markup).toContain(COLLAB);
    expect(markup).toContain(DUEL);
  });

  it.each(WIDTHS)("hides the duel segment on %s below the level gate", (width) => {
    const markup = render(width, baseState({ duelChipVisible: false }));
    expect(segmentCount(markup)).toBe(2);
    expect(markup).not.toContain(DUEL);
  });

  it.each(WIDTHS)("collapses to the single active option on %s once locked", (width) => {
    const markup = render(
      width,
      baseState({ modeIsLocked: true, duelChipVisible: true }),
    );
    expect(segmentCount(markup)).toBe(1);
    expect(markup).toContain(SOLO);
    expect(markup).not.toContain(COLLAB);
  });
});

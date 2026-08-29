/**
 * The task slip's title is a link, on every surface that draws a slip (#1705).
 *
 * The seam is `TaskSlip`'s rendered markup, reached through each archetype
 * rather than by calling the component directly — the slip is dressed per
 * faction (ADR-0065) and the thing that can regress is not "does the shared
 * component emit an anchor" but "does a skin's `titleStyle` end up on the
 * anchor's box, or get swallowed by it". Rendering per slug is what makes that
 * observable.
 *
 * Both stages count: `composing` covers the eight composers, `waiting` covers
 * `PraxisWaitingSurface`, which is the ninth caller of the same slip.
 *
 * renderToStaticMarkup needs no DOM, matching the rest of this suite.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../../i18n";
import type { EditPraxisState } from "../../useEditPraxis";
import type { PraxisOut } from "../../../../api/praxis";
import type { TaskOut } from "../../../../api/tasks";

vi.mock("../../../../hooks/useFormFactor", () => ({
  useFormFactor: () => "desktop",
}));

import { surfaceMap } from "../../../../factions";
import { resolveVariant } from "../../../../utils/factionDispatch";
import { resolvedArchetype } from "../../../../factions/lazyArchetype";

const TASK_ID = 7;
const TASK_TITLE = "A Very Human Thing";
const SUBMITTED = "2026-02-01T00:00:00Z";

function task(slug: string | null): TaskOut {
  return {
    id: TASK_ID,
    title: TASK_TITLE,
    description: "Do a small honest thing.",
    point_value: 20,
    level_required: 1,
    status: "active",
    task_type: "standard",
    created_by: 3,
    primary_faction_slug: slug,
    metatask_faction_slug: null,
    created_at: "2026-01-01T00:00:00Z",
    can_sign_up: true,
    allowed_modes: ["solo", "collab", "duel"],
    eligible_for_current_user: true,
  } as unknown as TaskOut;
}

function praxis(slug: string | null): PraxisOut {
  return {
    id: 55,
    task_id: TASK_ID,
    task_title: TASK_TITLE,
    task_faction_slug: slug,
    task_point_value: 20,
    type: "solo",
    status: "in_progress",
    title: "I helped a stranger",
    body_text: "## What I did\n\nCaught the papers.",
    moderation_status: "visible",
    duel_id: null,
    created_by_id: 3,
    submitted_at: SUBMITTED,
    updated_at: SUBMITTED,
    submit_proposed_at: SUBMITTED,
    score: 20,
    metatask_points: 0,
    display_multiplier: 1,
    points_from_votes: 0,
    members: [],
    invites: [],
    media_items: [],
  } as unknown as PraxisOut;
}

function state(slug: string | null, phase: "composing" | "waiting"): EditPraxisState {
  return {
    loading: false,
    phase,
    praxis: praxis(slug),
    task: task(slug),
    error: "",
    setError: () => {},
    title: "I helped a stranger",
    setTitle: () => {},
    body: "## What I did",
    setBody: () => {},
    media: [],
    fileError: "",
    handleFileChange: () => {},
    removeMedia: async () => {},
    pendingImage: null,
    confirmImageEdit: async () => {},
    cancelImageEdit: () => {},
    reportImageError: () => {},
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
    metatasks: [],
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
    setAutosaveAt: () => {},
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
  } as unknown as EditPraxisState;
}

function render(slug: string | null, phase: "composing" | "waiting"): string {
  const Archetype = resolvedArchetype(
    resolveVariant(surfaceMap("editPraxis"), slug),
  )!;
  return renderToStaticMarkup(
    <MemoryRouter>
      <Archetype state={state(slug, phase)} />
    </MemoryRouter>,
  );
}

/**
 * The slip's title box and the anchor inside it, as one match.
 *
 * The breadcrumb links the same task with the same text, so a bare
 * `href="/tasks/7"` search would pass on a slip that never changed. What
 * distinguishes the slip is that its anchor is wrapped in the box carrying the
 * skin's dress — which is also exactly the thing the fix must not swallow.
 */
const SLIP_TITLE = new RegExp(
  `<div style="([^"]*)">(<a [^>]*>)${TASK_TITLE}</a></div>`,
);

/**
 * Every slug the `editPraxis` surface dispatches to, plus `null`.
 *
 * Derived from the registry rather than typed (#2815): all nine kits register
 * a composer, so a tenth is covered here by existing. `null` is prepended
 * because it is not a slug — it is the viewer whose character has no faction,
 * a distinct input `resolveVariant` sends to the na kit (ADR-0065 §4), and
 * nothing in the map stands in for it.
 */
const SLUGS: (string | null)[] = [
  null,
  ...Object.keys(surfaceMap("editPraxis")),
];

const STAGES = ["composing", "waiting"] as const;

describe.each(STAGES)("the slip title links its task while %s (#1705)", (phase) => {
  it.each(SLUGS)("%s", (slug) => {
    const match = render(slug, phase).match(SLIP_TITLE);
    expect(match).not.toBeNull();
    const [, boxStyle, anchor] = match!;
    // It goes where the breadcrumb goes.
    expect(anchor).toContain(`href="/tasks/${TASK_ID}"`);
    // It reads as clickable.
    expect(anchor).toContain("hover:underline");
    // The skin's dress stayed on the box; the anchor only inherits it.
    expect(boxStyle).toContain("font-size:var(--text-content)");
    expect(anchor).toContain("color:inherit");
  });
});

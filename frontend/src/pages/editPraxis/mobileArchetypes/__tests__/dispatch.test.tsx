/**
 * Edit-praxis form-factor dispatch (#498) — the composer twin of the TaskDetail
 * / FieldDesk mobile-dispatch seams. Renders <EditPraxis /> with useFormFactor
 * mocked and useEditPraxis stubbed, and pins:
 *   - phone + the WOW pilot → its bespoke mobile composer (data-skin="wow"),
 *   - phone + an unregistered faction → the Default mobile composer,
 *   - desktop → the existing desktop archetype (skin dispatch untouched).
 * It also asserts each mobile skin surfaces the body editor, media-add, and
 * submit slots from the mocked state. renderToStaticMarkup needs no DOM.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../../i18n";
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
vi.mock("../../useEditPraxis", () => ({
  useEditPraxis: () => mocks.state,
}));

// Imported after the mocks are registered.
import EditPraxis from "../../../EditPraxis";

function task(slug: string | null): TaskOut {
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
    allowed_modes: ["solo"],
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

function baseState(slug: string | null): EditPraxisState {
  return {
    loading: false,
    praxis,
    task: task(slug),
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
    duel: null,
    sendChallenge: async () => {},
    cancelDuel: async () => {},
    metaTasks: [],
    appliedMetatasks: new Set(),
    applyingMetatask: null,
    toggleMetatask: async () => {},
    submitting: false,
    publish: async () => {},
    cancel: async () => {},
    autosaveAt: null,
    saveStatus: "idle",
    isPublished: false,
    controlsLocked: false,
    modeIsLocked: false,
    showInviteBox: false,
    showMetatasks: false,
    duelMode: false,
    duelChipVisible: false,
    currentCharacterId: 3,
  };
}

function render(slug: string | null): string {
  mocks.state = baseState(slug);
  return renderToStaticMarkup(
    <MemoryRouter>
      <EditPraxis />
    </MemoryRouter>,
  );
}

describe("edit-praxis form-factor dispatch", () => {
  it("renders the WOW bespoke composer on mobile for a WOW task", () => {
    mocks.formFactor = "mobile";
    expect(render("wow")).toContain('data-skin="wow"');
  });

  it("renders the SNIDE bespoke composer on mobile for a SNIDE task", () => {
    mocks.formFactor = "mobile";
    expect(render("snide")).toContain('data-skin="snide"');
  });

  it("falls through to the Default mobile composer for an unregistered faction", () => {
    mocks.formFactor = "mobile";
    const html = render("na");
    expect(html).toContain('data-skin="default"');
    expect(html).not.toContain('data-skin="wow"');
  });

  it("renders the desktop archetype on desktop (skin dispatch untouched)", () => {
    mocks.formFactor = "desktop";
    const html = render("wow");
    expect(html).not.toContain("data-skin=");
    // wow.exe desktop window chrome, not the mobile skin.
    expect(html).toContain("wow.exe");
  });
});

describe("mobile composer content slots", () => {
  for (const [label, slug] of [
    ["Default", "na"],
    ["WOW", "wow"],
    ["SNIDE", "snide"],
  ] as const) {
    it(`${label} mobile composer renders body editor + media-add + submit`, () => {
      mocks.formFactor = "mobile";
      const html = render(slug);
      expect(html, "body editor slot").toContain("<textarea");
      expect(html, "media-add slot").toContain('type="file"');
      // Submit affordance: the faction-voiced publish label from the mocked state.
      const text = html.replace(/<[^>]*>/g, "").toLowerCase();
      expect(text, "submit slot").toMatch(/tack it up|cast it into the world|file it &amp; run/);
    });
  }
});

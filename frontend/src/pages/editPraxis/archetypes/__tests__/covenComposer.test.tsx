/**
 * Cozy Coven's composer, rebuilt to the v2 design (#1188, epic #1179).
 *
 * Two claims, both regressions this issue is the fix for.
 *
 * 1. **The `wow.exe` caption is gone.** The file this replaces drew a literal
 *    desktop-window caption reading `wow.exe` — a chrome string left from before
 *    #784 split Coven off Warriors of Whimsy (ADR-0050). It was never a slug and
 *    never a dispatch bug, which is exactly why nothing failed while it shipped:
 *    the only check that can see a wrong WORD is one that looks for it.
 *
 * 2. **The page speaks the neutral composer set** (ADR-0065 §3) and carries no
 *    Coven page copy of its own — asserted at the catalog as well as at the
 *    render, because a deleted key that some other archetype still reads is a
 *    compile error, while a key left behind that nobody reads is silent.
 *
 * `editPraxis.coven.collab` used to be exempt — it was `collabCopy`'s override
 * table rather than page copy, so #1188 kept it. #1812 then deleted it too, for
 * a different reason: collab submission status is a mechanical fact and speaks
 * one vocabulary on every faction. So `editPraxis.coven` is now gone entirely,
 * and `collabCopy.test.ts` pins that from the other side.
 *
 * renderToStaticMarkup needs no DOM, matching the rest of this suite. Effects
 * never run, so nothing here can assert on state that arrives after mount.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../../i18n";
import i18n from "../../../../i18n";
import forms from "../../../../locales/en/forms.json";
import type { EditPraxisState } from "../../useEditPraxis";
import type { PraxisOut } from "../../../../api/praxis";
import type { TaskOut } from "../../../../api/tasks";

const mocks = vi.hoisted(() => ({ formFactor: "desktop" as "mobile" | "desktop" }));
vi.mock("../../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));

import CovenEditPraxis from "../CovenEditPraxis";

const task = {
  id: 7,
  title: "Bless the work",
  description: "Do a small honest thing.",
  point_value: 20,
  level_required: 1,
  status: "active",
  task_type: "standard",
  primary_faction_slug: "coven",
  allowed_modes: ["solo", "collab", "duel"],
} as unknown as TaskOut;

const praxis = {
  id: 55,
  task_id: 7,
  task_title: "Bless the work",
  task_faction_slug: "coven",
  type: "solo",
  status: "in_progress",
  title: "I helped a stranger",
  body_text: "## What I did\n\nCaught the papers.",
  moderation_status: "visible",
  duel_id: null,
  created_by_id: 3,
  members: [],
  invites: [],
  media_items: [],
} as unknown as PraxisOut;

function baseState(overrides: Partial<EditPraxisState> = {}): EditPraxisState {
  return {
    loading: false,
    phase: "composing",
    praxis,
    task,
    error: "",
    title: praxis.title,
    setTitle: () => {},
    body: "Caught the papers.",
    setBody: () => {},
    wordCount: 3,
    media: [],
    fileError: "",
    handleFileChange: () => {},
    removeMedia: async () => {},
    switchingMode: null,
    changeMode: async () => {},
    inviteQuery: "",
    setInviteQuery: () => {},
    inviteResults: [],
    inviteOpen: false,
    setInviteOpen: () => {},
    inviting: false,
    submitting: false,
    publish: async () => {},
    saveDraft: async () => {},
    pullBack: async () => {},
    cancel: async () => {},
    autosaveAt: null,
    autoSubmitDays: 10,
    isPublished: false,
    controlsLocked: false,
    modeIsLocked: false,
    showInviteBox: false,
    showSealStack: false,
    duelMode: false,
    duelChipVisible: true,
    currentCharacterId: 3,
    ...overrides,
  } as unknown as EditPraxisState;
}

function render(
  formFactor: "mobile" | "desktop",
  state: EditPraxisState = baseState(),
): string {
  mocks.formFactor = formFactor;
  return renderToStaticMarkup(
    <MemoryRouter>
      <CovenEditPraxis state={state} />
    </MemoryRouter>,
  );
}

const WIDTHS = ["desktop", "mobile"] as const;

describe("Coven composer — the window is gone (ADR-0050, #1188)", () => {
  it.each(WIDTHS)("draws no wow.exe caption on %s", (width) => {
    expect(render(width)).not.toContain("wow.exe");
  });

  it("keeps no editPraxis copy of its own at all (#1188, then #1812)", () => {
    expect(forms.editPraxis).not.toHaveProperty("coven");
  });

  it.each(WIDTHS)("letters the coven's own wordmark on %s", (width) => {
    // Read from `feed`, where the v2 task card already owns it — the composer
    // introduces no faction copy key of its own.
    expect(render(width)).toContain(i18n.t("feed:taskCard.coven.masthead"));
  });
});

describe("Coven composer — the shared layout, neutrally worded (ADR-0065)", () => {
  // Spelled out rather than built from a `${key}` template: the catalog's keys
  // are a literal union, so a template-literal key does not typecheck — and a
  // key assembled at runtime is also invisible to the i18n sweep's grep.
  const REGIONS = [
    i18n.t("forms:editPraxis.composer.taskLabel"),
    i18n.t("forms:editPraxis.composer.titleLabel"),
    i18n.t("forms:editPraxis.composer.modeLabel"),
    i18n.t("forms:editPraxis.composer.writeUpLabel"),
    i18n.t("forms:editPraxis.composer.proofLabel"),
    i18n.t("forms:editPraxis.composer.submit"),
  ];

  it.each(WIDTHS)("draws every region on %s from the neutral set", (width) => {
    const markup = render(width);
    for (const region of REGIONS) {
      expect(markup).toContain(region);
    }
  });

  it.each(WIDTHS)("draws exactly one breadcrumb on %s", (width) => {
    expect((render(width).match(/<nav/g) ?? []).length).toBe(1);
  });

  it("hides the mode picker once the controls lock, rather than disabling it", () => {
    const markup = render("desktop", baseState({ controlsLocked: true }));
    expect(markup).not.toContain(i18n.t("forms:editPraxis.composer.modeLabel"));
  });
});

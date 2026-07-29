/**
 * S.N.I.D.E.'s composer dress (#1184, epic #1179, ADR-0065).
 *
 * The layout, the controls and the copy are shared and are proved once by
 * `composerDispatch.test.tsx`. What is only true of THIS file is the dress, and
 * three parts of it are claims a build can silently reverse:
 *
 *  1. **The copy went neutral.** The page block was deleted and the collab
 *     override table was not — two halves of one edit that a later sweep could
 *     take either too far or not far enough.
 *  2. **radius 0 / borderW 0.** SNIDE is the only skin that draws no card border
 *     at all, and both of those are overrides of a shared default, so an
 *     inherited value is the failure mode rather than a missing one.
 *  3. **The submit is a full-bleed bar.** It reaches the sheet's edges by
 *     negating the sheet's own side padding, which is form-factor dependent —
 *     the desktop rung on a phone would overhang by 16px.
 *
 * Plus the #1028 trap, asserted the way the task-detail epic learned to: the
 * faction ground belongs to the column, so nothing here may reach for the
 * viewport.
 *
 * renderToStaticMarkup, no DOM, matching the rest of this suite.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../../i18n";
import i18n from "../../../../i18n";
import type { EditPraxisState } from "../../useEditPraxis";
import type { PraxisOut } from "../../../../api/praxis";
import type { TaskOut } from "../../../../api/tasks";

const mocks = vi.hoisted(() => ({ formFactor: "desktop" as "mobile" | "desktop" }));

vi.mock("../../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));

// Imported after the mock is registered.
import SnideEditPraxis from "../SnideEditPraxis";

const task = {
  id: 7,
  title: "A Very Human Thing",
  description: "Do a small honest thing.",
  point_value: 20,
  level_required: 1,
  primary_faction_slug: "snide",
  allowed_modes: ["solo", "collab", "duel"],
} as unknown as TaskOut;

const praxis = {
  id: 55,
  task_id: 7,
  task_title: "A Very Human Thing",
  task_faction_slug: "snide",
  type: "solo",
  status: "in_progress",
  title: "I helped a stranger",
  body_text: "Caught the papers.",
  members: [],
  invites: [],
  media_items: [],
} as unknown as PraxisOut;

const state = {
  praxis,
  task,
  error: "",
  title: "I helped a stranger",
  setTitle: () => {},
  body: "Caught the papers.",
  setBody: () => {},
  wordCount: 3,
  media: [],
  fileError: "",
  handleFileChange: () => {},
  removeMedia: async () => {},
  inviteQuery: "",
  setInviteQuery: () => {},
  inviteResults: [],
  inviteOpen: false,
  setInviteOpen: () => {},
  submitting: false,
  switchingMode: null,
  autosaveAt: null,
  isPublished: false,
  controlsLocked: false,
  modeIsLocked: false,
  showInviteBox: false,
  showSealStack: false,
  duelMode: false,
  duelChipVisible: true,
  currentCharacterId: 3,
} as unknown as EditPraxisState;

function render(formFactor: "mobile" | "desktop"): string {
  mocks.formFactor = formFactor;
  return renderToStaticMarkup(
    <MemoryRouter>
      <SnideEditPraxis state={state} />
    </MemoryRouter>,
  );
}

const WIDTHS = ["desktop", "mobile"] as const;

describe("SNIDE composer copy is the shared neutral set (ADR-0065 §3)", () => {
  it.each(WIDTHS)("reads the composer.* keys on %s", (width) => {
    const markup = render(width);
    for (const key of ["taskLabel", "titleLabel", "writeUpLabel", "proofLabel", "submit"]) {
      expect(markup).toContain(i18n.t(`forms:editPraxis.composer.${key}`));
    }
  });

  it("deleted the faction's page copy", () => {
    for (const key of ["masthead", "publishIdle", "titleLabel", "bodyLabel", "dropLabel"]) {
      expect(i18n.exists(`forms:editPraxis.snide.${key}`)).toBe(false);
    }
  });

  it("kept editPraxis.snide.collab — collabCopy's table, not page copy", () => {
    // Also read by CollabRoster on /praxes/:id, a surface this epic is not
    // touching. `collabCopy.test.ts` is the other half of this guard.
    expect(i18n.exists("forms:editPraxis.snide.collab.castAction")).toBe(true);
    expect(i18n.exists("forms:editPraxis.snide.collab.successHeading")).toBe(true);
  });
});

describe("SNIDE's dress", () => {
  it.each(WIDTHS)("draws no card border and no radius on %s", (width) => {
    const markup = render(width);
    expect(markup).toContain("border-radius:0");
    // The shared sheet's own 10px radius, inherited instead of overridden.
    expect(markup).not.toContain("border-radius:10px");
    // The generic card edge every other skin outlines its sheet with.
    expect(markup).not.toContain("--faction-snide-border");
  });

  it.each(WIDTHS)("paints on the composer's own token family on %s", (width) => {
    const markup = render(width);
    expect(markup).toContain("--faction-snide-composer-sheet");
    expect(markup).toContain("--faction-snide-composer-grain");
    // The clipping's family belongs to the praxis card, not to this surface.
    expect(markup).not.toContain("--faction-snide-note-");
  });

  it("bleeds the submit bar to the sheet's edge at each width", () => {
    expect(render("desktop")).toContain("margin-left:calc(-1 * var(--space-2xl))");
    expect(render("mobile")).toContain("margin-left:calc(-1 * var(--space-lg))");
  });

  it.each(WIDTHS)("keeps its ground on the column, not the viewport on %s", (width) => {
    // #1028: six of eight task-detail skins painted the faction ground
    // full-bleed. `ComposerSheet` owns the clip; nothing here may opt out of it.
    const markup = render(width);
    expect(markup).not.toContain("100vh");
    expect(markup).not.toContain("position:fixed");
  });
});

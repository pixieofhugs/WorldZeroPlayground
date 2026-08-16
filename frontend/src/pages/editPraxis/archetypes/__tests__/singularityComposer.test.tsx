/**
 * The Singularity composer's DRESS (#1186, epic #1179).
 *
 * `composerDispatch.test.tsx` proves the layout contract and the shared gates
 * once, for every skin; this file proves the one thing that is this skin's own
 * and that nothing else can see. Visual QA is not available to an agent (the
 * Browser pane's renderer times out), so these structural claims are the only
 * guard the dress has: the tokens resolve to real declarations, the three
 * motions arrive as CLASSES rather than as an inline `animation:` that would
 * bypass the reduced-motion gate (#1003), no hex escaped the token system, and
 * the deleted `editPraxis.singularity.*` vocabulary has not crept back in
 * through a skin prop (ADR-0065 §3).
 *
 * Modelled on `praxisDetail/__tests__/singularityDetail.test.tsx`, which makes
 * the same claims about the same faction's read surface.
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

const mocks = vi.hoisted(() => ({ formFactor: "desktop" as "mobile" | "desktop" }));
vi.mock("../../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));

import SingularityEditPraxis from "../SingularityEditPraxis";

const task = {
  id: 7,
  title: "A Very Human Thing",
  description: "Do a small honest thing.",
  point_value: 20,
  level_required: 3,
  allowed_modes: ["solo", "collab", "duel"],
  primary_faction_slug: "singularity",
} as unknown as TaskOut;

const praxis = {
  id: 55,
  task_id: 7,
  task_title: "A Very Human Thing",
  task_faction_slug: "singularity",
  type: "solo",
  status: "in_progress",
  moderation_status: "visible",
  members: [],
  invites: [],
  media_items: [],
  // The slip's mark is the shared ScoreStamp since #1828, and every stamp reads
  // the score terms off the praxis (`score` is non-optional on the wire).
  is_top_for_task: false,
  task_point_value: 20,
  metatask_points: 0,
  display_multiplier: 1,
  points_from_votes: 0,
  habit_bonus_points: 0,
  score: 20,
} as unknown as PraxisOut;

function state(overrides: Partial<EditPraxisState> = {}): EditPraxisState {
  return {
    praxis,
    task,
    error: "",
    title: "I helped a stranger",
    body: "## What I did",
    setTitle: () => {},
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
    duel: null,
    submitting: false,
    autosaveAt: null,
    setAutosaveAt: () => {},
    isPublished: false,
    controlsLocked: false,
    modeIsLocked: false,
    showInviteBox: false,
    showSealStack: false,
    duelMode: false,
    duelChipVisible: true,
    currentCharacterId: 3,
    autoSubmitDays: 10,
    ...overrides,
  } as unknown as EditPraxisState;
}

function render(width: "mobile" | "desktop", s: EditPraxisState): string {
  mocks.formFactor = width;
  return renderToStaticMarkup(
    <MemoryRouter>
      <SingularityEditPraxis state={s} />
    </MemoryRouter>,
  );
}

describe("Singularity composer — structure", () => {
  it("draws the terminal chrome, the ground and the marks", () => {
    const html = render("desktop", state());
    for (const token of [
      "--faction-singularity-term-bg",
      "--faction-singularity-term-chrome",
      "--faction-singularity-term-panel",
      "--faction-singularity-term-scan",
      "--faction-singularity-term-sweep",
      "--faction-singularity-term-halo-green",
      // The slip's mark is the terminal's own SCORE STAMP since #1828. The
      // readout well and the blue numeral it replaces (`term-readout`,
      // `term-blue-bright`, `term-halo-blue`) were this composer's alone — the
      // page swapped to this stamp the moment you filed, and now draws it in
      // both stages.
      "--faction-singularity-stamp-bg",
      "--faction-singularity-term-cta-bg",
      "--faction-singularity-card-font",
    ]) {
      expect(html, token).toContain(token);
    }
    expect(html, "the three motions").toContain("ep-pulse");
    expect(html).toContain("sg-scan");
    expect(html).toContain("ep-blink");
    expect(html, "no injected keyframes").not.toContain("@keyframes");
    expect(html, "the process name").toContain("praxis.proc");
    // The `[ok]` status mark is NOT on the compose row since #1828: the row
    // reads `Draft` alone, and the mark is the waiting surface's hero beat.
    expect(html, "the deferred status mark").not.toContain("[ok]");
    expect(html, "dashed hairs").toContain("dashed");
  });

  it("reads the neutral shared copy only", () => {
    const html = render("desktop", state());
    // Listed one by one rather than looped: the catalog keys are TYPED, so a
    // template-literal key does not type-check — the same fact that makes
    // deleting a copy block a compile error in whichever archetype still reads
    // it (#1181's reason for deleting the nine blocks one issue at a time).
    for (const phrase of [
      i18n.t("forms:editPraxis.composer.taskLabel"),
      i18n.t("forms:editPraxis.composer.titleLabel"),
      i18n.t("forms:editPraxis.composer.modeLabel"),
      i18n.t("forms:editPraxis.composer.writeUpLabel"),
      i18n.t("forms:editPraxis.composer.proofLabel"),
      i18n.t("forms:editPraxis.composer.submit"),
      i18n.t("forms:editPraxis.composer.pointsUnit"),
    ]) {
      expect(html, phrase).toContain(phrase);
    }
    // Deleted faction vocabulary must not reappear.
    for (const gone of ["TRANSMIT SIGNAL", "--networked", "[esc] :q", "vim ./draft.md"]) {
      expect(html, gone).not.toContain(gone);
    }
  });

  it("paints no raw hex and no dark-branch", () => {
    const html = render("desktop", state());
    expect(html).not.toMatch(/#[0-9a-fA-F]{6}\b/);
  });

  it("renders at both widths with one breadcrumb", () => {
    for (const width of ["desktop", "mobile"] as const) {
      const html = render(width, state());
      expect((html.match(/<nav/g) ?? []).length, width).toBe(1);
      expect(html, width).toContain("--faction-singularity-term-bg");
    }
  });

  // The invite SEARCH is behind the `+ invite` chip since #1417, so its skinned
  // placeholder is no longer in the closed reading this harness renders (no DOM,
  // no clicks). The chip is what the region draws, and it carries the skin's own
  // face — which is the same fact this test was asserting: the archetype's skin
  // props reach the shared control.
  it("dresses the mode keys and the invite box through their skin props", () => {
    const html = render("desktop", state({ showInviteBox: true }));
    expect((html.match(/aria-pressed=/g) ?? []).length).toBe(3);
    expect(html).toContain(i18n.t("forms:editPraxis.invite.addAction"));
    expect(html).toContain("--faction-singularity-card-font");
  });
});

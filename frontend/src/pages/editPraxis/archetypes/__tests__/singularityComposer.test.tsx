/**
 * The Singularity composer's dress (#1186). Structural claims are its only
 * guard: tokens resolve, motions arrive as classes (not inline `animation:`,
 * which bypasses #1003), no hex, and no deleted faction vocabulary (ADR-0065 §3).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../../i18n";
import i18n from "../../../../i18n";
import type { EditPraxisState } from "../../useEditPraxis";
import { anEditPraxisState } from "../../../../test/fixtures";
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
  // The shared ScoreStamp reads these (#1828).
  is_top_for_task: false,
  task_point_value: 20,
  metatask_points: 0,
  display_multiplier: 1,
  points_from_votes: 0,
  habit_bonus_points: 0,
  score: 20,
} as unknown as PraxisOut;

function state(overrides: Partial<EditPraxisState> = {}): EditPraxisState {
  return anEditPraxisState({
    praxis,
    task,
    title: "I helped a stranger",
    body: "## What I did",
    duelChipVisible: true,
    autoSubmitDays: 10,
    ...overrides,
  });
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
      // The terminal's own score stamp (#1828).
      "--faction-singularity-term-page",
      "--faction-singularity-term-cta-bg",
      "--faction-singularity-card-font",
    ]) {
      expect(html, token).toContain(token);
    }
    // The three motions. The lamp is the kit's `.sg-pulse`, not `.ep-pulse` (#2092).
    expect(html, "the session lamp").toContain("sg-pulse");
    expect(html).toContain("sg-scan");
    expect(html).toContain("ep-blink");
    expect(html, "no injected keyframes").not.toContain("@keyframes");
    expect(html, "the process name").toContain("praxis.proc");
    // `[ok]` belongs to the waiting surface (#1828).
    expect(html, "the deferred status mark").not.toContain("[ok]");
    expect(html, "dashed hairs").toContain("dashed");
  });

  it("reads the neutral shared copy only", () => {
    const html = render("desktop", state());
    // Listed, not looped: typed keys reject template literals.
    for (const phrase of [
      i18n.t("forms:editPraxis.composer.taskLabel"),
      // The input's aria-label (#2179; see composerRule.test.tsx).
      i18n.t("forms:editPraxis.composer.titleLabel"),
      i18n.t("forms:editPraxis.composer.modeLabel"),
      // No `writeUpLabel` (#2085).
      i18n.t("forms:editPraxis.composer.proofLabel"),
      i18n.t("forms:editPraxis.composer.submit"),
      // No `pointsUnit` (#2598): "pts" matched incidentally; ScoreStamp owns points.
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

  // #1979: the source scans in `singularityLamps.test.tsx` can't see this bar;
  // only the rendered markup can compare palettes.
  it("wears the kit's LED lamps on the window bar, not the chassis' phosphor", () => {
    const html = render("desktop", state());
    const TRIO = [
      "--faction-singularity-led-red",
      "--faction-singularity-led-amber",
      "--faction-singularity-term-cta-bg",
    ];
    for (const token of TRIO) expect(html, `${token} is unpainted`).toContain(token);
    // Scoped to the lamp cluster; chassis inks are fine elsewhere.
    const open = html.indexOf(TRIO[0]);
    const close = html.indexOf(TRIO[2]);
    // Both ends located, or the slice is empty and asserts nothing.
    expect(open, "the cluster is on the bar at all").toBeGreaterThan(-1);
    expect(close).toBeGreaterThan(open);
    expect(html.slice(open, close)).not.toContain("--faction-singularity-term-");
  });

  // #2092: the process light is blue (owner ruling). Source census lives in
  // `singularityProcessLight.test.tsx`; the hue is only readable rendered.
  it("wears the kit's BLUE process light on the window bar, not the green accent", () => {
    const html = render("desktop", state());
    const at = html.indexOf('class="sg-pulse"');
    // Located, or the slice is empty and asserts nothing.
    expect(at, "the process light is on the bar at all").toBeGreaterThan(-1);
    const light = html.slice(at, html.indexOf(">", at));
    expect(light).toContain("--faction-singularity-term-blue-bright");
    // Scoped to the light's element; `term-bright` is fine elsewhere.
    expect(light, "the green accent is off the light").not.toContain(
      "--faction-singularity-term-bright",
    );
    expect(light, "and its bloom is the blue one").toContain(
      "--faction-singularity-term-halo-blue",
    );
  });

  it("renders at both widths with one breadcrumb", () => {
    for (const width of ["desktop", "mobile"] as const) {
      const html = render(width, state());
      expect((html.match(/<nav/g) ?? []).length, width).toBe(1);
      expect(html, width).toContain("--faction-singularity-term-bg");
    }
  });

  // The invite search hides behind the `+ invite` chip (#1417); the chip
  // carries the skin face, proving skin props reach the shared control.
  it("dresses the mode keys and the invite box through their skin props", () => {
    const html = render("desktop", state({ showInviteBox: true }));
    expect((html.match(/aria-pressed=/g) ?? []).length).toBe(3);
    expect(html).toContain(i18n.t("forms:editPraxis.invite.addAction"));
    expect(html).toContain("--faction-singularity-card-font");
  });
});

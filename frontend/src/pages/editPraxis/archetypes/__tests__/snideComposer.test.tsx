/**
 * S.N.I.D.E.'s composer dress (#1184, ADR-0065): neutral copy, radius 0 and
 * no border (overrides of a shared default), the full-bleed submit bar (rung
 * is form-factor dependent), and the ground kept on the column (#1028).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../../i18n";
import { anEditPraxisState } from "../../../../test/fixtures";
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

const state = anEditPraxisState({
  praxis,
  task,
  title: "I helped a stranger",
  body: "Caught the papers.",
  duelChipVisible: true,
});

function render(formFactor: "mobile" | "desktop"): string {
  mocks.formFactor = formFactor;
  return renderToStaticMarkup(
    <MemoryRouter>
      <SnideEditPraxis state={state} />
    </MemoryRouter>,
  );
}

const WIDTHS = ["desktop", "mobile"] as const;

describe("SNIDE's dress", () => {
  it.each(WIDTHS)("draws no card border and no radius on %s", (width) => {
    const markup = render(width);
    expect(markup).toContain("border-radius:0");
    expect(markup).not.toContain("border-radius:10px");
    expect(markup).not.toContain("--faction-snide-border");
  });

  it.each(WIDTHS)("grounds on the flyposted WALL, not a sheet of its own on %s", (width) => {
    // One ground, the wall (owner ruling, #2177). Pigments are `-note-*`
    // (the task card's), inks stay `-composer-*`.
    const markup = render(width);
    expect(markup, "the wall's ramp").toContain("--faction-snide-wall");
    expect(markup, "the acid corner").toContain("--faction-snide-note-wash-acid");
    expect(markup, "the pink corner").toContain("--faction-snide-note-wash-pink");
    expect(markup, "the ink family").toContain("--faction-snide-composer-ink");
    // A second stripe over the wall's raster made moiré.
    expect(markup, "no second raster").not.toContain("--faction-snide-composer-grain");
  });

  it("bleeds the submit bar to the sheet's edge at each width", () => {
    // The shared band (#1828; composerDispatch.test.tsx).
    expect(render("desktop")).toContain(
      "margin:0 calc(-1 * var(--composer-pad-x)) calc(-1 * var(--composer-pad-bottom))",
    );
    expect(render("mobile")).toContain(
      "margin:0 calc(-1 * var(--composer-pad-x)) calc(-1 * var(--composer-pad-bottom))",
    );
  });

  it.each(WIDTHS)("keeps its ground on the column, not the viewport on %s", (width) => {
    // #1028: `ComposerSheet` owns the clip.
    const markup = render(width);
    expect(markup).not.toContain("100vh");
    expect(markup).not.toContain("position:fixed");
  });
});

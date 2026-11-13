/**
 * The edit-praxis back affordance (#567, #1181, #1189). Invariant: from every
 * state of `/praxis/:id/edit`, at every width, exactly one way back.
 *
 *   never TWO  → this file: skins mocked to null, so any breadcrumb would be
 *                the dispatcher's own. There is none.
 *   never ZERO → `editPraxis/archetypes/__tests__/composerDispatch.test.tsx`.
 *
 * `handoff` redirects to the read page instead (#1164).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../i18n";
import type { EditPraxisState } from "../editPraxis/useEditPraxis";
import { anEditPraxisState } from "../../test/fixtures";

const formFactor = vi.hoisted(() => ({ value: "mobile" as "mobile" | "desktop" }));
const editState = vi.hoisted(() => ({ current: null as EditPraxisState | null }));

vi.mock("../../hooks/useFormFactor", () => ({
  useFormFactor: () => formFactor.value,
}));
vi.mock("../editPraxis/useEditPraxis", () => ({
  useEditPraxis: () => editState.current,
}));
vi.mock("../editPraxis/archetypes/DefaultEditPraxis", () => ({
  default: () => null,
}));
// Contents pinned by `editPraxis/waiting/__tests__`.
vi.mock("../editPraxis/waiting/PraxisWaitingSurface", () => ({
  default: () => null,
}));

import EditPraxis from "../EditPraxis";

/** Fixture task slug `na` falls through to the (mocked) Default archetype. */
function stateAt(phase: EditPraxisState["phase"]): EditPraxisState {
  return anEditPraxisState({
    phase,
    isPublished: phase !== "composing",
  });
}

function render(
  width: "mobile" | "desktop",
  phase: EditPraxisState["phase"],
): string {
  formFactor.value = width;
  editState.current = stateAt(phase);
  return renderToStaticMarkup(
    <MemoryRouter>
      <EditPraxis />
    </MemoryRouter>,
  );
}

const WIDTHS = ["mobile", "desktop"] as const;
// Derived from the fixture: a drifted hand-written id would pass `not.toContain`
// vacuously.
const BACK_LINK = `href="/praxis/${anEditPraxisState().praxis!.id}"`;

const DRAWN_STATES = ["composing", "waiting", "completed"] as const;

describe("EditPraxis back affordance (#567)", () => {
  it.each(
    WIDTHS.flatMap((width) =>
      DRAWN_STATES.map((phase) => [width, phase] as const),
    ),
  )(
    "adds no breadcrumb of its own on %s while %s — the archetype owns it",
    (width, phase) => {
      expect(render(width, phase)).not.toContain(BACK_LINK);
    },
  );

  it.each(WIDTHS)(
    "redirects rather than stranding a handed-off praxis on %s",
    (width) => {
      expect(render(width, "handoff")).toBe("");
    },
  );
});

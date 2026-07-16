/**
 * Mobile edit-praxis back affordance (#567). The phone composer skins paint no
 * breadcrumb, so after publish there was no way back — a dead end. EditPraxis
 * now renders the shared breadcrumb once on the mobile path, present for every
 * skin and every state (including published). Desktop archetypes render their
 * own breadcrumb, so the wrapper must NOT add one on desktop (no doubling).
 *
 * Runs headless (node env): renderToStaticMarkup, skins mocked to null so the
 * test isolates the wrapper's own breadcrumb.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../i18n";
import type { EditPraxisState } from "../editPraxis/useEditPraxis";

const formFactor = vi.hoisted(() => ({ value: "mobile" as "mobile" | "desktop" }));
const editState = vi.hoisted(() => ({ current: null as EditPraxisState | null }));

vi.mock("../../hooks/useFormFactor", () => ({
  useFormFactor: () => formFactor.value,
}));
vi.mock("../editPraxis/useEditPraxis", () => ({
  useEditPraxis: () => editState.current,
}));
// Skins render null so only the wrapper's breadcrumb can appear in the output.
vi.mock("../editPraxis/mobileArchetypes/DefaultEditPraxis", () => ({
  default: () => null,
}));
vi.mock("../editPraxis/archetypes/DefaultEditPraxis", () => ({
  default: () => null,
}));

import EditPraxis from "../EditPraxis";

// Sparse published state — EditPraxis reads only these fields; the skin (which
// reads the rest) is mocked to null. slug 'na' falls through to the Default skin.
const publishedState = {
  loading: false,
  isPublished: true,
  pendingImage: null,
  error: "",
  praxis: { id: 55, task_id: 7, task_title: "A Very Human Thing" },
  task: { primary_faction_slug: "na" },
} as unknown as EditPraxisState;

function render(): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <EditPraxis />
    </MemoryRouter>,
  );
}

describe("EditPraxis mobile back affordance (#567)", () => {
  it("renders a breadcrumb back to the praxis on mobile, even when published", () => {
    formFactor.value = "mobile";
    editState.current = publishedState;
    expect(render()).toContain('href="/praxes/55"');
  });

  it("does not add its own breadcrumb on desktop (archetypes own it there)", () => {
    formFactor.value = "desktop";
    editState.current = publishedState;
    expect(render()).not.toContain('href="/praxes/55"');
  });
});

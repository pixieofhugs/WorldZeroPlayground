/**
 * The edit-praxis back affordance (#567, reworked by #1181).
 *
 * #567's defect: after publish the phone composer was a dead end, because the
 * mobile skins painted no breadcrumb. The fix was a breadcrumb rendered by the
 * DISPATCHER on the mobile path, and this file pinned it — present on mobile in
 * every state, absent on desktop so the archetype's own was not doubled.
 *
 * ADR-0065 retired the mobile twin, and the desktop archetype now serves the
 * phone and paints its own breadcrumb at both widths. So the mobile half of that
 * gate is not merely unnecessary, it is WRONG: keeping it would draw two
 * breadcrumbs above every phone composer. The gate is now `waiting` alone.
 *
 * The invariant #567 actually bought is unchanged, and is what this file pins
 * now: **from every state of `/praxes/:id/edit`, at every width, there is
 * exactly one way back and never zero.** Three states, three owners:
 *
 *   composing → the ARCHETYPE draws it. Proved with the real archetype mounted,
 *               and COUNTED, in `editPraxis/archetypes/__tests__/
 *               composerDispatch.test.tsx`; the skins are mocked to null here,
 *               so this file proves only that the dispatcher adds none.
 *   waiting /
 *   completed → the DISPATCHER draws it — `PraxisWaitingSurface` is faction-
 *               neutral and paints none of its own.
 *   handoff   → neither: a published solo praxis has nothing left to compose and
 *               redirects to the read page (#1164), which is a way out by
 *               construction rather than a dead end.
 *
 * Runs headless (node env): renderToStaticMarkup, skins mocked to null so the
 * test isolates the dispatcher's own breadcrumb.
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
// The skin renders null so only the dispatcher's breadcrumb can appear.
vi.mock("../editPraxis/archetypes/DefaultEditPraxis", () => ({
  default: () => null,
}));
// The waiting surface too: this file is about who DRAWS the breadcrumb, and the
// surface's own contents are pinned by `editPraxis/waiting/__tests__`.
vi.mock("../editPraxis/waiting/PraxisWaitingSurface", () => ({
  default: () => null,
}));

import EditPraxis from "../EditPraxis";

/**
 * Sparse state — EditPraxis reads only these fields; the skin (which reads the
 * rest) is mocked to null. slug 'na' falls through to the Default archetype.
 */
function stateAt(phase: EditPraxisState["phase"]): EditPraxisState {
  return {
    loading: false,
    phase,
    isPublished: phase !== "composing",
    pendingImage: null,
    error: "",
    praxis: { id: 55, task_id: 7, task_title: "A Very Human Thing" },
    task: { primary_faction_slug: "na" },
  } as unknown as EditPraxisState;
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
const BACK_LINK = 'href="/praxes/55"';

describe("EditPraxis back affordance (#567)", () => {
  it.each(WIDTHS)(
    "draws the shared breadcrumb over the waiting surface on %s",
    (width) => {
      expect(render(width, "waiting")).toContain(BACK_LINK);
    },
  );

  it.each(WIDTHS)(
    "draws it over the completed reading on %s too (#1164)",
    (width) => {
      expect(render(width, "completed")).toContain(BACK_LINK);
    },
  );

  it.each(WIDTHS)(
    "adds none of its own while composing on %s — the archetype owns it",
    (width) => {
      // Before #1181 this passed on desktop and failed on mobile BY DESIGN: the
      // dispatcher drew the phone's breadcrumb because the mobile skins drew
      // none. One archetype now serves both widths and draws its own, so a
      // dispatcher breadcrumb here would be the second one.
      expect(render(width, "composing")).not.toContain(BACK_LINK);
    },
  );

  it.each(WIDTHS)(
    "redirects rather than stranding a handed-off praxis on %s",
    (width) => {
      // No breadcrumb because there is no page left: <Navigate> replaces the
      // whole composer with the read page (#1164).
      expect(render(width, "handoff")).toBe("");
    },
  );
});

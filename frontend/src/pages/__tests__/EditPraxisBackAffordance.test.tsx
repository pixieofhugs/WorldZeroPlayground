/**
 * The edit-praxis back affordance (#567, reworked by #1181 and again by #1189).
 *
 * #567's defect: after publish the phone composer was a dead end, because the
 * mobile skins painted no breadcrumb. The fix was a breadcrumb rendered by the
 * DISPATCHER on the mobile path, and this file pinned it — present on mobile in
 * every state, absent on desktop so the archetype's own was not doubled.
 *
 * ADR-0065 retired the mobile twin, so #1181 narrowed that gate to the waiting
 * surface, which was faction-neutral chrome and painted none of its own. #1189
 * dressed that surface: the archetype draws it now, through the same
 * `ComposerPage` the composer uses, so it paints its own breadcrumb like every
 * other stage. The dispatcher draws NONE.
 *
 * The invariant #567 actually bought is unchanged, and is what this file pins:
 * **from every state of `/praxis/:id/edit`, at every width, there is exactly one
 * way back and never zero.** Two halves, two files:
 *
 *   never TWO  → this file. Every skin is mocked to null, so a breadcrumb in the
 *                markup could only be the dispatcher's own. There is none, in
 *                any state, at either width.
 *   never ZERO → `editPraxis/archetypes/__tests__/composerDispatch.test.tsx`,
 *                which mounts the REAL archetype and COUNTS `<nav>` at both
 *                widths, while composing and while waiting.
 *
 * `handoff` is the one state with neither: a published solo praxis has nothing
 * left to compose and redirects to the read page (#1164), which is a way out by
 * construction rather than a dead end.
 *
 * Runs headless (node env): renderToStaticMarkup, skins mocked to null so the
 * test isolates the dispatcher's own output.
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
 * The phase and what follows from it are the premise; the rest is the fixture's
 * quiet default (#2877), and the skin (which reads it) is mocked to null. The
 * fixture's task carries slug `na`, which falls through to the Default
 * archetype.
 */
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
// Derived from the fixture rather than spelled: every assertion below is a
// `not.toContain`, so a hand-written id that drifted from the state's praxis
// would pass vacuously forever.
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
      // Before #1181 this passed on desktop and failed on mobile BY DESIGN: the
      // dispatcher drew the phone's breadcrumb because the mobile skins drew
      // none. Before #1189 it drew the waiting surface's, because that surface
      // was undressed chrome. One archetype now serves both widths AND both
      // stages and draws its own, so a dispatcher breadcrumb here would be the
      // second one.
      expect(render(width, phase)).not.toContain(BACK_LINK);
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

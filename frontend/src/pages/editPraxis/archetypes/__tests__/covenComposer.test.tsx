/**
 * Cozy Coven's composer, v2 design (#1188). The stale `wow.exe` window caption
 * (pre-ADR-0050) is gone, and the page speaks the neutral composer set
 * (ADR-0065 §3), checked at the catalog too since an orphaned key is silent.
 * `editPraxis.coven` is gone entirely (#1812; see `collabCopy.test.ts`).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../../i18n";
import i18n from "../../../../i18n";
import forms from "../../../../locales/en/forms.json";
import { factionName } from "../../../../utils/factions";
import { anEditPraxisState, aPraxis, aTask } from "../../../../test/fixtures";
import type { EditPraxisState } from "../../useEditPraxis";

const mocks = vi.hoisted(() => ({ formFactor: "desktop" as "mobile" | "desktop" }));
vi.mock("../../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));

import CovenEditPraxis from "../CovenEditPraxis";

const task = aTask({
  title: "Bless the work",
  description: "Do a small honest thing.",
  point_value: 20,
  level_required: 1,
  primary_faction_slug: "coven",
  allowed_modes: ["solo", "collab", "duel"],
});

const TITLE = "I helped a stranger";

const praxis = aPraxis({
  id: 55,
  task_title: "Bless the work",
  task_faction_slug: "coven",
  status: "in_progress",
  title: TITLE,
  body_text: "## What I did\n\nCaught the papers.",
  members: [],
  media_items: [],
});

/** The duel chip puts a mode picker on the page for the locked-state claim. */
function baseState(overrides: Partial<EditPraxisState> = {}): EditPraxisState {
  return anEditPraxisState({
    praxis,
    task,
    title: TITLE,
    body: "Caught the papers.",
    duelChipVisible: true,
    ...overrides,
  });
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
    // The faction name from its owning key (ADR-0038).
    expect(render(width)).toContain(factionName("coven"));
  });
});

describe("Coven composer — the shared layout, neutrally worded (ADR-0065)", () => {
  // Spelled out: template keys don't typecheck and evade the i18n grep.
  // No `writeUpLabel` (effect-applied; bodySpellcheck.test.ts). `titleLabel` is
  // the input's aria-label (composerRule.test.tsx).
  const REGIONS = [
    i18n.t("forms:editPraxis.composer.taskLabel"),
    i18n.t("forms:editPraxis.composer.titleLabel"),
    i18n.t("forms:editPraxis.composer.modeLabel"),
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

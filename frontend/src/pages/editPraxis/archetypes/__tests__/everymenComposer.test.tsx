/**
 * The Everymen composer's dress (#1187, ADR-0065): neutral shared copy (no
 * hardcoded union vocabulary), no `editPraxis.everymen` block (#1812), and one
 * component at both widths with the ground kept in its column (#1028).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../../i18n";
import i18n from "../../../../i18n";
import type { EditPraxisState } from "../../useEditPraxis";
import { aPraxis, aTask, anEditPraxisState } from "../../../../test/fixtures";

const mocks = vi.hoisted(() => ({ formFactor: "desktop" as "mobile" | "desktop" }));

vi.mock("../../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));

// Imported after the mock is registered.
import EverymenEditPraxis from "../EverymenEditPraxis";

function state(overrides: Partial<EditPraxisState> = {}): EditPraxisState {
  return anEditPraxisState({
    praxis: aPraxis({
      id: 55,
      task_title: "A Very Human Thing",
      task_faction_slug: "everymen",
      status: "in_progress",
      submitted_at: null,
      members: [],
      media_items: [],
    }),
    task: aTask({
      description: "Do a small honest thing.",
      point_value: 20,
      level_required: 1,
      primary_faction_slug: "everymen",
      allowed_modes: ["solo", "collab"],
    }),
    title: "I helped a stranger",
    body: "## What I did\n\nCaught the papers.",
    ...overrides,
  });
}

function render(formFactor: "mobile" | "desktop"): string {
  mocks.formFactor = formFactor;
  return renderToStaticMarkup(
    <MemoryRouter>
      <EverymenEditPraxis state={state()} />
    </MemoryRouter>,
  );
}

const WIDTHS = ["desktop", "mobile"] as const;

describe("Everymen composer copy is the neutral set (ADR-0065 §3)", () => {
  it.each(WIDTHS)("draws the shared region labels on %s", (width) => {
    const markup = render(width);
    // No `writeUpLabel` (#2085); `titleLabel` is the input's aria-label (#2179).
    for (const key of ["taskLabel", "titleLabel", "modeLabel", "proofLabel", "submit"]) {
      expect(markup).toContain(i18n.t(`forms:editPraxis.composer.${key}` as never));
    }
  });

  it.each(WIDTHS)("speaks none of the retired union vocabulary on %s", (width) => {
    const markup = render(width);
    for (const voice of [
      "THE CREW",
      "THE JOB",
      "THE REPORT",
      "PROOF OF WORK",
      "STAMP &amp; FILE",
      "VOID THE REPORT",
      "WORK REPORT",
      "FILE YOUR REPORT",
      "SIDE WORK",
      "ON FILE",
    ]) {
      expect(markup).not.toContain(voice);
    }
  });

  it("names the paper on the masthead from the shared faction catalog", () => {
    // Faction voice is ruled out (ADR-0065), so the plate carries the NAME (ADR-0057).
    expect(render("desktop")).toContain(i18n.t("factions:names.everymen"));
  });

  it("has no editPraxis.everymen block left, collab included (#1812)", () => {
    expect(i18n.exists("forms:editPraxis.everymen")).toBe(false);
  });
});

describe("Everymen composer dress", () => {
  it("counter-rotates the two masthead cogs", () => {
    // By class: inline `animation:` would bypass the reduced-motion guard (#1003).
    const markup = render("desktop");
    expect((markup.match(/class="ep-spin"/g) ?? []).length).toBe(1);
    expect((markup.match(/class="ep-spin-rev"/g) ?? []).length).toBe(1);
    expect(markup).not.toContain("animation:");
  });

  it("fills the chosen mode with the CTA, not a generic accent block (#1830)", () => {
    // Design rule: active state takes "its CTA fill … never a generic accent block".
    const markup = render("desktop");
    expect(markup).toContain("background:var(--faction-everymen-bill-cta-bg)");
    expect(markup).not.toContain("4px 4px 0 var(--everymen-frame)");
  });

  it("stencils every label at the design's 0.2em (#1830)", () => {
    // Only the masthead wordmark keeps 0.16em, per the design.
    const markup = render("desktop");
    const tight = markup.match(/letter-spacing:0\.16em;[^"]*/g) ?? [];
    expect(tight).toHaveLength(1);
    expect(tight[0]).toContain("--faction-everymen-bill-mast-ink");
    const chip = markup.slice(markup.indexOf('aria-pressed="true"'));
    expect(chip.slice(0, 400)).toContain("letter-spacing:0.2em");
  });

  it.each(WIDTHS)("keeps its ground inside its own column on %s (#1028)", (width) => {
    const markup = render(width);
    expect(markup).not.toContain("100vh");
    expect(markup).not.toContain("position:fixed");
  });

  it.each(WIDTHS)("draws exactly one breadcrumb on %s", (width) => {
    expect((render(width).match(/<nav/g) ?? []).length).toBe(1);
  });
});

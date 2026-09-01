/**
 * The Everymen composer's dress (#1187, epic #1179, ADR-0065).
 *
 * Three claims, each of which was true of the skin this replaces and is the
 * thing most likely to come back:
 *
 * 1. **The copy is the neutral shared set.** The union vocabulary
 *    (`THE CREW`, `PROOF OF WORK`, `★ STAMP & FILE ★`, `VOID THE REPORT`) is
 *    deleted from `forms.json`, so a re-introduction would have to re-add the
 *    keys — but a hardcoded string in the archetype would not, and that is what
 *    this asserts against.
 * 2. **`editPraxis.everymen` is gone entirely.** Its `collab` sub-block used to
 *    survive this epic — it was `collabCopy`'s override table rather than
 *    composer copy — but #1812 deleted all eight of those for a reason of its
 *    own: collab submission status speaks one vocabulary on every faction.
 * 3. **One component, both widths, and the ground stays in its column.** The
 *    old build painted `minHeight: 100vh` on the page — the #1028 trap the
 *    shared `ComposerSheet` now exists to make impossible.
 *
 * renderToStaticMarkup, no DOM, matching the rest of this suite.
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

/**
 * Only the state this archetype reads. The composer's full contract is ~80
 * fields and is carried by `anEditPraxisState` (#2877); everything not named
 * below is that fixture's quiet default — nothing loading, nothing open, no
 * confirm pending, every capability false.
 */
function state(overrides: Partial<EditPraxisState> = {}): EditPraxisState {
  return anEditPraxisState({
    praxis: aPraxis({
      id: 55,
      task_title: "A Very Human Thing",
      task_faction_slug: "everymen",
      // A draft, matching the fixture's own default praxis: this suite renders
      // the composer proper, which is what a member sees BEFORE casting.
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
    // No `writeUpLabel`: #2085 took that heading off the page, and the key now
    // names the editor through an aria-label a static render cannot see.
    // `titleLabel` is an aria-label too since #2179 — but on the `<input>`
    // itself, so a static render still sees it. This asserts the wording is the
    // neutral catalog's; that it is no longer DRAWN is composerRule.test.tsx's.
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
    // The design's masthead word is faction voice, which ADR-0065's rejected
    // alternative rules out; the plate carries the faction's NAME instead — the
    // same substitution `EverymenTaskDetail` makes under ADR-0057.
    expect(render("desktop")).toContain(i18n.t("factions:names.everymen"));
  });

  it("has no editPraxis.everymen block left, collab included (#1812)", () => {
    expect(i18n.exists("forms:editPraxis.everymen")).toBe(false);
  });
});

describe("Everymen composer dress", () => {
  it("counter-rotates the two masthead cogs", () => {
    // The pair is the design's one motion, and it is reached by CLASS: an
    // inline `animation:` would bypass the shared reduced-motion guard (#1003).
    const markup = render("desktop");
    expect((markup.match(/class="ep-spin"/g) ?? []).length).toBe(1);
    expect((markup.match(/class="ep-spin-rev"/g) ?? []).length).toBe(1);
    expect(markup).not.toContain("animation:");
  });

  it("fills the chosen mode with the CTA, not a generic accent block (#1830)", () => {
    // The design's shared control dress says so in as many words: a control's
    // active state takes "its CTA fill … never a generic accent block". The red
    // block with a 4px offset shadow was the union's ONE irreversible act —
    // filing — restated on a control that only picks how you file.
    const markup = render("desktop");
    expect(markup).toContain("background:var(--faction-everymen-bill-cta-bg)");
    expect(markup).not.toContain("4px 4px 0 var(--everymen-frame)");
  });

  it("stencils every label at the design's 0.2em (#1830)", () => {
    // `stencil()` is the whole label tier, and its 0.16em reached the mode
    // chips, the write-up tabs, the picker and the exits — the slots that did
    // NOT pass their own tracking. The masthead wordmark keeps 0.16em, which is
    // the design's own value there.
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

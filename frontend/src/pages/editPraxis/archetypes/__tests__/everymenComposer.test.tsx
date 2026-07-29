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
 * 2. **`editPraxis.everymen.collab` survives.** It is not composer copy: it is
 *    `collabCopy`'s override table, read by `CollabRoster` on the read page.
 *    Deleting the block alongside the page keys is the easy mistake.
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

const mocks = vi.hoisted(() => ({ formFactor: "desktop" as "mobile" | "desktop" }));

vi.mock("../../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));

// Imported after the mock is registered.
import EverymenEditPraxis from "../EverymenEditPraxis";

/**
 * Only the state this archetype reads. The composer's full contract is ~70
 * fields and is exercised by `composerDispatch.test.tsx`; a second copy of it
 * here would be a fixture to maintain rather than a claim to make.
 */
function state(overrides: Record<string, unknown> = {}): EditPraxisState {
  return {
    praxis: {
      id: 55,
      task_id: 7,
      task_title: "A Very Human Thing",
      task_faction_slug: "everymen",
      type: "solo",
      created_by_id: 3,
      members: [],
      invites: [],
      duel_id: null,
    },
    task: {
      id: 7,
      description: "Do a small honest thing.",
      point_value: 20,
      level_required: 1,
      primary_faction_slug: "everymen",
      allowed_modes: ["solo", "collab"],
    },
    title: "I helped a stranger",
    setTitle: () => {},
    body: "## What I did\n\nCaught the papers.",
    setBody: () => {},
    wordCount: 4,
    media: [],
    fileError: "",
    error: "",
    handleFileChange: () => {},
    removeMedia: async () => {},
    autosaveAt: null,
    submitting: false,
    switchingMode: null,
    isPublished: false,
    controlsLocked: false,
    modeIsLocked: false,
    showInviteBox: false,
    showSealStack: false,
    duelMode: false,
    duelChipVisible: false,
    duel: null,
    currentCharacterId: 3,
    ...overrides,
  } as unknown as EditPraxisState;
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
    for (const key of [
      "taskLabel",
      "titleLabel",
      "modeLabel",
      "writeUpLabel",
      "proofLabel",
      "submit",
    ]) {
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

  it("keeps editPraxis.everymen.collab, which is not composer copy", () => {
    // collabCopy's override table, also read by CollabRoster on /praxes/:id.
    expect(i18n.t("forms:editPraxis.everymen.collab.castAction")).toBe(
      "Sign off on my part",
    );
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

  it.each(WIDTHS)("keeps its ground inside its own column on %s (#1028)", (width) => {
    const markup = render(width);
    expect(markup).not.toContain("100vh");
    expect(markup).not.toContain("position:fixed");
  });

  it.each(WIDTHS)("draws exactly one breadcrumb on %s", (width) => {
    expect((render(width).match(/<nav/g) ?? []).length).toBe(1);
  });
});

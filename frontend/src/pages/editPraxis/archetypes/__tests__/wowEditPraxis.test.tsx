/**
 * Warriors of Whimsy's composer, the writ (#1183). Layout and gates live in
 * `composerDispatch.test.tsx`. Here: the registry row (the na fallback would
 * pass every content assertion), ADR-0065 §3's deleted knightly vocabulary, and
 * the dress. Colour values are an eyeball check.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../../i18n";
import i18n from "../../../../i18n";
import { surfaceMap } from "../../../../factions";
import { resolvedArchetype } from "../../../../factions/lazyArchetype";
import type { EditPraxisState } from "../../useEditPraxis";
import { anEditPraxisState } from "../../../../test/fixtures";
import type { PraxisOut } from "../../../../api/praxis";
import type { TaskOut } from "../../../../api/tasks";

const mocks = vi.hoisted(() => ({
  formFactor: "desktop" as "desktop" | "mobile",
}));
vi.mock("../../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));

// Imported after the mock so the archetypes pick it up.
const { default: WowEditPraxis } = await import("../WowEditPraxis");
const { default: DefaultEditPraxis } = await import("../DefaultEditPraxis");

const TASK = {
  id: 7,
  title: "Ferry the recycling to the depot",
  description: "Haul the crates down and come back lighter.",
  point_value: 20,
  level_required: 2,
  status: "active",
  task_type: "standard",
  primary_faction_slug: "wow",
  allowed_modes: ["solo", "collab", "duel"],
} as unknown as TaskOut;

const PRAXIS = {
  id: 55,
  task_id: 7,
  task_title: "Ferry the recycling to the depot",
  task_faction_slug: "wow",
  type: "solo",
  status: "in_progress",
  title: "Two crates and a wobbly trolley",
  body_text: "## What I did\n\nWheeled them down.",
  moderation_status: "visible",
  duel_id: null,
  members: [],
  invites: [],
  media_items: [],
  // The shared ScoreStamp reads these; `score` is non-optional on the wire.
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
    praxis: PRAXIS,
    task: TASK,
    // Spelled: `PRAXIS.title` is `string | null`, the draft title is not.
    title: "Two crates and a wobbly trolley",
    body: "## What I did\n\nWheeled them down.",
    autoSubmitDays: 10,
    ...overrides,
  });
}

function render(
  formFactor: "desktop" | "mobile" = "desktop",
  next: EditPraxisState = state(),
): string {
  mocks.formFactor = formFactor;
  return renderToStaticMarkup(
    <MemoryRouter>
      <WowEditPraxis state={next} />
    </MemoryRouter>,
  );
}

const WIDTHS = ["desktop", "mobile"] as const;

describe("WOW claims the composer surface", () => {
  it("registers an editPraxis archetype", () => {
    expect(surfaceMap("editPraxis")["wow"]).toBeDefined();
  });

  it("resolves through the manifest thunk to this component", async () => {
    const Resolved = await resolvedArchetype(surfaceMap("editPraxis")["wow"]);
    expect(Resolved).toBe(WowEditPraxis);
  });

  it("is the WOW skin and not the na fallback wearing its name", () => {
    // Only the dress tells the na composer apart.
    const wow = render();
    const na = renderToStaticMarkup(
      <MemoryRouter>
        <DefaultEditPraxis state={state()} />
      </MemoryRouter>,
    );
    expect(wow, "the gold/plum barber ribbon").toContain(
      "--faction-wow-quest-ribbon",
    );
    expect(na, "which the na page has no notion of").not.toContain(
      "--faction-wow-quest-ribbon",
    );
    // na's spectrum is its sheet's 3px frame (#2520).
    expect(na, "na's frame is the spectrum").toContain(
      "border:3px solid transparent",
    );
    expect(na, "and it no longer walks a band").not.toContain(
      "--faction-default-rainbow-loop",
    );
    expect(wow, "WOW's sheet is its own").not.toContain(
      "border:3px solid transparent",
    );
  });
});

describe("WOW composer — copy is neutral, and the old block is GONE (ADR-0065 §3)", () => {
  it("carries no editPraxis.wow page keys in the catalog", () => {
    // Deleted, not unread: a leftover block reads as live.
    for (const key of [
      "pageTitle",
      "pageSubtitle",
      "draftChip",
      "taskRefLabel",
      "titleLabel",
      "bodyLabel",
      "publishIdle",
      "dropLabel",
      "footerNote",
    ]) {
      expect(i18n.exists(`forms:editPraxis.wow.${key}`), key).toBe(false);
    }
  });

  it.each(WIDTHS)("reads the shared neutral words on %s", (width) => {
    const markup = render(width);
    // No `writeUpLabel` (#2085); `titleLabel` is the input's aria-label (#2179);
    // no `pointsUnit` ("pts" matched incidentally, #2598).
    for (const key of [
      "taskLabel",
      "titleLabel",
      "modeLabel",
      "proofLabel",
      "submit",
    ] as const) {
      expect(markup).toContain(i18n.t(`forms:editPraxis.composer.${key}`));
    }
  });

  it("speaks none of the retired knightly vocabulary", () => {
    const text = render().replace(/<[^>]*>/g, "");
    // Whole words: "Write-up" contains "Writ".
    for (const word of ["Squire", "Chronicle", "Writ", "Quest", "thy", "Knight"]) {
      expect(text, word).not.toMatch(new RegExp(`\\b${word}\\b`));
    }
  });
});

describe("WOW composer — the dress", () => {
  it.each(WIDTHS)("frames the sheet in gilt at radius 6 on %s", (width) => {
    const markup = render(width);
    expect(markup).toContain("1.5px solid var(--faction-wow-chronicle-gold)");
    expect(markup).toContain("border-radius:6px");
  });

  it.each(WIDTHS)("floats the balloons alone over the ground on %s", (width) => {
    const markup = render(width);
    // Balloons are the whole ground; the dashed ring is dropped (#1830).
    expect(markup).toContain("wow-balloon-bunch");
    expect(markup).not.toContain('class="ep-spin"');
    expect(markup).not.toContain("2px dashed var(--faction-wow-chronicle-gold)");
    // Inline `animation:` would bypass the reduced-motion guard (#1003).
    expect(markup).not.toMatch(/animation:/);
  });

  it.each(WIDTHS)("lifts the bunch clear of the band on %s", (width) => {
    // Design: `right: 10, bottom: 76` desktop / 66 mobile, clear of the band (#1830).
    const markup = render(width);
    expect(markup).toContain("right:10px");
    expect(markup).toContain(width === "mobile" ? "bottom:66px" : "bottom:76px");
  });

  it("spends the quiet gold on its quiet edges (#1830)", () => {
    // `--faction-wow-rule` (gold at 40%) for the inactive chip and drop zone.
    const markup = render();
    expect(markup).toContain("1.5px solid var(--faction-wow-rule)");
    expect(markup).toContain("1.5px dashed var(--faction-wow-rule)");
    expect(markup).not.toContain("1.5px dashed var(--faction-wow-chronicle-gold)");
  });

  it("closes the sheet with the zigzag, not a hairline", () => {
    // One footer rule (#1707; count in composerRule.test.tsx); WOW's is the zigzag.
    const markup = render();
    expect(markup).toContain("wow-zig-footer");
    expect(markup).not.toContain("wow-zig-writeup");
  });

  /** The slip wears `WowScoreStamp`, not the old -2.5deg composer plaque (#1828). */
  it("marks the slip with the chronicle's own score stamp, not a second plaque", () => {
    const markup = render();
    expect(markup).toContain("--faction-wow-stamp-bg");
    expect(markup).toContain("--faction-wow-stamp-total");
    expect(markup).not.toContain("rotate(-2.5deg)");
    expect(markup).not.toContain("--faction-wow-quest-shadow");
  });

  it("trails the submit button with the writ's mark", () => {
    // In the trailing slot, not idleLabel, which collab/duel replace via collabCopy.
    const markup = render();
    const submit = i18n.t("forms:editPraxis.composer.submit");
    expect(markup).toContain(`${submit}<span aria-hidden="true">✦</span>`);
  });
});

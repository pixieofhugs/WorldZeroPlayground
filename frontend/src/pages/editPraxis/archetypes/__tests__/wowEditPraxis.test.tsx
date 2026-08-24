/**
 * Warriors of Whimsy — the edit-praxis composer, rebuilt as the writ (#1183).
 *
 * `composerDispatch.test.tsx` already walks the layout and the mode gates for
 * every skin at both widths, so none of that is repeated here. What is left is
 * what only WOW can get wrong:
 *
 *  - the registry row that makes the skin reachable at all — a green render
 *    proves nothing about WHICH component produced it, and the na fallback is
 *    a complete, correct composer that would pass every content assertion;
 *  - ADR-0065 §3's copy rule, which this issue is what enforces: the knightly
 *    vocabulary is DELETED from the catalog, not merely unread, so the page and
 *    the catalog are both asserted;
 *  - the dress, which is the only thing a skin is allowed to bring.
 *
 * Harness note: `renderToStaticMarkup`, no DOM, no effects (SPEC-testing.md).
 * `useFormFactor` is MOCKED — the size set reaching the page is the claim, not
 * `matchMedia`. Light vs dark is a pure `[data-theme]` cascade with no branch in
 * the component, so there is nothing here to assert about it; it is an eyeball
 * check, as is every colour VALUE (`factionTokensDeclared` proves the names
 * exist, `factionContrast` proves the manifest's pairings, neither can see a
 * page).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../../i18n";
import i18n from "../../../../i18n";
import { surfaceMap } from "../../../../factions";
import { resolvedArchetype } from "../../../../factions/lazyArchetype";
import type { EditPraxisState } from "../../useEditPraxis";
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
  // The slip's mark is the shared ScoreStamp since #1828, and every stamp reads
  // the score terms — `score` is non-optional on the wire (`PraxisOut.score:
  // float`, set unconditionally by `build_praxis_out`), so a fixture without it
  // renders a mark this page always has.
  is_top_for_task: false,
  task_point_value: 20,
  metatask_points: 0,
  display_multiplier: 1,
  points_from_votes: 0,
  habit_bonus_points: 0,
  score: 20,
} as unknown as PraxisOut;

function state(overrides: Partial<EditPraxisState> = {}): EditPraxisState {
  return {
    loading: false,
    phase: "composing",
    praxis: PRAXIS,
    task: TASK,
    error: "",
    title: PRAXIS.title,
    setTitle: () => {},
    body: "## What I did\n\nWheeled them down.",
    setBody: () => {},
    media: [],
    fileError: "",
    handleFileChange: () => {},
    removeMedia: async () => {},
    switchingMode: null,
    changeMode: async () => {},
    inviteQuery: "",
    setInviteQuery: () => {},
    inviteResults: [],
    inviteOpen: false,
    setInviteOpen: () => {},
    inviting: false,
    sendInvite: async () => {},
    cancelInvite: async () => {},
    kickMember: async () => {},
    duel: null,
    sendChallenge: async () => {},
    cancelDuel: async () => {},
    dissolveDuel: async () => {},
    submitting: false,
    publish: async () => {},
    saveDraft: async () => {},
    pullBack: async () => {},
    leaveCollab: async () => {},
    cancel: async () => {},
    autosaveAt: null,
    setAutosaveAt: () => {},
    autoSubmitDays: 10,
    isPublished: false,
    controlsLocked: false,
    modeIsLocked: false,
    showInviteBox: false,
    showMetatasks: false,
    showSealStack: false,
    duelMode: false,
    duelChipVisible: false,
    currentCharacterId: 3,
    ...overrides,
  } as unknown as EditPraxisState;
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
    // The failure this guards is invisible from a content assertion: the na
    // composer is a complete, correct page and would satisfy every one of them.
    // The tell is the dress.
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
    // na's spectrum is its sheet's 3px frame since #2520 — the walked masthead
    // band it used to be is off, on both skins.
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
    // Deleted, not merely unread: a block left behind reads as live to the i18n
    // sweep and invites the next skin to pick the voice back up.
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
    // No `writeUpLabel`: #2085 took that heading off the page, and the key now
    // names the editor through an aria-label a static render cannot see.
    // `titleLabel` is an aria-label too since #2179 — but on the `<input>`
    // itself, so a static render still sees it. This asserts the wording is the
    // neutral catalog's; that it is no longer DRAWN is composerRule.test.tsx's.
    // No `pointsUnit` either, and it was never really here (#2598). Its value
    // was the three letters "pts", which occur incidentally in almost any
    // markup, so `toContain` passed without the composer ever drawing the key —
    // a VACUOUS assertion. #1828 had already replaced every archetype's
    // composer-only points mark with the shared `ScoreStamp`, which speaks
    // `praxis:card.stamp.*`. Lengthening the value to "Points" is what made the
    // absence visible. The key has no reader left; deleting it is on the issue.
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
    // Whole words: the neutral set's own "Write-up" contains "Writ", which is
    // the kind of false positive that gets a guard deleted rather than fixed.
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
    // The bunch, from the faction's one ornament module (§6/#849) — and it is
    // now the WHOLE ground. The dashed gold ring went with #1830: the submit
    // band owns the sheet's bottom edge, and the design's ground row reads
    // "Balloons only, lifted clear of the submit band; the dashed ring is
    // dropped."
    expect(markup).toContain("wow-balloon-bunch");
    expect(markup).not.toContain('class="ep-spin"');
    expect(markup).not.toContain("2px dashed var(--faction-wow-chronicle-gold)");
    // Motion stays CLASS-gated either way: an inline `animation:` would bypass
    // the reduced-motion guard in index.css (#1003).
    expect(markup).not.toMatch(/animation:/);
  });

  it.each(WIDTHS)("lifts the bunch clear of the band on %s", (width) => {
    // Design ground row: `right: 10, bottom: 76` desktop / 66 mobile. The old
    // negative offsets tucked the bunch into the corner the full-bleed band
    // now occupies, so it read as clipped rather than as an ornament (#1830).
    const markup = render(width);
    expect(markup).toContain("right:10px");
    expect(markup).toContain(width === "mobile" ? "bottom:66px" : "bottom:76px");
  });

  it("spends the quiet gold on its quiet edges (#1830)", () => {
    // Two golds, not one: the solid `--faction-wow-chronicle-gold` frames the
    // sheet, the fields and the ACTIVE chip; `--faction-wow-rule` (the same
    // gold at 40%) draws the edges that are only suggesting a boundary — the
    // inactive mode chip and the proof drop zone.
    const markup = render();
    expect(markup).toContain("1.5px solid var(--faction-wow-rule)");
    expect(markup).toContain("1.5px dashed var(--faction-wow-rule)");
    expect(markup).not.toContain("1.5px dashed var(--faction-wow-chronicle-gold)");
  });

  it("closes the sheet with the zigzag, not a hairline", () => {
    // The zigzag is the FOOTER's mark, not a section divider (#1707): the
    // design calls its rule once, above the footer, and the regions above
    // separate by whitespace. `composerRule.test.tsx` owns the count; what is
    // WOW's alone is that the one rule drawn is the zigzag.
    const markup = render();
    expect(markup).toContain("wow-zig-footer");
    expect(markup).not.toContain("wow-zig-writeup");
  });

  /**
   * #1828 superseded the composer's own plaque. It struck a SECOND off-square
   * plate at `rotate(-2.5deg)` in `--faction-wow-quest-shadow`, carrying the
   * task's bare `point_value`, while `WowScoreStamp` — the chronicle's real
   * mark, at `rotate(-2deg)` on `--faction-wow-stamp-bg` — was what the same
   * page drew the instant you pressed Submit. What is asserted now is that the
   * slip wears the SHIPPED stamp and that the twin is gone.
   */
  it("marks the slip with the chronicle's own score stamp, not a second plaque", () => {
    const markup = render();
    expect(markup).toContain("--faction-wow-stamp-bg");
    expect(markup).toContain("--faction-wow-stamp-total");
    expect(markup).not.toContain("rotate(-2.5deg)");
    expect(markup).not.toContain("--faction-wow-quest-shadow");
  });

  it("trails the submit button with the writ's mark", () => {
    // The glyph rides the shared PublishButton's trailing slot rather than the
    // label: a collab or duel cast resolves its words through collabCopy, and a
    // mark folded into idleLabel would vanish in exactly those two modes.
    const markup = render();
    const submit = i18n.t("forms:editPraxis.composer.submit");
    expect(markup).toContain(`${submit}<span aria-hidden="true">✦</span>`);
  });
});

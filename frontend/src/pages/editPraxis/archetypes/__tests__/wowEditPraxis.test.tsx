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
    wordCount: 4,
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
    saveStatus: "idle",
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
    expect(na, "na's masthead is the spectrum").toContain(
      "--faction-default-rainbow-loop",
    );
    expect(wow, "and WOW's is not").not.toContain(
      "--faction-default-rainbow-loop",
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
    for (const key of [
      "taskLabel",
      "titleLabel",
      "modeLabel",
      "writeUpLabel",
      "proofLabel",
      "submit",
      "pointsUnit",
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

  it.each(WIDTHS)("runs both corner ornaments on %s", (width) => {
    const markup = render(width);
    // The turning dashed ring: a CLASS, so the reduced-motion guard in
    // index.css still governs it. An inline `animation:` would bypass it.
    expect(markup).toContain('class="ep-spin"');
    expect(markup).not.toMatch(/animation:/);
    // ...and the bunch, from the faction's one ornament module (§6/#849).
    expect(markup).toContain("wow-balloon-bunch");
  });

  it("divides its sections with the zigzag, not a hairline", () => {
    const markup = render();
    expect(markup).toContain("wow-zig-writeup");
    expect(markup).toContain("wow-zig-proof");
  });

  it("strikes the points plaque off-square with the figure in gold ink", () => {
    const markup = render();
    expect(markup).toContain("rotate(-2.5deg)");
    expect(markup).toContain("--faction-wow-quest-shadow");
    expect(markup).toContain("--faction-wow-stamp-total");
    expect(markup).toContain(String(TASK.point_value));
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

/**
 * The faction rule is a FOOTER MARK, not a section divider (#1707) — and the
 * last two archetype-side seams of #1706.
 *
 * The design calls `rule()` exactly once, immediately above the footer; every
 * other region separates by the sheet's own `gap`. All eight composers had read
 * it as a section divider and drawn one between every block — Cozy Coven
 * braided six times, S.N.I.D.E. redacted five — which is most of what made the
 * shipped composers read heavier than the design.
 *
 * The claim here is COUNTABLE, and that is the point: a test that only looked
 * for the ornament's PRESENCE would have passed against the six-braid version
 * too. `ORNAMENT` holds one substring per skin, lifted from the rule ELEMENT
 * rather than from a token name — several of those tokens also paint a masthead
 * or a field, and counting them would measure the dress instead of the divider.
 *
 * #1706's two remaining seams ride along: they were spelled out identically in
 * all eight files, so nothing shared could carry them, and they are claims
 * about what the page draws rather than about how it is wired.
 *
 * What is NOT asserted here: the ornaments' own shapes (unchanged by this
 * issue, and each skin's own suite already owns them), and every colour VALUE —
 * an eyeball check, as always.
 *
 * Harness: `renderToStaticMarkup`, no DOM, no effects (SPEC-testing.md).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../../i18n";
import i18n from "../../../../i18n";
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
const { surfaceMap } = await import("../../../../factions");
const { pickVariant } = await import("../../../../utils/factionDispatch");
const { resolvedArchetype } = await import("../../../../factions/lazyArchetype");
const { default: DefaultEditPraxis } = await import("../DefaultEditPraxis");

const TASK = {
  id: 7,
  title: "Ferry the recycling to the depot",
  description: "Haul the crates down and come back lighter.",
  point_value: 20,
  level_required: 2,
  status: "active",
  task_type: "standard",
  allowed_modes: ["solo", "collab", "duel"],
} as unknown as TaskOut;

const PRAXIS = {
  id: 55,
  task_id: 7,
  task_title: "Ferry the recycling to the depot",
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

/**
 * Every optional region OPEN — the roster, the seals, the mode picker. A
 * composer with them shut would draw fewer sections, and fewer sections is
 * exactly the state in which a per-section rule stops being countable.
 */
function state(): EditPraxisState {
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
    metatasks: [],
    appliedMetatasks: new Set(),
    applyingMetatask: null,
    toggleMetatask: async () => {},
    appliedMetataskList: [],
    addMetatask: async () => {},
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
    showInviteBox: true,
    showMetatasks: true,
    showSealStack: true,
    duelMode: false,
    duelChipVisible: true,
    currentCharacterId: 3,
  } as unknown as EditPraxisState;
}

function render(
  slug: string | null,
  formFactor: "desktop" | "mobile" = "desktop",
): string {
  mocks.formFactor = formFactor;
  const Archetype = resolvedArchetype(
    pickVariant(surfaceMap("editPraxis"), slug, DefaultEditPraxis),
  )!;
  return renderToStaticMarkup(
    <MemoryRouter>
      <Archetype state={state()} />
    </MemoryRouter>,
  );
}

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/**
 * One substring per skin, taken from the rule element itself.
 *
 * Coven's braid also crowns the masthead, so its marker ends at the closing
 * quote: the masthead braid carries a `margin-top` after the min-width and the
 * rule braid does not.
 */
const ORNAMENT: Record<string, string> = {
  coven: 'class="cvn-braid" style="min-width:20px"',
  ephemerists: "height:1px;background:var(--faction-ephemerists-plate-brass);opacity:0.5",
  everymen: "border-top:2px dashed var(--everymen-red)",
  singularity: "border-top:1px dashed var(--faction-singularity-term-hair)",
  snide: "height:10px;background:var(--faction-snide-composer-bar)",
  ua: "height:1px;background:var(--faction-ua-hair)",
  // The zigzag names its own gradient; `id=` counts the DECLARATION, since the
  // `url(#…)` reference would double every instance.
  wow: 'id="wow-zig-',
  na: "height:1px;background:var(--faction-default-composer-hair)",
};

const SLUGS = Object.keys(ORNAMENT);
const WIDTHS = ["desktop", "mobile"] as const;
const AT_BOTH = SLUGS.flatMap((slug) => WIDTHS.map((w) => [slug, w] as const));

describe("the faction rule is drawn once, above the footer (#1707)", () => {
  // Both form factors: there is one tree at two widths (ADR-0065 §2), and the
  // issue asks for the count at both.
  it.each(AT_BOTH)("%s draws exactly one rule on %s", (slug, width) => {
    const markup = render(slug === "na" ? null : slug, width);
    expect(count(markup, ORNAMENT[slug])).toBe(1);
  });

  it.each(SLUGS)("%s draws that one rule below the Proof region", (slug) => {
    // Position, not just count: a single rule still sitting between two fields
    // would satisfy the count and miss the issue entirely.
    const markup = render(slug === "na" ? null : slug);
    const proof = markup.lastIndexOf(
      i18n.t("forms:editPraxis.composer.proofLabel"),
    );
    expect(proof).toBeGreaterThan(-1);
    expect(markup.indexOf(ORNAMENT[slug])).toBeGreaterThan(proof);
  });
});

describe("the last two archetype seams of #1706", () => {
  it.each(SLUGS)("%s draws no title character counter", (slug) => {
    const markup = render(slug === "na" ? null : slug);
    // `TitleCounter` renders `N/200`. The maxLength attribute stays — the
    // limit is real, it is the running readout the design has no room for.
    expect(markup).toContain('maxLength="200"');
    expect(markup).not.toMatch(/\d+\/200/);
  });

  it.each(SLUGS)("%s puts the word count in the Write-up header row", (slug) => {
    const markup = render(slug === "na" ? null : slug);
    const words = i18n.t("forms:editPraxis.composer.wordCount", { words: 4 });
    // The header row is the one holding the Write/Preview tablist. Both live
    // inside the section's `meta` span, so the count sits before the tablist
    // and — the part that used to be false — before the textarea.
    expect(count(markup, words)).toBe(1);
    expect(markup.indexOf(words)).toBeLessThan(markup.indexOf('role="tablist"'));
    expect(markup.indexOf(words)).toBeLessThan(markup.indexOf("<textarea"));
  });

  it("the drop target's label carries the design's second line", () => {
    // One catalog assertion for all eight: `or browse files` is the design's
    // own second line, and the target renders the label verbatim.
    expect(i18n.t("forms:editPraxis.composer.proofButton")).toContain("\n");
  });

  it.each(SLUGS)("%s centres the drop target at the design's padding", (slug) => {
    const markup = render(slug === "na" ? null : slug);
    expect(markup).toContain(i18n.t("forms:editPraxis.composer.proofButton"));
    // The three together are the target's geometry, and only the target's:
    // `pre-line` is what makes the label's second line a second line.
    expect(markup).toContain(
      "padding:var(--space-2xl) var(--space-lg);text-align:center;white-space:pre-line",
    );
    // The size hint stays OUTSIDE the target, where #1706 wanted it — so it
    // has to survive this, not move in.
    expect(markup).toContain(i18n.t("forms:editPraxis.composer.proofHelper"));
  });

  it.each(SLUGS)("%s left-rules the task slip in its accent", (slug) => {
    const markup = render(slug === "na" ? null : slug);
    expect(markup).toMatch(/border-left:2px solid var\(--[a-z-]+\)/);
  });
});

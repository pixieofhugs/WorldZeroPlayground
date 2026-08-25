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
const { resolveVariant } = await import("../../../../utils/factionDispatch");
const { resolvedArchetype } = await import("../../../../factions/lazyArchetype");

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
    setAutosaveAt: () => {},
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
  overrides: Partial<EditPraxisState> = {},
): string {
  mocks.formFactor = formFactor;
  const Archetype = resolvedArchetype(
    resolveVariant(surfaceMap("editPraxis"), slug),
  )!;
  return renderToStaticMarkup(
    <MemoryRouter>
      <Archetype state={{ ...state(), ...overrides }} />
    </MemoryRouter>,
  );
}

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/**
 * The composer's title `<input>`, matched off its own tag.
 *
 * `maxLength="200"` is the only attribute unique to it — #2179 removed the `id`,
 * which had existed solely so `ComposerSection`'s `htmlFor` could point at it,
 * and there is no longer a `<label>` to point.
 */
function titleInput(markup: string): string | undefined {
  return markup.match(/<input[^>]*maxLength="200"[^>]*>/)?.[0];
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

  it.each(SLUGS)("%s centres the drop target at the design's padding", (slug) => {
    const markup = render(slug === "na" ? null : slug);
    // The three together are the target's geometry, and only the target's:
    // `pre-line` is what makes the desktop label's second line a second line.
    expect(markup).toContain(
      "padding:var(--space-2xl) var(--space-lg);text-align:center;white-space:pre-line",
    );
    // The size hint stays OUTSIDE the target, where #1706 wanted it — so it
    // has to survive this, not move in.
    expect(markup).toContain(i18n.t("forms:editPraxis.composer.proofHelper"));
  });

  // na is not in this list since #2520: its slip's 2px left ink bar came off
  // with the masthead band, so the sheet's own spectrum frame is the only rule
  // around the page's chrome. The seven dressed skins keep theirs — the design
  // took the bar off the UNAFFILIATED kit, not out of the shared contract.
  it.each(SLUGS.filter((slug) => slug !== "na"))(
    "%s left-rules the task slip in its accent",
    (slug) => {
      const markup = render(slug);
      // `[,)]` rather than `)`: a skin migrated onto `utils/factionRoles.ts`
      // asks its faction for the `accent` ROLE and carries today's token as the
      // fallback (#2674), so the rule reads `var(--<prefix>-accent, var(--…))`.
      // What this asserts is unchanged — a token, never a literal — and the
      // fallback itself is gated per surface, by
      // `utils/__tests__/factionRoleMigration.test.ts`.
      expect(markup).toMatch(/border-left:2px solid var\(--[a-z-]+[,)]/);
    },
  );
});

/**
 * THE na COMPOSER IS THE SPECTRUM SHEET (#2520, epic #2496).
 *
 * The design canvas gives the na kit the spectrum treatment so that Albescent's
 * delta can be MOTION alone. On this page na was carrying the louder half of
 * that already: a full-bleed rainbow band across the masthead which `.ep-edge`
 * WALKS for every player, unaffiliated ones included — so the society's
 * travelling sheet edge (#2505) was not a delta at all, it was a second moving
 * rainbow on the same page.
 *
 * So the strip comes off, the masthead's own 3px rule goes with it, the slip's
 * 2px left ink bar goes, and the sheet wears the kit's 3px spectrum frame — the
 * one the task card, the praxis card and (since earlier in this issue) the seal
 * all wear. Stilled, Albescent's edge is now a hairline just inside a spectrum
 * border rather than a second band.
 *
 * The seam is the rendered markup of `DefaultEditPraxis` at both stages: the
 * composer, and the waiting surface it hands `DEFAULT_COMPOSER_DRESS` to — the
 * masthead is carried ON the dress, so dropping it in one place and not the
 * other is exactly the drift the dress exists to prevent.
 */
describe("na's composer sheet wears the spectrum, and no band (#2520)", () => {
  const SHEET = [
    "border:3px solid transparent",
    "background-image:var(--faction-default-card-sheet),var(--faction-default-rainbow)",
    "background-origin:border-box",
  ];
  /** A background LIST renders with a space after each comma; close it up. */
  const stages = () => ({
    composing: render(null).replace(/\s*([:;,])\s*/g, "$1"),
    waiting: render(null, "desktop", { phase: "waiting" }).replace(
      /\s*([:;,])\s*/g,
      "$1",
    ),
  });

  it("draws no masthead band at either stage", () => {
    for (const [stage, markup] of Object.entries(stages())) {
      // The band's paint was the LOOP cut, which nothing else on this page
      // names, and `.ep-edge` is the class that walked it.
      expect(markup, stage).not.toContain("--faction-default-rainbow-loop");
      expect(markup, stage).not.toContain("ep-edge");
    }
  });

  it("frames the sheet in the kit's own 3px spectrum instead", () => {
    for (const [stage, markup] of Object.entries(stages())) {
      for (const declaration of SHEET) expect(markup, stage).toContain(declaration);
    }
  });

  it("takes the ink bar off the task slip", () => {
    expect(render(null)).not.toMatch(/border-left:2px solid var\(--[a-z-]+\)/);
  });
});

/**
 * The composer's title row, write-up row and drop target — #2093 / #2085 /
 * #2086 / #2089.
 *
 * All four are one-catalog-plus-eight-mounts changes, which is exactly the shape
 * this file already tests: the claim is what each of the eight skins DRAWS, the
 * strings come from the catalog rather than from a literal, and two of the four
 * differ by form factor.
 */
describe("the composer's title, write-up and proof rows", () => {
  it("the title's name still says the field is required (#2093, #2179)", () => {
    // One catalog value, inherited by all eight mounts. #2179 took it OFF THE
    // SCREEN — it is the input's `aria-label` now, not a drawn heading — so the
    // case here is the case a screen reader reads, with no `composerLabelStyle`
    // uppercasing it on the way.
    expect(i18n.t("forms:editPraxis.composer.titleLabel")).toMatch(/required/i);
  });

  it.each(SLUGS)("%s marks the title input required (#2093)", (slug) => {
    const markup = render(slug === "na" ? null : slug);
    // The native attribute, not a drawn asterisk: it is what carries the
    // required STATE into the accessibility tree, which a `*` glyph does not.
    // Matched off the tag rather than the whole document so attribute order
    // cannot make this pass by accident.
    const input = titleInput(markup);
    expect(input).toBeDefined();
    expect(input).toContain("required");
  });

  it.each(SLUGS)("%s draws no visible Write-up label (#2085)", (slug) => {
    const markup = render(slug === "na" ? null : slug);
    expect(markup).not.toContain(i18n.t("forms:editPraxis.composer.writeUpLabel"));
    // And no dangling accessible name. `id` on the editor host is what made
    // `ComposerSection`'s `htmlFor` reachable as `aria-labelledby="<id>-label"`;
    // with the heading gone that label element no longer exists, so the id goes
    // with it and `bodyContentAttributes` names the editor from the catalog
    // instead (see bodySpellcheck.test.ts). A placeholder is not a name.
    expect(markup).not.toContain('id="composer-body"');
  });

  it.each(SLUGS)("%s prints no word count (#2086)", (slug) => {
    const markup = render(slug === "na" ? null : slug);
    expect(markup).not.toMatch(/\d+\s+words/);
  });

  it("the drop target's label loses the drag half on a phone (#2089)", () => {
    // The desktop line offers something a phone cannot do. Two catalog
    // assertions for all eight mounts: the design's second line is still there
    // on desktop, and the phone's copy is a single line.
    expect(i18n.t("forms:editPraxis.composer.proofButton")).toContain("\n");
    expect(i18n.t("forms:editPraxis.composer.proofButtonMobile")).not.toContain(
      "\n",
    );
  });

  it.each(AT_BOTH)("%s draws its %s drop-target label (#2089)", (slug, width) => {
    const markup = render(slug === "na" ? null : slug, width);
    const desktop = i18n.t("forms:editPraxis.composer.proofButton");
    const mobile = i18n.t("forms:editPraxis.composer.proofButtonMobile");
    const [drawn, absent] =
      width === "mobile" ? [mobile, desktop] : [desktop, mobile];
    expect(markup).toContain(drawn);
    expect(markup).not.toContain(absent);
  });
});

/**
 * The field names move into the placeholders (#2179) — reversing #2093's
 * VISIBLE half, and only that half.
 *
 * "Gone" cannot be tested here as "the string is absent": `titleLabel` is still
 * in the markup, as the input's `aria-label`. It is tested as a COUNT — exactly
 * one occurrence, and that one proved below to be the attribute. A second
 * occurrence is a heading that came back.
 *
 * `writeUpLabel` keeps #2085's absence test above instead: the write-up's name
 * rides on `bodyContentAttributes`, which an effect applies to a CodeMirror
 * element this harness never builds.
 */
describe("the composer's field names move into the placeholders (#2179)", () => {
  it("the placeholders ARE the field names", () => {
    // `Write-up`, not `Description`: a task has a description, a praxis has a
    // write-up, and the task's own description sits on the slip inches above
    // this box (owner ruling on #2179).
    expect(i18n.t("forms:editPraxis.composer.titlePlaceholder")).toBe("Title");
    expect(i18n.t("forms:editPraxis.composer.bodyPlaceholder")).toBe("Write-up");
  });

  it.each(AT_BOTH)("%s draws no visible Title label on %s", (slug, width) => {
    const markup = render(slug === "na" ? null : slug, width);
    expect(count(markup, i18n.t("forms:editPraxis.composer.titleLabel"))).toBe(1);
    // The id went with the `<label htmlFor>` that was its only reader — the
    // same move #2085 made for `composer-body`.
    expect(markup).not.toContain('id="composer-title"');
  });

  it.each(SLUGS)("%s names and fills the title input from the catalog", (slug) => {
    const markup = render(slug === "na" ? null : slug);
    const input = titleInput(markup);
    expect(input).toBeDefined();
    // The single occurrence counted above, here shown to be the accessible
    // name. A placeholder is not a name: it is gone the moment there is text.
    expect(input).toContain(
      `aria-label="${i18n.t("forms:editPraxis.composer.titleLabel")}"`,
    );
    expect(input).toContain(
      `placeholder="${i18n.t("forms:editPraxis.composer.titlePlaceholder")}"`,
    );
  });

  it.each(SLUGS)("%s reports an empty title IN TEXT on submit", (slug) => {
    // `(required)` left the screen; the constraint did not. The placeholder
    // cannot carry it (gone once there is text) and colour is not a report, so
    // the sheet has to SAY it — inside a live region, because publish is an
    // onClick with no `<form>` and therefore no native validation announcement.
    const message = i18n.t("forms:editPraxis.errors.titleRequired");
    const markup = render(slug === "na" ? null : slug, "desktop", {
      error: message,
    });
    expect(markup).toContain(message);
    expect(markup).toContain('role="alert"');
  });
});

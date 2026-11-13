/**
 * The faction rule is a footer mark, drawn once above the footer, not a
 * section divider (#1707), plus #1706's last two seams. Countable on purpose:
 * a presence check passes a six-braid version too. `ORNAMENT` markers come from
 * the rule element, not token names (tokens also paint mastheads and fields).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../../i18n";
import i18n from "../../../../i18n";
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

/** Every optional region open, so a per-section rule would be countable. */
function state(): EditPraxisState {
  return anEditPraxisState({
    praxis: PRAXIS,
    task: TASK,
    // Spelled: `PRAXIS.title` is `string | null`, the draft title is not.
    title: "Two crates and a wobbly trolley",
    body: "## What I did\n\nWheeled them down.",
    autoSubmitDays: 10,
    showInviteBox: true,
    showSealStack: true,
    duelChipVisible: true,
  });
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

/** The title `<input>`; `maxLength="200"` is its only unique attribute (#2179). */
function titleInput(markup: string): string | undefined {
  return markup.match(/<input[^>]*maxLength="200"[^>]*>/)?.[0];
}

/**
 * One substring per skin from the rule element. Coven's braid also crowns the
 * masthead, which adds a `margin-top`, so its marker ends at the quote.
 */
const ORNAMENT: Record<string, string> = {
  coven: 'class="cvn-braid" style="min-width:20px"',
  ephemerists: "height:1px;background:var(--faction-ephemerists-plate-brass);opacity:0.5",
  everymen: "border-top:2px dashed var(--everymen-red)",
  singularity: "border-top:1px dashed var(--faction-singularity-term-hair)",
  snide: "height:10px;background:var(--faction-snide-composer-bar)",
  ua: "height:1px;background:var(--faction-ua-hair)",
  // `id=` counts the declaration; `url(#…)` would double-count.
  wow: 'id="wow-zig-',
  na: "height:1px;background:var(--faction-default-composer-hair)",
};

const SLUGS = Object.keys(ORNAMENT);

/**
 * The slip's 2px ink bar from a token, bare or through one role read falling
 * back to one (#2659). Never a literal; fallbacks gated by
 * `factionRoleMigration.test.ts`.
 */
const SLIP_LEFT_RULE =
  /border-left:2px solid var\((?:--[\w-]+,\s*var\()?--[a-z-]+\)\)?/;
const WIDTHS = ["desktop", "mobile"] as const;
const AT_BOTH = SLUGS.flatMap((slug) => WIDTHS.map((w) => [slug, w] as const));

describe("the faction rule is drawn once, above the footer (#1707)", () => {
  // One tree at two widths (ADR-0065 §2).
  it.each(AT_BOTH)("%s draws exactly one rule on %s", (slug, width) => {
    const markup = render(slug === "na" ? null : slug, width);
    expect(count(markup, ORNAMENT[slug])).toBe(1);
  });

  it.each(SLUGS)("%s draws that one rule below the Proof region", (slug) => {
    // Position too: one rule between two fields would pass the count.
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
    // The limit stays; only the `N/200` readout goes.
    expect(markup).toContain('maxLength="200"');
    expect(markup).not.toMatch(/\d+\/200/);
  });

  it.each(SLUGS)("%s centres the drop target at the design's padding", (slug) => {
    const markup = render(slug === "na" ? null : slug);
    // `pre-line` breaks the desktop label's second line.
    expect(markup).toContain(
      "padding:var(--space-2xl) var(--space-lg);text-align:center;white-space:pre-line",
    );
    // The size hint stays outside the target (#1706).
    expect(markup).toContain(i18n.t("forms:editPraxis.composer.proofHelper"));
  });

  // na dropped its bar for the spectrum frame (#2520); the shared contract stands.
  it.each(SLUGS.filter((slug) => slug !== "na"))(
    "%s left-rules the task slip in its accent",
    (slug) => {
      const markup = render(slug);
      expect(markup).toMatch(SLIP_LEFT_RULE);
    },
  );
});

/**
 * The na composer is the spectrum sheet (#2520): no walked masthead band, so
 * Albescent's delta can be motion alone; the sheet wears the kit's 3px spectrum
 * frame. Checked at both stages, since the masthead rides on the shared dress.
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
      // The band was the LOOP cut, walked by `.ep-edge`.
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
    expect(render(null)).not.toMatch(SLIP_LEFT_RULE);
  });
});

/** Title, write-up and drop-target rows (#2093, #2085, #2086, #2089). */
describe("the composer's title, write-up and proof rows", () => {
  it("the title's name still says the field is required (#2093, #2179)", () => {
    // Now only the input's `aria-label` (#2179): what a screen reader reads.
    expect(i18n.t("forms:editPraxis.composer.titleLabel")).toMatch(/required/i);
  });

  it.each(SLUGS)("%s marks the title input required (#2093)", (slug) => {
    const markup = render(slug === "na" ? null : slug);
    // The native attribute carries the required state to the a11y tree; a `*` doesn't.
    const input = titleInput(markup);
    expect(input).toBeDefined();
    expect(input).toContain("required");
  });

  it.each(SLUGS)("%s draws no visible Write-up label (#2085)", (slug) => {
    const markup = render(slug === "na" ? null : slug);
    expect(markup).not.toContain(i18n.t("forms:editPraxis.composer.writeUpLabel"));
    // No dangling `aria-labelledby` target; `bodyContentAttributes` names the
    // editor (bodySpellcheck.test.ts).
    expect(markup).not.toContain('id="composer-body"');
  });

  it.each(SLUGS)("%s prints no word count (#2086)", (slug) => {
    const markup = render(slug === "na" ? null : slug);
    expect(markup).not.toMatch(/\d+\s+words/);
  });

  it("the drop target's label loses the drag half on a phone (#2089)", () => {
    // A phone can't drag: desktop keeps two lines, mobile one.
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
 * Field names move into the placeholders (#2179). `titleLabel` remains as the
 * `aria-label`, so "gone" is a count of exactly one. `writeUpLabel` uses the
 * absence test above (its name is applied by a CodeMirror effect).
 */
describe("the composer's field names move into the placeholders (#2179)", () => {
  it("the placeholders ARE the field names", () => {
    // `Write-up`, not `Description`: that's the task's (owner ruling, #2179).
    expect(i18n.t("forms:editPraxis.composer.titlePlaceholder")).toBe("Title");
    expect(i18n.t("forms:editPraxis.composer.bodyPlaceholder")).toBe("Write-up");
  });

  it.each(AT_BOTH)("%s draws no visible Title label on %s", (slug, width) => {
    const markup = render(slug === "na" ? null : slug, width);
    expect(count(markup, i18n.t("forms:editPraxis.composer.titleLabel"))).toBe(1);
    // The id's only reader was the removed `<label htmlFor>`.
    expect(markup).not.toContain('id="composer-title"');
  });

  it.each(SLUGS)("%s names and fills the title input from the catalog", (slug) => {
    const markup = render(slug === "na" ? null : slug);
    const input = titleInput(markup);
    expect(input).toBeDefined();
    // The one occurrence is the accessible name; a placeholder isn't one.
    expect(input).toContain(
      `aria-label="${i18n.t("forms:editPraxis.composer.titleLabel")}"`,
    );
    expect(input).toContain(
      `placeholder="${i18n.t("forms:editPraxis.composer.titlePlaceholder")}"`,
    );
  });

  it.each(SLUGS)("%s reports an empty title IN TEXT on submit", (slug) => {
    // Must be said in a live region: publish is an onClick, no `<form>` validation.
    const message = i18n.t("forms:editPraxis.errors.titleRequired");
    const markup = render(slug === "na" ? null : slug, "desktop", {
      error: message,
    });
    expect(markup).toContain(message);
    expect(markup).toContain('role="alert"');
  });
});

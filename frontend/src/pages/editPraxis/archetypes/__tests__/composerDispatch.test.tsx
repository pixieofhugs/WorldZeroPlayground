/**
 * Composer dispatch and the mode picker at both form factors (#1181, ADR-0065):
 * the same archetype answers at both widths and ModePicker's gates match.
 * Rendered through `<EditPraxis />` so the dispatcher is in the path.
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
  formFactor: "desktop" as "mobile" | "desktop",
  state: null as EditPraxisState | null,
}));

vi.mock("../../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));
// Partial: `isWaitingStage` stays REAL, or the waiting-stage tests pass vacuously.
vi.mock("../../useEditPraxis", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../useEditPraxis")>()),
  useEditPraxis: () => mocks.state,
}));

// Imported after the mocks are registered.
import EditPraxis from "../../../EditPraxis";
import DefaultEditPraxis from "../DefaultEditPraxis";
import AlbescentEditPraxis from "../AlbescentEditPraxis";
import { surfaceMap } from "../../../../factions";
import { resolveVariant } from "../../../../utils/factionDispatch";
import { resolvedArchetype } from "../../../../factions/lazyArchetype";
import { collabCopy } from "../../../../components/collab/collabCopy";

const SOLO = i18n.t("forms:editPraxis.composer.modeSolo");
const COLLAB = i18n.t("forms:editPraxis.composer.modeCollab");
const DUEL = i18n.t("forms:editPraxis.composer.modeDuel");

function task(allowedModes: string[], slug: string | null = null): TaskOut {
  return {
    id: 7,
    title: "A Very Human Thing",
    description: "Do a small honest thing.",
    point_value: 20,
    level_required: 1,
    status: "active",
    task_type: "standard",
    created_by: 3,
    primary_faction_slug: slug,
    metatask_faction_slug: null,
    created_at: "2026-01-01T00:00:00Z",
    can_sign_up: true,
    allowed_modes: allowedModes,
    eligible_for_current_user: true,
  } as unknown as TaskOut;
}

const praxis = {
  id: 55,
  task_id: 7,
  task_title: "A Very Human Thing",
  type: "solo",
  status: "in_progress",
  title: "I helped a stranger",
  body_text: "## What I did\n\nCaught the papers.",
  moderation_status: "visible",
  duel_id: null,
  members: [],
  invites: [],
  media_items: [],
} as unknown as PraxisOut;

function baseState(overrides: Partial<EditPraxisState> = {}): EditPraxisState {
  return anEditPraxisState({
    praxis,
    task: task(["solo", "collab", "duel"]),
    title: "I helped a stranger",
    body: "## What I did\n\nCaught the papers.",
    autoSubmitDays: 10,
    ...overrides,
  });
}

function render(
  formFactor: "mobile" | "desktop",
  state: EditPraxisState,
): string {
  mocks.formFactor = formFactor;
  mocks.state = state;
  return renderToStaticMarkup(
    <MemoryRouter>
      <EditPraxis />
    </MemoryRouter>,
  );
}

/** Segment buttons carry `aria-pressed`; counting them beats substring matching. */
function segmentCount(markup: string): number {
  return (markup.match(/aria-pressed=/g) ?? []).length;
}

const WIDTHS = ["desktop", "mobile"] as const;

describe("editPraxis dispatch (ADR-0065: one component, both widths)", () => {
  it("registers no mobile twin surface — the map is gone, not empty", () => {
    // The retired key isn't nameable (typed SURFACE_KEYS); check the survivor resolves.
    expect(
      resolvedArchetype(resolveVariant(surfaceMap("editPraxis"), null)),
    ).toBe(DefaultEditPraxis);
  });

  it.each(["__unregistered__", "na", null])(
    "falls %s through to DefaultEditPraxis (ADR-0065 §4)",
    (slug) => {
      expect(
        resolvedArchetype(resolveVariant(surfaceMap("editPraxis"), slug)),
      ).toBe(DefaultEditPraxis);
    },
  );

  // Albescent's borders move (#2404), so it gets a wrapper; still not a skin.
  it("albescent resolves to its wrapper, not to the na composer (#2505)", () => {
    expect(
      resolvedArchetype(resolveVariant(surfaceMap("editPraxis"), "albescent")),
    ).toBe(AlbescentEditPraxis);
  });

  // Every registered skin plus the na fallback (null), so a new faction is covered.
  const SKINS: (string | null)[] = [null, ...Object.keys(surfaceMap("editPraxis"))];
  const CASES = SKINS.flatMap((slug) => WIDTHS.map((width) => [slug, width] as const));

  function renderSkin(slug: string | null, width: "mobile" | "desktop"): string {
    const Archetype = resolvedArchetype(resolveVariant(surfaceMap("editPraxis"), slug))!;
    mocks.formFactor = width;
    return renderToStaticMarkup(
      <MemoryRouter>
        <Archetype state={baseState({ duelChipVisible: true })} />
      </MemoryRouter>,
    );
  }

  it.each(CASES)("%s draws the neutral composer regions on %s", (slug, width) => {
    const markup = renderSkin(slug, width);
    // `titleLabel` is the input's aria-label, not a heading (#2179; composerRule.test.tsx).
    // No `writeUpLabel` (#2085): it lives on a CodeMirror-built element
    // (bodySpellcheck.test.ts).
    for (const key of ["taskLabel", "titleLabel", "modeLabel", "proofLabel", "submit"] as const) {
      expect(markup).toContain(i18n.t(`forms:editPraxis.composer.${key}`));
    }
  });

  it.each(CASES)("%s draws exactly one breadcrumb on %s", (slug, width) => {
    // The dispatcher's breadcrumb is waiting-surface only; the archetype paints its own.
    expect((renderSkin(slug, width).match(/<nav/g) ?? []).length).toBe(1);
  });
});

/**
 * The stage swap (#1189, ADR-0059): once your part is in, each ARCHETYPE hands
 * `PraxisWaitingSurface` its dress, so it must hold per skin. Unwrapped through
 * `resolvedArchetype` because manifest entries are lazy loaders (#1045).
 */
describe("every skin swaps in the waiting surface (#1189)", () => {
  const SUBMITTED = "2026-02-01T00:00:00Z";
  const waitingState = (slug: string | null) =>
    baseState({
      phase: "waiting",
      task: task(["solo", "collab", "duel"], slug),
      praxis: {
        ...praxis,
        type: "collab",
        task_faction_slug: slug,
        task_point_value: 20,
        created_by_id: 3,
        submitted_at: SUBMITTED,
        updated_at: SUBMITTED,
        submit_proposed_at: SUBMITTED,
        members: [],
        score: 20,
        metatask_points: 0,
        display_multiplier: 1,
        points_from_votes: 0,
      } as unknown as PraxisOut,
    });

  /** Every `editPraxis` slug from the registry (#2815), plus factionless `null`. */
  const SLUGS: (string | null)[] = [
    null,
    ...Object.keys(surfaceMap("editPraxis")),
  ];

  it.each(SLUGS)("%s draws the waiting reading, not its composer", (slug) => {
    const Archetype = resolvedArchetype(
      resolveVariant(surfaceMap("editPraxis"), slug),
    )!;
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <Archetype state={waitingState(slug)} />
      </MemoryRouter>,
    );
    expect(markup).toContain(collabCopy(slug, "awaitingHeading"));
    // `Proof` is composer-only and, unlike `Submit`, prefixes nothing on the waiting surface.
    expect(markup).not.toContain(i18n.t("forms:editPraxis.composer.proofLabel"));
  });

  /** One masthead or ground token per skin; absent if the page chrome were drawn. */
  const ORNAMENT: Record<string, string> = {
    coven: "--faction-coven-slip-shadow",
    ephemerists: "--faction-ephemerists-plate-band",
    everymen: "--faction-everymen-bill-mast",
    singularity: "--faction-singularity-term-chrome",
    snide: "--faction-snide-composer-bar",
    ua: "--faction-ua-card-lotus",
    wow: "--faction-wow-quest-ribbon",
  };

  it.each(Object.keys(ORNAMENT))(
    "%s wears its own ornament on the waiting surface, not the page's chrome",
    (slug) => {
      const Archetype = resolvedArchetype(
        resolveVariant(surfaceMap("editPraxis"), slug),
      )!;
      const markup = renderToStaticMarkup(
        <MemoryRouter>
          <Archetype state={waitingState(slug)} />
        </MemoryRouter>,
      );
      expect(markup).toContain(ORNAMENT[slug]);
    },
  );

  it("the Ephemerists ground is the gravity field, not lined paper (#1830)", () => {
    // `dress.ground` is shared with the composer. Geometry: ephemeristsGravity.test.tsx;
    // here, only that the old ruling is gone.
    const Archetype = resolvedArchetype(
      resolveVariant(surfaceMap("editPraxis"), "ephemerists"),
    )!;
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <Archetype state={waitingState("ephemerists")} />
      </MemoryRouter>,
    );
    expect(markup).toContain('preserveAspectRatio="xMaxYMin slice"');
    expect(markup).not.toContain("repeating-linear-gradient");
  });

  it("na falls through to the spectrum kit's own frame (ADR-0065 §4)", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <DefaultEditPraxis state={waitingState(null)} />
      </MemoryRouter>,
    );
    // na's spectrum is the sheet's static 3px frame (#2520).
    expect(markup).toContain("border:3px solid transparent");
    expect(markup).toContain("var(--faction-default-rainbow)");
    expect(markup).not.toContain("--faction-default-rainbow-loop");
  });

  it.each(
    WIDTHS.flatMap((width) => SLUGS.map((slug) => [width, slug] as const)),
  )(
    "draws exactly one breadcrumb on %s while %s waits",
    (width, slug) => {
      mocks.formFactor = width;
      const Archetype = resolvedArchetype(
        resolveVariant(surfaceMap("editPraxis"), slug),
      )!;
      const markup = renderToStaticMarkup(
        <MemoryRouter>
          <Archetype state={waitingState(slug)} />
        </MemoryRouter>,
      );
      expect((markup.match(/<nav/g) ?? []).length).toBe(1);
    },
  );
});

/** The composer's shared layout seams (#1828), so no skin drifts off them. */
describe("the composer's shared seams (#1828)", () => {
  /** Every slug that registers `editPraxis`, plus the two that fall through. */
  const BAND_SLUGS = ["coven", "ephemerists", "everymen", "singularity", "snide", "ua", "wow"];
  const INLINE_SLUGS = [null, "albescent"];

  const composingState = (slug: string | null, over: Record<string, unknown> = {}) =>
    baseState({
      task: task(["solo", "collab", "duel"], slug),
      praxis: {
        ...praxis,
        task_faction_slug: slug,
        task_point_value: 20,
        score: 20,
        metatask_points: 0,
        display_multiplier: 1,
        points_from_votes: 0,
        habit_bonus_points: 0,
        is_top_for_task: false,
        ...over,
      } as unknown as PraxisOut,
      // `formatAutosave` is relative to now; a fixed instant would drift.
      autosaveAt: new Date(),
    });

  const composer = (
    slug: string | null,
    width: "mobile" | "desktop" = "desktop",
    over: Record<string, unknown> = {},
  ) => {
    mocks.formFactor = width;
    const Archetype = resolvedArchetype(
      resolveVariant(surfaceMap("editPraxis"), slug),
    )!;
    return renderToStaticMarkup(
      <MemoryRouter>
        <Archetype state={composingState(slug, over)} />
      </MemoryRouter>,
    );
  };

  /** The band negates the sheet insets; the rungs per width live in CSS now (no media query in node). */
  const BLEED = {
    desktop: "margin:0 calc(-1 * var(--composer-pad-x)) calc(-1 * var(--composer-pad-bottom))",
    mobile: "margin:0 calc(-1 * var(--composer-pad-x)) calc(-1 * var(--composer-pad-bottom))",
  } as const;

  it.each(WIDTHS.flatMap((w) => BAND_SLUGS.map((s) => [w, s] as const)))(
    "bleeds %s's submit band to the sheet's edges for %s",
    (width, slug) => {
      const markup = composer(slug, width);
      expect(markup).toContain(BLEED[width]);
      // Edged in the sheet's frame: a bare token or a role read falling back to
      // one (#2659); `border: none` fails.
      expect(markup).toMatch(
        /border-top:1\.5px solid var\((?:--[\w-]+,\s*var\()?--[a-z-]+\)\)?/,
      );
    },
  );

  it.each(WIDTHS.flatMap((w) => INLINE_SLUGS.map((s) => [w, s] as const)))(
    "keeps the inline button on %s for %s — the unaffiliated kit takes no band",
    (width, slug) => {
      expect(composer(slug, width)).not.toContain(BLEED[width]);
    },
  );

  const SAVED = i18n.t("forms:editPraxis.composer.statusSaved", {
    ago: i18n.t("forms:autosaveAgo.justNow"),
  });

  it.each([...INLINE_SLUGS, ...BAND_SLUGS])(
    "%s reads Draft alone, with the autosave line moved into the write-up header",
    (slug) => {
      const markup = composer(slug);
      const text = markup.replace(/<[^>]*>/g, "");
      expect(text).toContain(i18n.t("forms:editPraxis.composer.statusDraft"));
      // Autosave sits in the write-up header: between the title row and Proof.
      // Raw markup, since the title anchor is a placeholder ATTRIBUTE.
      const title = markup.indexOf(
        `placeholder="${i18n.t("forms:editPraxis.composer.titlePlaceholder")}"`,
      );
      const proof = markup.indexOf(i18n.t("forms:editPraxis.composer.proofLabel"));
      const saved = markup.indexOf(SAVED);
      expect(title).toBeGreaterThan(-1);
      expect(proof).toBeGreaterThan(title);
      expect(saved).toBeGreaterThan(title);
      expect(saved).toBeLessThan(proof);
    },
  );

  it.each([...INLINE_SLUGS, ...BAND_SLUGS])(
    "%s marks the task slip with the shared score stamp",
    (slug) => {
      // Only the stamp prints the praxis TOTAL (24), not the bare `point_value`.
      const text = composer(slug, "desktop", { points_from_votes: 4, score: 24 }).replace(
        /<[^>]*>/g,
        "",
      );
      expect(text).toContain("24");
    },
  );
});

describe("mode picker gates, unchanged by the collapse (#311, #877)", () => {
  it.each(WIDTHS)("shows all three segments on %s when the duel chip is visible", (width) => {
    const markup = render(width, baseState({ duelChipVisible: true }));
    expect(segmentCount(markup)).toBe(3);
    expect(markup).toContain(SOLO);
    expect(markup).toContain(COLLAB);
    expect(markup).toContain(DUEL);
  });

  it.each(WIDTHS)("hides the duel segment on %s below the level gate", (width) => {
    const markup = render(width, baseState({ duelChipVisible: false }));
    expect(segmentCount(markup)).toBe(2);
    expect(markup).not.toContain(DUEL);
  });

  /** Fail closed (#1709): an unknown task yields no modes, not all three. */
  it.each(WIDTHS)("offers no modes on %s while the task is unknown", (width) => {
    const markup = render(width, baseState({ task: null }));
    expect(segmentCount(markup)).toBe(0);
    expect(markup).not.toContain(SOLO);
    expect(markup).not.toContain(COLLAB);
  });

  it.each(WIDTHS)("offers exactly the task's modes on %s once it arrives", (width) => {
    const markup = render(width, baseState({ task: task(["solo"]) }));
    expect(segmentCount(markup)).toBe(1);
    expect(markup).toContain(SOLO);
    expect(markup).not.toContain(COLLAB);
  });

  it.each(WIDTHS)("collapses to the single active option on %s once locked", (width) => {
    const markup = render(
      width,
      baseState({ modeIsLocked: true, duelChipVisible: true }),
    );
    expect(segmentCount(markup)).toBe(1);
    expect(markup).toContain(SOLO);
    expect(markup).not.toContain(COLLAB);
  });
});

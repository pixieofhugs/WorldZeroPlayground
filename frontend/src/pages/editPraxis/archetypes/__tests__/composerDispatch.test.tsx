/**
 * Composer dispatch and the mode picker, at BOTH form factors (#1181).
 *
 * Successor to `mobileArchetypes/__tests__/dispatch.test.tsx` and
 * `modePicker.test.tsx`, which went with the `mobileEditPraxis` surface ADR-0065
 * retired. Those two proved the form-factor BRANCH (phone → the mobile twin,
 * desktop → the archetype) and the mode gates as they reached the phone skin.
 * There is no branch left to prove, so what replaces them is the claim the
 * collapse actually makes: **the same archetype answers at both widths, and the
 * shared ModePicker's gates behave identically there.**
 *
 * Rendered through `<EditPraxis />` rather than the archetype directly, so the
 * dispatcher is in the path — a regression that re-introduced a form-factor
 * branch, or dropped `editPraxis` from the surface map, fails here.
 *
 * The gates themselves are `controls.tsx`'s and are not re-derived per skin:
 * the duel chip hides below the level gate (#311, hide-don't-disable), and a
 * locked mode collapses to the single active option instead of a dead toggle.
 *
 * renderToStaticMarkup needs no DOM, matching the rest of this suite.
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
  formFactor: "desktop" as "mobile" | "desktop",
  state: null as EditPraxisState | null,
}));

vi.mock("../../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));
// Partial: `isWaitingStage` stays REAL. It is the predicate every archetype
// asks before swapping in the waiting surface (#1189), and a stubbed one would
// let the dispatcher assertions below pass against a stage that never happens.
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
  return {
    loading: false,
    phase: "composing",
    praxis,
    task: task(["solo", "collab", "duel"]),
    error: "",
    setError: () => {},
    title: "I helped a stranger",
    setTitle: () => {},
    body: "## What I did\n\nCaught the papers.",
    setBody: () => {},
    media: [],
    fileError: "",
    handleFileChange: () => {},
    removeMedia: async () => {},
    pendingImage: null,
    confirmImageEdit: async () => {},
    cancelImageEdit: () => {},
    reportImageError: () => {},
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
    nudge: async () => {},
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
    metataskPickerOpen: false,
    openMetataskPicker: () => {},
    closeMetataskPicker: () => {},
    metataskRemovalTarget: null,
    requestRemoveMetatask: () => {},
    confirmRemoveMetatask: async () => {},
    cancelRemoveMetatask: () => {},
    submitting: false,
    publish: async () => {},
    saveDraft: async () => {},
    pullBack: async () => {},
    reopenForEdit: async () => {},
    leaveCollab: async () => {},
    collabSuccess: false,
    continueFromCollabSuccess: () => {},
    duelSealOpen: false,
    requestDuelSeal: () => {},
    cancelDuelSeal: () => {},
    pendingConfirm: null,
    acceptConfirm: () => {},
    dismissConfirm: () => {},
    cancel: async () => {},
    autosaveAt: null,
    setAutosaveAt: () => {},
    autoSubmitDays: 10,
    isPublished: false,
    controlsLocked: false,
    modeIsLocked: false,
    showInviteBox: false,
    showMetatasks: false,
    canSealMetatask: false,
    showSealStack: false,
    duelMode: false,
    duelChipVisible: false,
    currentCharacterId: 3,
    ...overrides,
  } as unknown as EditPraxisState;
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
    // `surfaceMap` is typed against SURFACE_KEYS, so the retired key is not even
    // nameable here; this asserts the surviving surface still resolves.
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

  // `albescent` was on that list until #2505 (epic #2496). ADR-0065 §4's
  // "Albescent registers nothing here" held while the two kits were
  // pixel-identical; #2404 ruled that Albescent's borders move, and this is the
  // composer's share of that. It is still not a skin — see the wrapper's own
  // assertions below.
  it("albescent resolves to its wrapper, not to the na composer (#2505)", () => {
    expect(
      resolvedArchetype(resolveVariant(surfaceMap("editPraxis"), "albescent")),
    ).toBe(AlbescentEditPraxis);
  });

  it.each(WIDTHS)("renders the composer's own regions on %s", (width) => {
    const markup = render(width, baseState());
    expect(markup).toContain(i18n.t("forms:editPraxis.composer.taskLabel"));
    // `titleLabel` is in the markup as the input's `aria-label` since #2179 —
    // NOT as a heading. This asserts the region is present and neutrally worded;
    // that it is no longer DRAWN is composerRule.test.tsx's countable claim.
    expect(markup).toContain(i18n.t("forms:editPraxis.composer.titleLabel"));
    // No `writeUpLabel`: #2085 took that heading off the page as redundant
    // beside the box's own placeholder. The key still names the editor, through
    // `bodyContentAttributes` — an attribute on an element CodeMirror builds in
    // an effect, so it is not in a static render at all (bodySpellcheck.test.ts).
    expect(markup).toContain(i18n.t("forms:editPraxis.composer.proofLabel"));
    expect(markup).toContain(i18n.t("forms:editPraxis.composer.submit"));
  });

  it.each(WIDTHS)("draws exactly one breadcrumb on %s", (width) => {
    // The dispatcher's shared breadcrumb is now gated to the waiting surface
    // alone; the archetype paints its own at both widths. Before #1181 the gate
    // also fired on mobile, which would put two here.
    const markup = render(width, baseState());
    expect((markup.match(/<nav/g) ?? []).length).toBe(1);
  });
});

/**
 * The stage swap (#1189).
 *
 * Once your part is in, the composer stops being a composer (ADR-0059) and the
 * archetype hands `PraxisWaitingSurface` its own dress. That swap is the
 * ARCHETYPE's, not the dispatcher's, so it has to hold for every skin — a
 * faction that forgot the branch would draw a live composer over a submitted
 * praxis, and a faction that forgot the breadcrumb would strand the player.
 *
 * Rendered per skin rather than through `<EditPraxis />` so the slug under test
 * is the one being asserted on, and unwrapped through `resolvedArchetype`
 * because a manifest entry is a lazy loader (#1045).
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

  // Every slug that registers `editPraxis`, plus the two that fall through to
  // the na kit (ADR-0065 §4).
  const SLUGS = [
    null,
    "albescent",
    "coven",
    "ephemerists",
    "everymen",
    "singularity",
    "snide",
    "ua",
    "wow",
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
    // `Proof` is a composer-only region, and unlike `Submit` it is not a
    // prefix of anything the waiting surface says.
    expect(markup).not.toContain(i18n.t("forms:editPraxis.composer.proofLabel"));
  });

  /**
   * One token per skin, taken from its MASTHEAD or its GROUND — the two parts
   * #1071 left neutral. If the surface were still drawing the page's own chrome
   * these would all be absent, and the test would still find the heading above,
   * which is exactly the flat reading this issue was filed to end.
   */
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
    // The ground is `dress.ground`, so the composer and the waiting surface
    // mount the SAME element and this harness reaches both. The design replaced
    // the 25px journal ruling with a field bowed toward a well off the sheet's
    // right edge; `ephemeristsGravity.test.tsx` owns the field's geometry, and
    // what is pinned here is that the ruling did not survive beside it.
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
    // The spectrum was a walked masthead band (`--faction-default-rainbow-loop`)
    // until #2520 made it the sheet's static 3px frame — so the dress still
    // carries na's spectrum onto this stage, in the kit's own border idiom.
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

/**
 * The composer's SHARED seams (#1828), asserted across every skin at once.
 *
 * Each of these is a claim about the layout rather than about a faction, and
 * each was previously made eight times — or, in the band's case, three times in
 * three different shapes and five times not at all. They are asserted here, on
 * the composing stage of every registered archetype, because the failure this
 * guards is one skin drifting off the shared affordance and nothing noticing.
 */
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
      // `formatAutosave` is relative to now, so the fixture has to be too —
      // a fixed instant renders "42 minutes ago" and grows every day.
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

  /**
   * The bleed, as the geometry rather than as a colour: the band negates the
   * sheet's own side and bottom insets, which is the only way a child of a
   * padded column reaches its parent's edge. Desktop and mobile spend different
   * rungs, so both are named.
   */
  const BLEED = {
    desktop: "margin:0 calc(-1 * var(--space-2xl)) calc(-1 * var(--space-2xl))",
    mobile: "margin:0 calc(-1 * var(--space-lg)) calc(-1 * var(--space-xl))",
  } as const;

  it.each(WIDTHS.flatMap((w) => BAND_SLUGS.map((s) => [w, s] as const)))(
    "bleeds %s's submit band to the sheet's edges for %s",
    (width, slug) => {
      const markup = composer(slug, width);
      expect(markup).toContain(BLEED[width]);
      // …edged in the SHEET's frame, which is the half both hand-rolled bleeds
      // missed: S.N.I.D.E. drew `border: none` and the Everymen drew the rule in
      // the panels' ink.
      // A bare token, or a role read that falls back to one: a #2659 lane puts
      // a composer on `factionRoleVars`, so UA's band edge emits
      // `var(--leaf-edit-praxis-accent, var(--faction-ua-card-accent))`. Same value,
      // and `border: none` still fails.
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
      // The autosave string is still on the page — and now down in the write-up
      // header, which is the whole move. Before #1828 it sat in the status row,
      // i.e. above the task slip and every section. Pinned BETWEEN the title row
      // and the Proof region: #2085 removed the `Write-up` heading this used to
      // anchor on, and those two are the rows either side of the one it moved to.
      //
      // Measured on the raw markup, not on the stripped text: #2179 took the
      // visible `Title` heading off too, so the row's only remaining anchor is
      // the input's own placeholder — an ATTRIBUTE, which stripping tags throws
      // away. Anchoring on text that is no longer there would have left the
      // lower bound as `> -1` and quietly stopped measuring anything.
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
      // The stamp prints the praxis's TOTAL; every composer-only mark printed
      // the task's bare `point_value`. The claim used to ride on the stamp's
      // trailing decimal, which #1866 removed, so it rides on the FIGURE now:
      // votes move the total off the base, and only the stamp can say 24. That
      // holds for all eight skins without naming eight ornaments.
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

  /**
   * #1709 — the composer used to fail OPEN. Every archetype derived
   * `task?.allowed_modes ?? ["solo", "collab", "duel"]`, so while the task was
   * still loading (or its fetch had failed) the picker offered Collab to a
   * viewer the backend gates out of it by level. The list is now derived once,
   * inside ModePicker, from the state the picker already holds — and an unknown
   * task yields no modes at all.
   */
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

/**
 * One points mark per faction, drawn once (#2042).
 *
 * ## The two seams
 *
 * 1. THE MOUNT SEAM — the rendered markup of every surface a faction draws its
 *    points mark on: its task card, its praxis-card score stamp, and — for
 *    S.N.I.D.E. — its TASK DETAIL page. #2042's finding was that each faction drew
 *    its points mark on each with almost no sharing, so what has to hold is that
 *    one drawing now appears on all of them and the other copies are GONE. Every
 *    surface is named per faction below; nothing here asserts a count of unified
 *    factions, because #1998 shipped a `toHaveLength(5)` census that was clean
 *    while a sixth wrong mount sat beside it (#2090 replaced it with an explicit
 *    list). A faction that unifies has to be added here by name.
 *
 *    THE LIST IS THE ONLY CENSUS, and it has already been wrong once: #2042's own
 *    survey counted TWO S.N.I.D.E. surfaces while the task detail page hand-drew
 *    the loop a third time, so PR #2105 unified a mark that was still being copied
 *    somewhere it had not looked. A surface omitted here is invisible, not red.
 *
 * 2. THE PAIRING SEAM — the ruling settles WHETHER the mark propagates, not WHAT
 *    it looks like on the way. A mark drawn for a card lands on a score stamp
 *    whose ground is a different token, so its inks are re-measured against THAT
 *    ground, in both themes, off index.css itself. The trap this catches is
 *    concrete and lives in this repo's history: a theme-INVARIANT ground with a
 *    FLIPPING ink on it passes every other guard and is invisible in one theme
 *    (1.08:1, shipped and caught an hour later in this epic). S.N.I.D.E. is
 *    exactly that shape and the assertions below prove it both ways.
 *
 * WOW IS DELIBERATELY IN THE NOT-UNIFIED TABLE, with the arithmetic that keeps it
 * there. Three unified plus one measured refusal is the shape of #2042; a silent
 * omission is not.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ComponentType } from "react";
import { describe, it, expect, vi } from "vitest";

import "../../../../i18n";
import type { CardProps } from "../../../taskCard/TaskCard";
import type { PraxisCardOut } from "../../../../api/praxis";
import type { ScoreStampProps } from "../ScoreStamp";
import {
  AA_LARGE,
  AA_NORMAL,
  compositeOver,
  contrastRatio,
  formatRatio,
  parseColor,
  type Rgba,
} from "../../../../utils/contrast";
import { readThemes, resolveVar, type Theme } from "../../../../utils/__tests__/cssVars";

vi.mock("../../../../hooks/useFormFactor", () => ({ useFormFactor: () => "desktop" }));

// Imported after the mock is registered.
import DefaultTaskCard from "../../../taskCard/DefaultTaskCard";
import EphemeristsTaskCard from "../../../taskCard/EphemeristsTaskCard";
import SingularityTaskCard from "../../../taskCard/SingularityTaskCard";
import SnideTaskCard from "../../../taskCard/SnideTaskCard";
import WowTaskCard from "../../../taskCard/WowTaskCard";
import DefaultScoreStamp from "../DefaultScoreStamp";
import EphemeristsScoreStamp from "../EphemeristsScoreStamp";
import SingularityScoreStamp from "../SingularityScoreStamp";
import SnideScoreStamp from "../SnideScoreStamp";
import WowScoreStamp from "../WowScoreStamp";
import SnideTaskDetail from "../../../../pages/taskDetail/archetypes/SnideTaskDetail";
import type { TaskDetailState } from "../../../../pages/taskDetail/useTaskDetail";
import { aTask } from "../../../../test/fixtures";

const TASK = aTask({ description: "Leave something small where a stranger finds it." });
/** The same task, owned by S.N.I.D.E. — see `snideDetail` for why the slug matters. */
const SNIDE_TASK = aTask({
  description: "Leave something small where a stranger finds it.",
  primary_faction_slug: "snide",
});

/** A scored praxis with live working, so every surface draws its full stamp. */
const PRAXIS = {
  task_point_value: 12,
  display_multiplier: 1.5,
  metatask_points: 0,
  points_from_votes: 4,
  habit_bonus_points: 0,
  is_top_for_task: false,
  score: 22,
} as PraxisCardOut;

function card(Card: ComponentType<CardProps>): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <Card
        task={TASK}
        basePoints={TASK.point_value}
        multiplier={1}
        inProgressCount={0}
        onSignup={() => {}}
      />
    </MemoryRouter>,
  );
}

function stamp(Stamp: ComponentType<ScoreStampProps>): string {
  return renderToStaticMarkup(<Stamp praxis={PRAXIS} />);
}

/**
 * S.N.I.D.E.'s THIRD surface. The total here is `modifiedPoints`, four glyphs
 * wide on purpose: this page draws the widest figure the loop has to hold, which
 * is the argument for the shared 1.18× growth landing here rather than the
 * argument against it.
 *
 * IT NEEDS A S.N.I.D.E. TASK, and that stopped being optional in #2554. The task
 * this harness used to pass was `aTask()`, whose `primary_faction_slug` defaults
 * to `na` — harmless while the page hand-drew its own loop, and decisive now the
 * mark is DISPATCHED: `TaskWorthStamp` resolves the stamp from
 * `task.primary_faction_slug`, so an `na` task rendered na's points ring inside
 * the S.N.I.D.E. archetype and the loop went missing.
 *
 * That pairing cannot happen in the app. `TaskDetail.tsx` picks the archetype
 * from `state.task.primary_faction_slug` — the same field the adapter reads — so
 * the page and its stamp always agree about whose mark this is. The harness was
 * constructing a task detail that no route can produce; naming the slug is what
 * makes it render what a real S.N.I.D.E. task renders.
 */
function snideDetail(): string {
  const state: TaskDetailState = {
    loading: false,
    task: SNIDE_TASK,
    fetchError: null,
    submissions: [],
    comments: null,
    friends: new Set(),
    foes: new Set(),
    mySubmission: undefined,
    isInProgress: false,
    inProgressPraxisId: null,
    canSignUp: true,
    levelJumpSignup: false,
    slotsOpen: 4,
    maxTaskSlots: 13,
    basePoints: 120,
    factionMultiplier: 1.0,
    modifiedPoints: 1080,
    inProgressCount: 9,
    topScore: 0,
    voteCount: 0,
    submissionSort: "score",
    setSubmissionSort: () => {},
    sortedSubmissions: [],
    signupError: null,
    handleSignup: async () => {},
    handleDrop: async () => {},
    dropConfirm: null,
  };
  return renderToStaticMarkup(
    <MemoryRouter>
      <SnideTaskDetail state={state} />
    </MemoryRouter>,
  );
}

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/** The pen loop's own first stroke — drawn nowhere else on any of its surfaces. */
const PEN_LOOP = "M14 40 C13 19";

/**
 * Just the pen circle, cut out of a whole surface's markup.
 *
 * A `not.toContain` over a whole PAGE is the wrong instrument here and says so
 * loudly: the S.N.I.D.E. task detail prints `--faction-snide-note-ink` all over
 * the WALL, correctly — that family is what the flipping wall is for (#2066). The
 * defect is that ink reaching the SLAB the mark stands on, so the assertion has to
 * be scoped to the mark. `PenCircle` emits `<svg>` then two `<span>`s inside one
 * `<div>`, so the first `</div>` after the loop is the mark's own.
 */
function penCircle(markup: string): string {
  const at = markup.indexOf(PEN_LOOP);
  expect(at, "the pen loop must be drawn at all").toBeGreaterThan(-1);
  return markup.slice(markup.lastIndexOf("<div", at), markup.indexOf("</div>", at) + 6);
}

/* -------------------------------------------------------------------------- */
/* 1. The mount seam                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The three factions #2042 unified, each with BOTH surfaces named and the
 * fragment only the shared drawing emits.
 *
 * `retired` is the other half, and the half a "does it render" check would miss:
 * the declaration the surface drew when it had its OWN mark. Unifying that leaves
 * the old drawing behind next to the new one looks fine in markup and is two marks
 * on one surface.
 */
const UNIFIED = [
  {
    faction: "singularity",
    mark: "components/factionMarks/SingularityReadout.tsx",
    // The lit well: its own fill, which is what makes the ink pairing travel.
    fragment: "background:var(--faction-singularity-term-readout)",
    surfaces: {
      "components/taskCard/SingularityTaskCard.tsx": () => card(SingularityTaskCard),
      "components/praxisCard/scoreStamp/SingularityScoreStamp.tsx": () =>
        stamp(SingularityScoreStamp),
    },
    // The bare glowing numeral the stamp printed before it had the well.
    retired: ["color:var(--faction-singularity-bracket)"],
  },
  {
    faction: "snide",
    mark: "components/factionMarks/snideAtoms.tsx (PenCircle)",
    fragment: PEN_LOOP,
    surfaces: {
      "components/taskCard/SnideTaskCard.tsx": () => card(SnideTaskCard),
      "components/praxisCard/scoreStamp/SnideScoreStamp.tsx": () => stamp(SnideScoreStamp),
      "pages/taskDetail/archetypes/SnideTaskDetail.tsx": snideDetail,
    },
    // The misregistered pink second pass: the pink is the loop now.
    retired: ["text-shadow:2px 2px 0 var(--faction-snide-pink)"],
  },
  {
    faction: "na",
    mark: "components/factionMarks/DefaultPointsRing.tsx",
    // The annulus: the ring's padding band, filled by `.spectrum-dial` since
    // #2497 — the conic moved to index.css so Albescent can turn it from the
    // cascade instead of walking the DOM for an unclassed inline style. The
    // class is a STRONGER probe than the declaration it replaces: a second copy
    // of the drawing would have to claim the shared name to pass.
    fragment: 'class="spectrum-dial"',
    surfaces: {
      "components/taskCard/DefaultTaskCard.tsx": () => card(DefaultTaskCard),
      "components/praxisCard/scoreStamp/DefaultScoreStamp.tsx": () => stamp(DefaultScoreStamp),
    },
    // The struck disc's tilt and its rainbow-clipped numeral — plus the ring's
    // own inline conic, retired by #2497. Re-inlining it would put the paint
    // back out of the cascade's reach without failing the fragment above.
    retired: [
      "rotate(-7deg)",
      "var(--faction-default-total-rainbow)",
      "background:var(--faction-default-rainbow-conic)",
    ],
  },
  {
    // THE FOURTH FACTION TO UNIFY (#2145), added here by name because a surface
    // this list omits is invisible rather than red. `CompassRose` replaced the
    // task card's octagon in #2037 and the stamp kept striking its own copy of
    // that octagon until now; the ruling in #2042 is that a faction's points
    // mark is one drawing, and `ephemeristsCompassRose.test.tsx` holds the other
    // half — that the north needle's path is declared in exactly one file.
    faction: "ephemerists",
    mark: "components/factionMarks/ephemeristsPlate.tsx (CompassRose)",
    // The one filled needle, which is the rose's signature.
    fragment: "M50 8 L55.5 26 L44.5 26 Z",
    surfaces: {
      "components/taskCard/EphemeristsTaskCard.tsx": () => card(EphemeristsTaskCard),
      "components/praxisCard/scoreStamp/EphemeristsScoreStamp.tsx": () =>
        stamp(EphemeristsScoreStamp),
    },
    // The stepped octagon on its lotus base — the stamp's own second copy.
    retired: ["M30 4 L70 4 L96 30", "M18 74 H82"],
  },
] as const;

describe.each(UNIFIED)("$faction draws its points mark once (#2042)", (entry) => {
  for (const [path, render] of Object.entries(entry.surfaces)) {
    it(`${path} mounts ${entry.mark}, exactly once`, () => {
      expect(occurrences(render(), entry.fragment)).toBe(1);
    });

    it(`${path} no longer draws a second mark of its own`, () => {
      const markup = render();
      for (const gone of entry.retired) expect(markup).not.toContain(gone);
    });
  }
});

/**
 * The props that carry a mark across the ground change, asserted ON THE MOUNT.
 *
 * The token measurements further down prove that the card's inks fail on the
 * stamp's plate; they cannot see a mount that stopped passing them, because a
 * dropped prop silently falls back to the atom's default and every token in the
 * manifest still measures fine on its own surface. This is the assertion that goes
 * red for that, and it is the one that would have caught the 1.08:1 masthead ink
 * this epic shipped.
 */
describe("each mount overrides what its ground demands (#2042)", () => {
  it("S.N.I.D.E. passes its own two inks rather than the clipping's", () => {
    const chronicle = stamp(SnideScoreStamp);
    expect(chronicle, "the acid figure").toContain("color:var(--faction-snide-acid)");
    // The caption left `-card-muted` in #2177: the card around this tag wears
    // the flyposted wall now and its frame re-points that property at the wall's
    // family for the shared slots that take no ink prop, which would have landed
    // the wall's dark grey on this black plate. `-vote-off` is the typed-label
    // ink the BASE line on this same tag already prints, and it is invariant
    // like the plate. Still an OVERRIDE, which is what this assertion guards.
    expect(chronicle, "the typed caption").toContain("color:var(--faction-snide-vote-off)");
    // `-note-ink` is 1.05:1 on this plate in light and `-note-pink-ink` is 3.27:1.
    // Neither may reach this surface, at any theme, ever.
    expect(chronicle).not.toContain("--faction-snide-note-ink");
    expect(chronicle).not.toContain("--faction-snide-note-pink-ink");
  });

  it("na passes its plate as the ring's ground rather than the card's sheet", () => {
    const sheet = stamp(DefaultScoreStamp);
    // The disc inside the annulus is the score plate showing through, so the mark
    // reads as struck into this surface rather than as a patch laid on it.
    expect(sheet).toContain("background:var(--faction-default-stamp-bg)");
    expect(sheet).not.toContain("var(--faction-default-card-bg)");
  });

  /**
   * S.N.I.D.E.'s task detail, ONE case where there were two (#2554).
   *
   * The pair replaced here asserted the page's own overrides — a cream figure in
   * `-card-text`, an acid caption in `-card-accent`, a 128px loop and a
   * `--text-display` figure. Every one of those was the SECOND, different mark
   * this page invented beside the faction's registered stamp, and removing it is
   * what #2554 is. Restating those values against the stamp's would have pinned
   * the old drawing's numbers onto the new drawing and called it a pass.
   *
   * So the claim gets stronger instead of looser: the mark on the task detail is
   * BYTE-IDENTICAL to the mark on the praxis card, because it is now literally
   * the same component reached through the same dispatcher. A fork of any kind —
   * a re-inlined loop, a size prop threaded back in, one ink quietly re-pointed —
   * fails this, where a list of expected declarations would only fail the ones
   * somebody remembered to list.
   *
   * WHAT THIS DOES NOT SETTLE, and #2638 carries: the mark got SMALLER (96 from
   * 128) on the page that draws the widest figure the loop ever holds, and its
   * figure moved from cream to acid on the detail slab. Both follow from the
   * mount and neither has been looked at in a browser.
   */
  it("S.N.I.D.E.'s task detail draws the praxis card's mark, byte for byte", () => {
    // The FIGURE differs and must: a task detail totals `modifiedPoints` (1080
    // here) where the praxis fixture banked 22. Everything that is the drawing
    // rather than the datum is compared, so the number is masked out and nothing
    // else is.
    const drawing = (markup: string) => markup.replace(/>\d+</g, ">#<");
    const mark = penCircle(snideDetail());
    expect(drawing(mark), "the same drawing, not a look-alike").toBe(
      drawing(penCircle(stamp(SnideScoreStamp))),
    );
    // The wall's inks still may not reach a slab: `-note-ink` is the SAME HEX as
    // `-card-bg` in light (1.05:1) and `-note-pink-ink` is 3.27:1. Kept from the
    // pair above, because the mount changed which inks arrive and not this rule.
    expect(mark).not.toContain("--faction-snide-note-ink");
    expect(mark).not.toContain("--faction-snide-note-pink-ink");
  });

  it("Singularity needs no ink override — the well carries its own ground", () => {
    // The one mark of the three whose fill travels with it, which is why its
    // measured pairing on the card IS its measured pairing on the stamp.
    const readout = stamp(SingularityScoreStamp);
    expect(readout).toContain("background:var(--faction-singularity-term-readout)");
    expect(readout).toContain("color:var(--faction-singularity-term-blue-bright)");
  });
});

/**
 * WOW is NOT unified, and this is the record of why rather than a gap.
 *
 * Both directions are closed — the plaque's fill IS the stamp's plate (see the
 * measurement below), and #2070 removed the `✦` from the card by owner ruling, so
 * the star cannot travel the other way. Whoever rules on the plaque's ground here
 * deletes this block; until then a WOW surface quietly adopting the other's mark
 * fails, because that is the guess #2042 says not to make.
 */
describe("WOW still draws two marks, on purpose (#2042)", () => {
  it("keeps the crowned plaque on the card and the star on the stamp", () => {
    const decree = card(WowTaskCard);
    const chronicle = stamp(WowScoreStamp);
    expect(decree, "the card's inset plate").toContain(
      "background:var(--faction-wow-chronicle-panel)",
    );
    expect(decree, "#2070 took the star off the card").not.toContain("✦");
    expect(chronicle, "#840 carves the star out by name").toContain("✦");
    // A plaque here would be a gold frame inside a gold frame around a fill that
    // is the plate — see the ground measurement in the pairing block.
    expect(chronicle).not.toContain("background:var(--faction-wow-chronicle-panel)");
  });
});

/* -------------------------------------------------------------------------- */
/* 2. The pairing seam                                                        */
/* -------------------------------------------------------------------------- */

const CSS_PATH = fileURLToPath(new URL("../../../../index.css", import.meta.url));
const THEMES = readThemes(readFileSync(CSS_PATH, "utf8"));
const BOTH: Theme[] = ["light", "dark"];

/**
 * Resolve a token to an opaque colour, compositing it over `under` when the
 * declared value carries alpha.
 *
 * S.N.I.D.E.'s score plate is `rgba(0,0,0,0.4)` and has no ground of its own, and
 * `contrastRatio` THROWS on a translucent surface rather than flattering it — so
 * "what is behind this plate" is a question the caller has to answer. It is the
 * S.N.I.D.E. praxis card's own sheet.
 */
function opaque(token: string, theme: Theme, under?: string): Rgba {
  const raw = resolveVar(token, theme, THEMES);
  expect(raw, `${token} (${theme}) must be declared`).not.toBeNull();
  const parsed = parseColor(raw as string);
  expect(parsed, `${token} (${theme}) must be a solid colour: ${raw}`).not.toBeNull();
  const colour = parsed as Rgba;
  if (colour.a === 1) return colour;
  expect(under, `${token} is translucent and needs a ground`).toBeDefined();
  return compositeOver(colour, opaque(under as string, theme));
}

/**
 * Every ink each shared mark puts on a ground it was NOT drawn for — the score
 * stamp's plate, and for S.N.I.D.E. the task detail page's slab as well. `floor`
 * is the WCAG rung the role owes: AA_LARGE for a display numeral, AA_NORMAL for a
 * caption.
 *
 * The measured figures are in the marks' own docblocks beside the pairings, as
 * this repo does; the numbers here are the floors, so a repaint that walks a token
 * fails on the ratio rather than on a stale comment.
 */
const ON_A_BORROWED_GROUND: Array<{
  what: string;
  ink: string;
  ground: string;
  under?: string;
  floor: number;
}> = [
  // Singularity — the well brings its own ground, so the pairing travels intact.
  {
    what: "singularity total figure in the lit well",
    ink: "--faction-singularity-term-blue-bright",
    ground: "--faction-singularity-term-readout",
    floor: AA_NORMAL,
  },
  {
    what: "singularity well unit",
    ink: "--faction-singularity-term-blue",
    ground: "--faction-singularity-term-readout",
    floor: AA_NORMAL,
  },
  // S.N.I.D.E. — the stamp's own inks, on the translucent plate over its sheet.
  {
    what: "snide total figure in the pen circle",
    ink: "--faction-snide-acid",
    ground: "--faction-snide-stamp-bg",
    under: "--faction-snide-card-bg",
    floor: AA_LARGE,
  },
  {
    what: "snide pen-circle caption",
    ink: "--faction-snide-card-muted",
    ground: "--faction-snide-stamp-bg",
    under: "--faction-snide-card-bg",
    floor: AA_NORMAL,
  },
  {
    what: "snide pen loop (non-text, 1.4.11)",
    ink: "--faction-snide-pink",
    ground: "--faction-snide-stamp-bg",
    under: "--faction-snide-card-bg",
    floor: AA_LARGE,
  },
  // S.N.I.D.E.'s task detail — the slab punched into the acid plate (#2066).
  // A third ground for one drawing, opaque this time and black in both themes.
  {
    what: "snide detail total figure in the pen circle",
    ink: "--faction-snide-card-text",
    ground: "--faction-snide-card-bg",
    floor: AA_LARGE,
  },
  {
    what: "snide detail pen-circle caption",
    ink: "--faction-snide-card-accent",
    ground: "--faction-snide-card-bg",
    floor: AA_NORMAL,
  },
  {
    what: "snide detail pen loop (non-text, 1.4.11)",
    ink: "--faction-snide-pink",
    ground: "--faction-snide-card-bg",
    floor: AA_LARGE,
  },
  // na — the ring's ground is a prop, so the plate shows through the annulus.
  {
    what: "na total figure in the spectrum ring",
    ink: "--faction-default-card-text",
    ground: "--faction-default-stamp-bg",
    floor: AA_LARGE,
  },
  {
    what: "na spectrum-ring caption",
    ink: "--faction-default-card-muted",
    ground: "--faction-default-stamp-bg",
    floor: AA_NORMAL,
  },
];

describe.each(ON_A_BORROWED_GROUND)("$what clears its floor on the ground it lands on", (pair) => {
  it.each(BOTH)("in %s", (theme) => {
    const ratio = contrastRatio(
      opaque(pair.ink, theme, pair.under),
      opaque(pair.ground, theme, pair.under),
    );
    expect(ratio, `${pair.ink} on ${pair.ground} — ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
      pair.floor,
    );
  });
});

/**
 * The counter-examples. These are why `PenCircle` takes its inks as props, and
 * they are asserted to FAIL — an ink prop quietly dropped back to the atom's
 * default would put the task card's clipping inks on the score stamp's plate, and
 * nothing else in this suite would notice.
 */
describe("the S.N.I.D.E. card's own inks do NOT survive the move (#2042)", () => {
  const plate = (theme: Theme) => opaque("--faction-snide-stamp-bg", theme, "--faction-snide-card-bg");

  it("is invisible in light: the figure ink flips, the plate does not", () => {
    // #14110b on a near-black plate. The plate is dark in BOTH themes (the
    // S.N.I.D.E. praxis card is dark-in-light, the Singularity precedent), so a
    // FLIPPING ink on it is legible in exactly one of them.
    const light = contrastRatio(opaque("--faction-snide-note-ink", "light"), plate("light"));
    expect(light, formatRatio(light)).toBeLessThan(1.5);
    const dark = contrastRatio(opaque("--faction-snide-note-ink", "dark"), plate("dark"));
    expect(dark, formatRatio(dark)).toBeGreaterThan(AA_NORMAL);
  });

  it("puts the caption under AA in light", () => {
    const light = contrastRatio(opaque("--faction-snide-note-pink-ink", "light"), plate("light"));
    expect(light, formatRatio(light)).toBeLessThan(AA_NORMAL);
  });

  it("is not merely dim on the task detail's slab in light — it is the SAME HEX", () => {
    // `--faction-snide-note-ink` and `--faction-snide-card-bg` are both #14110b in
    // the light cascade. The wall flips and the slab does not (#2066), so the
    // clipping's ink on the slab is 1.00:1 — the total painted in the ground
    // colour, on the page that shows the widest total the loop ever holds.
    const slab = (theme: Theme) => opaque("--faction-snide-card-bg", theme);
    const light = contrastRatio(opaque("--faction-snide-note-ink", "light"), slab("light"));
    expect(light, formatRatio(light)).toBeLessThan(1.01);
    // And legible in dark, which is exactly what makes it invisible to a
    // single-theme eyeball and to every guard that does not measure the pair.
    const dark = contrastRatio(opaque("--faction-snide-note-ink", "dark"), slab("dark"));
    expect(dark, formatRatio(dark)).toBeGreaterThan(AA_NORMAL);
    // The caption default lands under AA there too: 3.12:1.
    const caption = contrastRatio(opaque("--faction-snide-note-pink-ink", "light"), slab("light"));
    expect(caption, formatRatio(caption)).toBeLessThan(AA_NORMAL);
  });
});

/**
 * The arithmetic that keeps WOW at two marks. `--faction-wow-stamp-bg` is declared
 * `var(--faction-wow-chronicle-panel)` on `:root, [data-theme]`, so the card's
 * inset plaque and this stamp's plate are the same colour in both themes: the
 * plaque cannot be inset into a sheet it IS. If a future ruling gives the stamp its
 * own plate, this is the test that goes green and lets the plaque travel.
 */
describe("the WOW plaque has no ground on the stamp (#2042)", () => {
  it.each(BOTH)("is 1.00:1 in %s", (theme) => {
    const ratio = contrastRatio(
      opaque("--faction-wow-chronicle-panel", theme),
      opaque("--faction-wow-stamp-bg", theme),
    );
    expect(ratio, formatRatio(ratio)).toBeLessThan(1.05);
  });

  it.each(BOTH)("and its gold frame is all that would be left, at under 3:1 in light", (theme) => {
    const ratio = contrastRatio(
      opaque("--faction-wow-chronicle-gold", theme),
      opaque("--faction-wow-stamp-bg", theme),
    );
    // Light 2.00:1, dark 6.38:1 — the frame alone cannot carry the plate in both.
    if (theme === "light") expect(ratio, formatRatio(ratio)).toBeLessThan(AA_LARGE);
  });
});

/**
 * One points mark per faction, drawn once (#2042).
 *
 * 1. Mount seam: each named surface mounts the shared drawing exactly once and
 *    none of its retired copies. The explicit list is the only census (#2090);
 *    a surface omitted here is invisible, not red, so add new ones by name.
 * 2. Pairing seam: a mark landing on a new ground has its inks re-measured
 *    there in both themes. Catches a flipping ink on an invariant ground
 *    (S.N.I.D.E., 1.08:1 in one theme).
 *
 * WOW is deliberately not unified, with the arithmetic below.
 */

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
import { resolveRoleReads } from "../../../../test/sourceScan";

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
import { readIndexCss } from "../../../../test/indexCss";

const TASK = aTask({ description: "Leave something small where a stranger finds it." });
/** The same task owned by S.N.I.D.E. — see `snideDetail`. */
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

/** Banked at the task-detail figure (1080) so the two marks compare unmasked (#2638). */
const PRAXIS_WIDE = { ...PRAXIS, score: 1080 } as PraxisCardOut;

function stamp(Stamp: ComponentType<ScoreStampProps>, praxis: PraxisCardOut = PRAXIS): string {
  return renderToStaticMarkup(<Stamp praxis={praxis} />);
}

/**
 * S.N.I.D.E.'s third surface; `modifiedPoints` is four glyphs on purpose (the
 * widest figure the loop holds). Needs a S.N.I.D.E. task (#2554): the stamp is
 * dispatched off `task.primary_faction_slug`, as the archetype is in the app.
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
 * The pen circle cut out of a surface's markup. Scoped because the task-detail
 * wall legitimately wears `--faction-snide-note-ink` (#2066); only the slab
 * under the mark must not. The first `</div>` after the loop closes the mark.
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
 * Unified factions: the fragment only the shared drawing emits, and `retired`
 * declarations the old own-mark drew (two marks on one surface looks fine).
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
    // `.spectrum-dial` (#2497): a copy would have to claim the shared class.
    fragment: 'class="spectrum-dial"',
    surfaces: {
      "components/taskCard/DefaultTaskCard.tsx": () => card(DefaultTaskCard),
      "components/praxisCard/scoreStamp/DefaultScoreStamp.tsx": () => stamp(DefaultScoreStamp),
    },
    // The struck disc, plus the inline conic #2497 moved into the cascade.
    retired: [
      "rotate(-7deg)",
      "var(--faction-default-total-rainbow)",
      "background:var(--faction-default-rainbow-conic)",
    ],
  },
  {
    // #2145. `ephemeristsCompassRose.test.tsx` pins the needle path to one file.
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
 * The ink props each mount passes, asserted on the mount: a dropped prop falls
 * back to the atom's default and every token still measures fine alone.
 */
describe("each mount overrides what its ground demands (#2042)", () => {
  it("S.N.I.D.E. passes its own two inks rather than the clipping's", () => {
    const chronicle = stamp(SnideScoreStamp);
    expect(chronicle, "the acid figure").toContain("color:var(--faction-snide-acid)");
    // `-vote-off`, not `-card-muted`: the frame re-points that at the wall (#2177).
    expect(chronicle, "the typed caption").toContain("color:var(--faction-snide-vote-off)");
    // `-note-ink` (1.05:1) and `-note-pink-ink` (3.27:1) fail on this plate.
    expect(chronicle).not.toContain("--faction-snide-note-ink");
    expect(chronicle).not.toContain("--faction-snide-note-pink-ink");
  });

  it("na passes its plate as the ring's ground rather than the card's sheet", () => {
    const sheet = stamp(DefaultScoreStamp);
    expect(sheet).toContain("background:var(--faction-default-stamp-bg)");
    // A declaration is not a paint (#2690): drop the role map's declarations,
    // fold role reads to tokens, then nothing may use the card's sheet.
    const painted = resolveRoleReads(sheet).replace(
      /--na-score-stamp-[\w-]+:var\(--faction-[\w-]+\);/g,
      "",
    );
    expect(painted).not.toContain("var(--faction-default-card-bg)");
  });

  /**
   * #2554: the task-detail mark is the praxis card's, byte for byte, at a
   * matched figure (#2638). Catches any fork a declaration list would miss.
   */
  it("S.N.I.D.E.'s task detail draws the praxis card's mark, byte for byte", () => {
    const mark = penCircle(snideDetail());
    expect(mark, "the same drawing, not a look-alike").toBe(
      penCircle(stamp(SnideScoreStamp, PRAXIS_WIDE)),
    );
    // The wall's inks still may not reach a slab.
    expect(mark).not.toContain("--faction-snide-note-ink");
    expect(mark).not.toContain("--faction-snide-note-pink-ink");
  });

  /**
   * #2638: the loop keeps 96px on both surfaces; at four digits the type steps
   * `--text-heading` → `--text-title`. Both halves pinned: `22` must not move.
   */
  it("steps the figure down one rung at four digits and leaves shorter ones alone", () => {
    expect(penCircle(snideDetail()), "1080 drops to the next rung down").toContain(
      "font-size:var(--text-title)",
    );
    const banked = penCircle(stamp(SnideScoreStamp));
    expect(banked, "22 keeps the headline rung").toContain("font-size:var(--text-heading)");
    expect(banked).not.toContain("font-size:var(--text-title)");
    for (const mark of [penCircle(snideDetail()), banked]) {
      expect(mark, "the loop keeps one width across both surfaces").toContain("width:96px");
    }
  });

  /**
   * Digits crowd, not glyphs: `21.6` keeps the headline rung (fits per
   * `PenCircle`'s docblock). Unreachable in Era 1 (all modifiers 1.0); Era 2's
   * 1.2/0.8 makes it real.
   */
  it("keeps a four-glyph decimal at the headline rung — digits are what crowd", () => {
    const decimal = penCircle(stamp(SnideScoreStamp, { ...PRAXIS, score: 21.6 } as PraxisCardOut));
    expect(decimal, "21.6 renders as four glyphs").toContain(">21.6<");
    expect(decimal, "…and keeps 32px, because it is three DIGITS").toContain(
      "font-size:var(--text-heading)",
    );
    expect(decimal).not.toContain("font-size:var(--text-title)");
  });

  it("Singularity needs no ink override — the well carries its own ground", () => {
    // The well's fill travels with it, so its pairing travels too.
    const readout = stamp(SingularityScoreStamp);
    expect(readout).toContain("background:var(--faction-singularity-term-readout)");
    expect(readout).toContain("color:var(--faction-singularity-term-blue-bright)");
  });
});

/**
 * WOW unifies on its GROUND, not a device (#2042): both treatments are
 * typographic plaques with no emblem to extract. The stamp's plate now stands
 * on the card's sheet. The ✦ still differs by ruling: off the card (#2070),
 * on the stamp (#840).
 */
describe("WOW's two plaques stand on one ground (#2042)", () => {
  it("keeps the crowned plaque on the card and the star on the stamp", () => {
    const decree = card(WowTaskCard);
    const chronicle = stamp(WowScoreStamp);
    expect(decree, "the card's inset plate").toContain(
      "background:var(--faction-wow-chronicle-panel)",
    );
    expect(chronicle, "the stamp's plate is the repointed token, nothing hard-coded").toContain(
      "background:var(--faction-wow-stamp-bg)",
    );
    expect(decree, "#2070 took the star off the card").not.toContain("✦");
    expect(chronicle, "#840 carves the star out by name").toContain("✦");
    // A literal panel would reopen the 1.00:1 out of the token check's reach.
    expect(chronicle).not.toContain("background:var(--faction-wow-chronicle-panel)");
  });
});

/* -------------------------------------------------------------------------- */
/* 2. The pairing seam                                                        */
/* -------------------------------------------------------------------------- */

const THEMES = readThemes(readIndexCss());
const BOTH: Theme[] = ["light", "dark"];

/**
 * A token as an opaque colour, composited over `under` when translucent
 * (`contrastRatio` throws on alpha; S.N.I.D.E.'s plate is `rgba(0,0,0,0.4)`).
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
 * Inks each shared mark puts on a ground it wasn't drawn for. `floor` is the
 * WCAG rung owed; measured figures live in the marks' docblocks.
 */
const ON_A_BORROWED_GROUND: Array<{
  what: string;
  ink: string;
  ground: string;
  under?: string;
  floor: number;
}> = [
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
  {
    what: "snide total figure in the pen circle",
    ink: "--faction-snide-acid",
    ground: "--faction-snide-note-bar",
    under: "--faction-snide-card-bg",
    floor: AA_LARGE,
  },
  {
    what: "snide pen-circle caption",
    ink: "--faction-snide-card-muted",
    ground: "--faction-snide-note-bar",
    under: "--faction-snide-card-bg",
    floor: AA_NORMAL,
  },
  {
    what: "snide pen loop (non-text, 1.4.11)",
    ink: "--faction-snide-pink",
    ground: "--faction-snide-note-bar",
    under: "--faction-snide-card-bg",
    floor: AA_LARGE,
  },
  // S.N.I.D.E.'s task detail — the slab (#2066), black in both themes.
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
 * Counter-examples, asserted to FAIL: why `PenCircle` takes inks as props.
 */
describe("the S.N.I.D.E. card's own inks do NOT survive the move (#2042)", () => {
  const plate = (theme: Theme) => opaque("--faction-snide-note-bar", theme, "--faction-snide-card-bg");

  it("is invisible in light: the figure ink flips, the plate does not", () => {
    // The plate is dark in both themes, so a flipping ink reads in only one.
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
    // Both #14110b in light (#2066): 1.00:1 on the page with the widest total.
    const slab = (theme: Theme) => opaque("--faction-snide-card-bg", theme);
    const light = contrastRatio(opaque("--faction-snide-note-ink", "light"), slab("light"));
    expect(light, formatRatio(light)).toBeLessThan(1.01);
    // Legible in dark, so a single-theme eyeball misses it.
    const dark = contrastRatio(opaque("--faction-snide-note-ink", "dark"), slab("dark"));
    expect(dark, formatRatio(dark)).toBeGreaterThan(AA_NORMAL);
    const caption = contrastRatio(opaque("--faction-snide-note-pink-ink", "light"), slab("light"));
    expect(caption, formatRatio(caption)).toBeLessThan(AA_NORMAL);
  });
});

/**
 * WOW's repoint (#2042): `--faction-wow-stamp-bg` aliased the plaque's own fill
 * (1.00:1); it now aliases `--faction-wow-chronicle-bg`. Rewritten from the
 * failing assertion so the alias can't drift back. Scoped `:root, [data-theme]`
 * so it re-resolves per theme; both measured anyway.
 */
describe("the WOW stamp's plate is the chronicle sheet (#2042)", () => {
  it.each(BOTH)("resolves to the sheet, not the plaque's fill, in %s", (theme) => {
    expect(opaque("--faction-wow-stamp-bg", theme)).toEqual(
      opaque("--faction-wow-chronicle-bg", theme),
    );
  });

  it.each(BOTH)("is a ground the plaque's fill can stand on in %s", (theme) => {
    // Was 1.00:1; the 2px gold frame carries the edge at this separation.
    const ratio = contrastRatio(
      opaque("--faction-wow-chronicle-panel", theme),
      opaque("--faction-wow-stamp-bg", theme),
    );
    expect(ratio, formatRatio(ratio)).toBeGreaterThan(1.05);
  });

  it.each(BOTH)("lifts the gold frame off its own plate in %s", (theme) => {
    // No parchment value gets the gold to 3:1 in light, so assert improvement.
    const plate = contrastRatio(
      opaque("--faction-wow-chronicle-gold", theme),
      opaque("--faction-wow-stamp-bg", theme),
    );
    const onPanel = contrastRatio(
      opaque("--faction-wow-chronicle-gold", theme),
      opaque("--faction-wow-chronicle-panel", theme),
    );
    expect(plate, formatRatio(plate)).toBeGreaterThan(onPanel);
  });

  /**
   * Every stamp ink re-measured on the new plate (§3), by the `-card-*` token
   * the role map delivers (#2674). The base label was under AA on the panel.
   */
  const STAMP_INKS: Array<[what: string, ink: string]> = [
    ["the base numeral (role `ink`)", "--faction-wow-card-text"],
    ["the base label (role `quiet`)", "--faction-wow-card-muted"],
    ["the working in Lora italic (role `accent`)", "--faction-wow-card-accent"],
    ["the bottom-line total", "--faction-wow-stamp-total"],
  ];

  it.each(BOTH)("clears AA for every ink the stamp carries in %s", (theme) => {
    for (const [what, ink] of STAMP_INKS) {
      const ratio = contrastRatio(opaque(ink, theme), opaque("--faction-wow-stamp-bg", theme));
      expect(ratio, `${what} — ${ink}: ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(AA_NORMAL);
    }
  });
});

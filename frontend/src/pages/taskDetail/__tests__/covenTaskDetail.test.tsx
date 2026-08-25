/**
 * Coven task detail — THE CANDLELIT WARD (#1031).
 *
 * `archetypeSlots` already guards the content slots and `detailContract` the
 * comments gate, for every registered skin. This file guards what is specific
 * to the Coven rebuild and would otherwise regress silently:
 *
 *  1. **The dress actually renders.** A skin can pass tsc, eslint and both
 *     shared suites while drawing none of its ornament — the ward, the braid,
 *     the wheel and the haze are the whole point of the archetype.
 *  2. **The voice is gone.** ADR-0057: this surface carries the shared neutral
 *     copy only. #1068's per-key sweep deleted the retired `tasks:coven.*`
 *     detail strings outright — #1039 had kept them for faction pages that turn
 *     out to read `factions:` — so creeping back now means retyping the copy.
 *     This is what would notice.
 *  3. **No colour escapes index.css.** Every pigment on this skin is a token;
 *     a literal hex in a style/fill/stroke is a dark-mode bug that renders fine.
 *  4. **No in-progress roster** (owner ruling 2026-07-28) and **no dead
 *     `/praxis?task_id=` link** (the gallery expands in place instead).
 *
 * The harness is `renderToStaticMarkup` — no DOM, no effects. `useFormFactor`
 * therefore always reports its server default, so only the DESKTOP size set is
 * reachable here; the mobile column collapse is eyeball-only.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import CovenTaskDetail from "../archetypes/CovenTaskDetail";
import type { TaskDetailState } from "../useTaskDetail";
import i18n from "../../../i18n";
import { aTask } from '../../../test/fixtures'

/**
 * The worth panel's unit word, read from the catalog rather than typed.
 *
 * It used to be the literal "POINTS". #2598 moved the shout out of the catalog
 * value and into CSS — the catalog holds "Point"/"Points" and each of the nine
 * skins uppercases the element that draws it — so a STATIC render now reads the
 * catalog's case, while a browser still paints caps. Same move, and the same
 * reason, as `everymenBillOrnament.test.tsx`'s struck seal.
 *
 * 18 is `modifiedPoints` in every state below, so this is the plural.
 */
/**
 * THE KEY MOVED IN #2554. The panel's worth cell is `CovenScoreStamp` now,
 * not a second readout this page draws, so the unit is the stamp's shared
 * `praxis:card.stamp.points` rather than `tasks:detail.points.total` — which
 * Albescent alone still prints. Reading the catalog rather than typing the
 * word is what made that a one-line change here.
 */
const POINTS_UNIT = i18n.t("praxis:card.stamp.points", { count: 18 });


const TASK = aTask({
  id: 305,
  title: "Brew comfort for a weary friend",
  description: "Put the kettle on for someone tired.",
  point_value: 120,
  level_required: 3,
  created_by: 31,
  primary_faction_slug: "coven",
  in_progress_count: 9,
  created_by_display_name: "Wren Abalone",
  created_by_faction_slug: "coven",
  created_by_level: 4,
});

function baseState(overrides: Partial<TaskDetailState> = {}): TaskDetailState {
  return {
    loading: false,
    task: TASK,
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
    modifiedPoints: 120,
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
    ...overrides,
  };
}

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
  return { html, text: html.replace(/<[^>]*>/g, "") };
}

describe("Coven task detail — the dress", () => {
  it("draws the slip sheet, the braid, the wheel and the ward's flicker", () => {
    const { html } = render(<CovenTaskDetail state={baseState()} />);
    // Each of these classes is owned by index.css, which is where the light/dark
    // flip and the reduced-motion guard live.
    //
    // THE GROUND CHANGED (#2135): the column wore `.coven-candle-backdrop` and
    // now wears the task card's own four-stop sheet. The negative assertion is
    // the load-bearing one — that class is still live on the mobile field desk,
    // so a revert here would render fine and survive a dead-code sweep.
    expect(html, "the slip sheet").toContain("--faction-coven-slip-from");
    expect(html, "the ward wash is gone from this column").not.toContain("coven-candle-backdrop");
    expect(html, "braided thread rules").toContain("cvn-braid");
    expect(html, "turning pentagram watermark").toContain("cvn-wheel");
    // `.cvn-candle` — the ward's breathing aura — left with the ward in
    // #2554: the worth cell is `CovenScoreStamp` (the arched plate and the
    // cauldron) and this page draws no pentagram of its own. The class is
    // still live on `CovenPraxisDetail`, so index.css keeps it.
  });

  it("speaks in the faction's four faces, all via tokens", () => {
    const { html } = render(<CovenTaskDetail state={baseState()} />);
    expect(html, "Grenze Gotisch — display").toContain("--font-faction-witch");
    expect(html, "Cormorant Garamond — numerals + brief").toContain("--font-faction-serif");
    expect(html, "Caveat — the hand").toContain("--font-faction-script");
    expect(html, "Quicksand — chrome").toContain("--font-faction-rounded");
  });

  it("paints with tokens only — no literal colour survives into the markup", () => {
    const { html } = render(<CovenTaskDetail state={baseState({ canSignUp: true })} />);
    const painted = [...html.matchAll(/(?:style|fill|stroke)="([^"]*)"/g)].map((m) => m[1]);
    expect(painted.filter((value) => /#[0-9a-f]{3}/i.test(value))).toEqual([]);
  });

  it("keeps slip-deep off body-sized text — it is a rule, a strand and a large numeral (#1295)", () => {
    // The tier note lives in `components/factionMarks/covenSlip.tsx`. `slip-deep`
    // measures 4.44:1 on the ward PAGE (3.47:1 under the peak of the pink haze
    // bloom) and 4.70:1 on the ward CARD, so it may carry words only at a size
    // the 3:1 large-text floor covers. Neither guard above sees this: the token
    // test measures declared values, and an ink-to-ground PAIRING exists only
    // once rendered. The breadcrumb and the "level met" note both sit on the
    // PAGE, and both wore it.
    const { html } = render(<CovenTaskDetail state={baseState({ canSignUp: true })} />);
    const inDeep = [...html.matchAll(/style="([^"]*)"/g)]
      .map((match) => match[1])
      .filter((style) => /(?:^|;)color:var\(--faction-coven-slip-deep\)/.test(style));
    for (const style of inDeep) {
      expect(style, "slip-deep carries only LARGE display type here").toMatch(
        /font-size:var\(--text-(title|heading|display)\)/,
      );
    }
  });
});

/* THE WARD'S GEOMETRY SUITE LEFT WITH THE WARD (#2554).

   It measured a pentagram against the pink ring it was inscribed in, both
   emitted by a `Ward` component this file owned — #2237's fix was that the
   star's radius must be DERIVED from the ring's rather than hand-typed. The
   worth cell is `CovenScoreStamp` now, which draws the arched plate and
   `CovenCauldron` and no ward at all, so there is no drawing left here for
   the rule to hold. Nothing about #2237 is relaxed: its subject was deleted.
   `covenScoreStamp.test.tsx` guards the mark that replaced it. */

describe("Coven task detail — the copy", () => {
  it("uses the shared neutral headings, not Coven's retired detail voice", () => {
    const { text } = render(<CovenTaskDetail state={baseState()} />);
    expect(text).toContain("Task Description");
    expect(text).toContain("Discussion");
    expect(text).toContain("Sign up");
    // The archetype this replaces spoke all of these. #1068's per-key sweep
    // found nothing left reading `tasks:coven.*` and deleted the namespace, so
    // drifting back now means re-adding the copy — which is what this catches
    // (ADR-0057).
    for (const retired of [
      "spells cast",
      "the party",
      "most loved",
      "whimsy.exe",
      "sparks",
      "the love so far",
    ]) {
      expect(text.toLowerCase(), `retired voice: ${retired}`).not.toContain(retired);
    }
  });

  it("renders the author byline and the two header stats", () => {
    const { html, text } = render(<CovenTaskDetail state={baseState()} />);
    expect(text).toContain("Wren Abalone");
    expect(text).toContain("author · lvl 4");
    expect(html).toContain('href="/characters/31"');
    expect(text).toContain("Level");
    expect(text).toContain("people working on this");
  });

  it("draws the brief in full — no clamp, no truncation", () => {
    const long = "x".repeat(2000);
    const { text } = render(
      <CovenTaskDetail state={baseState({ task: { ...TASK, description: long } })} />,
    );
    expect(text).toContain(long);
  });
});

describe("Coven task detail — the contract", () => {
  it("hides the multiplier badge at the identity factor", () => {
    const { text } = render(<CovenTaskDetail state={baseState()} />);
    expect(text).not.toContain("×");
  });

  it("shows the raw factor once an era ships a real one, beside base and total", () => {
    const { text } = render(
      <CovenTaskDetail state={baseState({ factionMultiplier: 1.5, modifiedPoints: 180 })} />,
    );
    expect(text).toContain("×1.50");
    expect(text, "base still legible").toContain("120");
    expect(text, "the cauldron carries the total").toContain("180");
  });

  it("renders the in-progress population as a header count", () => {
    const { text } = render(<CovenTaskDetail state={baseState()} />);
    expect(text).toContain("people working on this");
    expect(text).toContain("9");
  });

  it("never links to the filterless praxis feed", () => {
    const { html } = render(<CovenTaskDetail state={baseState()} />);
    expect(html).not.toContain("task_id=");
  });

  it("shows no action cell at all when the viewer has no move to make", () => {
    const { text } = render(<CovenTaskDetail state={baseState({ canSignUp: false })} />);
    // The worth cell survives — it is a fact about the task, not a control.
    expect(text).toContain(POINTS_UNIT);
    expect(text).not.toContain("Sign up");
    expect(text).not.toContain("Continue editing");
  });
});

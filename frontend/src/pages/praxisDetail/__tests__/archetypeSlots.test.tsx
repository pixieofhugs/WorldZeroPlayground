/**
 * Praxis-read content-slot invariant guard (ADR-0002, ADR-0061). The guard was
 * written against ADR-0017 §2, which is now marked **Superseded by ADR-0061**;
 * the invariant itself is unchanged and ADR-0061 is what records it.
 *
 * Every per-faction praxis-read archetype wears a different skin but must render
 * the same CONTENT slots — an archetype may *arrange* them freely but may not
 * *drop* one. This walks the real `surfaceMap('praxisDetail')` registry (plus the
 * Default fallback) and asserts every registered archetype still emits the
 * invariant slots, so a new faction that drops one fails here.
 *
 * THE REGISTRY IS FULL NOW, and getting there is what the walk was for. ADR-0061
 * made praxis detail one shared page and #1089 de-registered all six faction
 * skins, leaving `__default__` as the only case that ran — which is what this
 * header used to say. Epic #1085 then re-registered the lot (Coven, S.N.I.D.E.,
 * UA, Ephemerists, WOW, Singularity, Everymen, Albescent), and every one of them
 * was picked up and walked by this loop the moment its manifest line landed,
 * **with no edit to this file**. That is the property worth keeping: the guard
 * reads `surfaceMap('praxisDetail')` rather than a hard-coded list, so the next
 * faction to register — or to drop back to Default — needs nothing here either.
 *
 * Rendered to static markup (no DOM); `useAuth` resolves to its default
 * anonymous context, so the vote caster renders its login gate rather than
 * throwing. We assert the structural anchors each slot leaves behind: the
 * finding text, the "re:" task link, and the author-byline character link.
 */
import { surfaceMap } from "../../../factions";
import { describe, it, expect } from "vitest";
// Initialize the i18n catalog so shared-chrome copy keys resolve to English text.
import i18n from "../../../i18n";
import DefaultPraxisDetail from "../archetypes/DefaultPraxisDetail";
import { PraxisStatusBanners } from "../shared";
import type { PraxisDetailState } from "../usePraxisDetail";
import { aMetatask } from '../../../test/fixtures'
import { aPraxisDetailState, aWalkedPraxis, markup } from '../../../test/praxisDetail'

// `markup` tag-strips into `text` — several archetypes split the finding across
// spans (the Ephemerists' lapis last-word), so the headline only reads
// contiguously once the wrapping tags are removed.
const render = markup;


const PRAXIS = aWalkedPraxis();


/** Minimal state — the read archetypes take every number they show off the
 *  praxis payload (`scoreBreakdown`, ADR-0053); behavior-slot state is left in
 *  its default (anonymous, non-owner) shape. */
function state(): PraxisDetailState {
  return aPraxisDetailState({
    praxis: PRAXIS,
  });
}

// Default fallback is a registered renderable too — guard it alongside the map.
const archetypes = { ...surfaceMap('praxisDetail'), __default__: DefaultPraxisDetail };

describe("praxis-read content-slot invariant", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} renders the finding, task link, and author byline`, () => {
      const { html, text } = render(<Archetype state={state()} />);
      expect(text, "finding/title slot").toContain("Reforestation");
      expect(text, "account-body slot").toContain("Seedlings");
      expect(html, "re-task-link slot").toContain('href="/tasks/7"');
      expect(html, "author-byline slot").toContain('href="/characters/3"');
    });
  }
});

// ─── Task Crown: ONE fleur, in the stamp's corner (ADR-0028, #1710) ──────────
//
// The crown used to lead this page as a bordered hero panel — a 34px medallion,
// a "TASK CROWN" label and a sentence of explanation — mounted in the shared
// `PraxisStatusBanners` chrome. Every archetype then passed `showCrown={false}`
// to its `ScoreStamp` so the page would not carry the mark twice. Owner ruling
// on #1710: *"Task crown as a box on the top should not exist. Just a fleur in
// the corner."* The banner is gone and the stamps draw the mark again.
//
// ADR-0054's "one canonical mark" is unchanged, so the count is the assertion:
// a crowned page renders EXACTLY ONE `TaskCrown`, never zero and never two. It
// is counted off the medallion's `title` — the one string the component always
// emits, at any size, in any skin.
const CROWN_TITLE = i18n.t("feed:taskCrown.title");

function crownCount(html: string): number {
  return html.split(`title="${CROWN_TITLE}"`).length - 1;
}

describe("praxis-read Task Crown", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} wears exactly one crown iff is_top_for_task`, () => {
      const crowned = state();
      crowned.praxis = { ...PRAXIS, is_top_for_task: true };
      const { html, text } = render(<Archetype state={crowned} />);
      expect(crownCount(html), "one mark per page").toBe(1);
      expect(text, "and no hero panel around it").not.toContain("TASK CROWN");
      expect(crownCount(render(<Archetype state={state()} />).html)).toBe(0);
    });
  }
});

// ─── The failed mark survives an empty admin note (#1538) ────────────────────
//
// #1373 made `failed` a PUBLIC MARK: the praxis keeps its place in the feed and
// keeps its "marked as failed" banner. The banner used to need an `admin_note`
// as well as the status, and the note is optional at every layer that sets it —
// `ModerationAction.admin_note` is `str | None`, and `moderate_praxis` banks
// `admin_note or ""` on a fail, so leaving the steward's box empty stores the
// falsy empty string. The card badge next door has always keyed on the status
// alone, so such a praxis carried a FAILED badge in the feed and (once #1444
// correctly suppressed its score stamp) nothing at all on its own page.
//
// Walked across the whole registry rather than asserted once on the shared slot:
// the mark has to reach all nine dressed pages, and the empty-note case is
// exactly the one a skin could quietly stop mounting.

/** The banner's title copy — a whole sentence, so it reads without a note. */
const FAILED_TITLE = "This praxis was marked as failed.";

describe("failed banner (#1538)", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} marks a failed praxis with a null, empty, or written note`, () => {
      for (const note of [null, "", "The photo is of a different ridge."]) {
        const failed = state();
        failed.praxis = { ...PRAXIS, moderation_status: "failed", admin_note: note };
        expect(
          render(<Archetype state={failed} />).text,
          `admin_note ${JSON.stringify(note)}`,
        ).toContain(FAILED_TITLE);
      }
      expect(
        render(<Archetype state={state()} />).text,
        "a visible praxis carries no mark",
      ).not.toContain(FAILED_TITLE);
    });
  }

  it("prints the note as the banner's body when there is one", () => {
    const failed = state();
    failed.praxis = {
      ...PRAXIS,
      moderation_status: "failed",
      admin_note: "The photo is of a different ridge.",
    };
    expect(render(<PraxisStatusBanners state={failed} />).text).toContain(
      "The photo is of a different ridge.",
    );
  });

  /**
   * An optional body must be ABSENT, not empty. Rendering the note's span with
   * nothing in it would leave a dangling element under the title — the shape
   * #1444 deleted the headed score panel to avoid.
   */
  it("leaves no empty body element when the note is blank", () => {
    for (const note of [null, ""]) {
      const failed = state();
      failed.praxis = { ...PRAXIS, moderation_status: "failed", admin_note: note };
      const { html } = render(<PraxisStatusBanners state={failed} />);
      expect(html, `admin_note ${JSON.stringify(note)}`).toContain(FAILED_TITLE);
      expect(html, "no empty note span").not.toMatch(
        /<span[^>]*content-text[^>]*><\/span>/,
      );
    }
  });
});

// ─── Single earned-points breakdown (#641) ───────────────────────────────────
// Every detail archetype renders exactly one explicit `{base} + {votes}`
// breakdown instead of a votes-only score echoed in the byline, the card header,
// AND the vote tally. When the multiplier ≠ 1.0, the `{base} × {mult} + {votes}`
// form renders — live since ADR-0053, previously unreachable dead code.

/** A non-1.0 multiplier: base 10 × 1.1 + 14 vote points = 25. */
function multiplierState(): PraxisDetailState {
  const s = state();
  s.praxis = { ...PRAXIS, task_point_value: 10, score: 25, display_multiplier: 1.1, points_from_votes: 14 };
  return s;
}

// ─── Metatask seal stack (#932) ──────────────────────────────────────────────
// Every detail archetype renders the read-only applied-metatask seal stack in
// its below-score / above-media slot when `applied_metatasks` is non-empty, and
// nothing when it is empty. The seal dispatches on the METATASK's issuing
// faction (here `snide`), not the host archetype's — a UA-hosted page shows a
// Snide-issued seal. Its condition line is the metatask title, the anchor below.

const SEAL_METATASK = aMetatask({ metatask_faction_slug: "snide" });

/** Same praxis, now carrying one applied metatask seal. */
function sealedState(): PraxisDetailState {
  const s = state();
  s.praxis = { ...PRAXIS, applied_metatasks: [SEAL_METATASK] };
  return s;
}

describe("praxis-read metatask seal stack", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} renders the applied seal, and nothing when none applied`, () => {
      expect(render(<Archetype state={sealedState()} />).text, "seal condition line").toContain(
        "Composting",
      );
      expect(render(<Archetype state={state()} />).text, "no seal when empty").not.toContain(
        "Composting",
      );
    });
  }
});

describe("praxis-read earned-points breakdown", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} renders the base + vote-points breakdown`, () => {
      const { text } = render(<Archetype state={state()} />);
      // Both halves of the merit split render: the base (30) and the vote
      // points (16). The votes number 16 is now shown only by the breakdown.
      expect(text, "base points").toContain("30");
      expect(text, "vote points").toContain("16");
    });

    it(`${slug} renders the × multiplier form when the multiplier ≠ 1.0`, () => {
      const { text } = render(<Archetype state={multiplierState()} />);
      expect(text, "multiplier value").toContain("1.1");
      expect(text, "multiplier operator").toContain("×");
      expect(text, "vote points").toContain("14");
    });
  }
});

// ─── The task-reference line does not restate the stamp (#1833) ──────────────
//
/**
 * What the band says the task is worth, read from the catalog rather than
 * typed. It was the literal "30 pts" until #2598 took
 * `praxis:detail.taskRef.points` to the long form — and to an `_one`/`_other`
 * pair, because "1 points" is wrong where "1 pts" was merely terse.
 */
const TASK_WORTH = i18n.t("praxis:detail.taskRef.points", { points: 30, count: 30 });

// Each archetype's task-reference band closes with "Level 3 · 30 points", and the
// score rail beside it prints 30.0 as the total whenever nothing has moved the
// score off the base — which, under Era 1's neutral multiplier, is every
// unvoted praxis. #1131 made the stamp suppress its own base row in exactly
// that state; the band reintroduced the double-print one component boundary
// away, so both ends now share `stampRestatesTaskPoints`.
//
// Walked across the registry because the band is copied into all eight dressed
// pages rather than composed from a slot — the copy is what let it drift.

describe("task-reference points (#1833)", () => {
  /** Nothing in play but the base: the stamp's total IS the task's points. */
  const baseOnly = (over: Partial<typeof PRAXIS> = {}) => {
    const s = state();
    s.praxis = { ...PRAXIS, points_from_votes: 0, score: 30, ...over };
    return s;
  };

  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} drops the figure the stamp already prints`, () => {
      const { text } = render(<Archetype state={baseOnly()} />);
      expect(text, "the level still reads").toContain("Level 3");
      // Stated ONCE. A whole score prints without a decimal now (#1866), so the
      // stamp's total and the band's figure are the same string and only the
      // count tells them apart — which is the rule this case is about.
      expect(text.split("30"), "the stamp still carries the total").toHaveLength(2);
      expect(text, "and the band does not repeat it").not.toContain(TASK_WORTH);
    });

    it(`${slug} keeps both figures once votes move the total`, () => {
      // base 30 + 16 from votes = 46: two figures, two questions.
      const { text } = render(<Archetype state={state()} />);
      expect(text, "what the task is worth").toContain(TASK_WORTH);
      expect(text, "what this praxis scored").toContain("46");
    });

    it(`${slug} keeps the figure on a praxis with no stamp at all`, () => {
      // #1444 gates the stamp off a failed praxis and `scoreWasBanked` takes the
      // whole panel with it, so the band is the only points readout left.
      const { text } = render(<Archetype state={baseOnly({ moderation_status: "failed" })} />);
      // Stated once again, and this time the one statement is the band's.
      expect(text.split("30"), "no total was banked").toHaveLength(2);
      expect(text, "so what the task is worth stays").toContain(TASK_WORTH);
    });
  }
});

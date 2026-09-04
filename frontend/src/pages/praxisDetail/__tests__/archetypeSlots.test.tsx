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
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { surfaceMap } from "../../../factions";
import { describe, it, expect } from "vitest";
import { readStripped, SRC_DIR } from "../../../test/sourceScan";
// Initialize the i18n catalog so shared-chrome copy keys resolve to English text.
import i18n from "../../../i18n";
import DefaultPraxisDetail from "../archetypes/DefaultPraxisDetail";
import { PraxisStatusBanners } from "../shared";
import type { PraxisDetailState } from "../usePraxisDetail";
import { aDuel, aMember, aMetatask } from '../../../test/fixtures'
import { RIVAL, aPraxisDetailState, aWalkedPraxis, anOwner, markup } from '../../../test/praxisDetail'

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

// ─── The six slots the walk above never covered (#2718) ──────────────────────
//
// This file has walked the registry since #1045, and every guard it grew was
// about a slot that had already gone wrong somewhere: the crown (#1710), the
// failed mark (#1538), the seal stack (#932), the points breakdown (#641), the
// task-reference band (#1833). Nothing was ever added for the slots that had
// not yet broken — so the moderation NOTICE, the steward bar, the owner
// controls, the report card, the comments region and the duel card were each
// mounted eight times and guarded zero times.
//
// ADR-0061's rule is that an archetype may ARRANGE a slot freely and may not
// DROP one. For those six the rule was a convention rather than a guard: an
// archetype could omit any of them and the whole suite stayed green. This is
// the guard, walked over the same registry for the same reason — a tenth
// faction is picked up with no edit here.
//
// Anchored on the layout's own copy where the archetype supplies it (the
// comments head, the duel head) and on the shared slot's copy where the shared
// module does — which is also what makes each row read as the SLOT rather than
// as one faction's words. Every row states a premise, an anchor, and the
// complement, so an archetype that draws the slot unconditionally fails too.

const NOTICE_LABEL = i18n.t("praxis:detail.banners.flaggedLabel");
const STEWARD_EYEBROW = i18n.t("praxis:detail.admin.eyebrow");
const OWNER_TRIGGER = i18n.t("praxis:detail.owner.unsubmit");
const REPORT_TITLE = i18n.t("praxis:detail.flag.title");
const COMMENTS_HEAD = i18n.t("praxis:detail.sections.comments");
const DUEL_HEAD = i18n.t("praxis:duelCrossLink.label");

/**
 * The notice's own two marks, pulled back out of the markup.
 *
 * A presence check on the word "FLAGGED" is satisfied by a notice painted in
 * the paper it sits on, which is the failure this surface has actually had
 * (#1627: the neutral amber reads 3.68:1 on the Ephemerists night plate, and
 * nothing in a text assertion can see that). So the walk below reads the ink
 * back off the rendered notice and says three things about it that a text
 * assertion cannot.
 *
 * This is the cheap half. The MEASURED half — which token each wall was
 * contrast-tested with — is `detailWallAlarmInk.test.tsx` for the failed
 * banner and `utils/__tests__/factionContrast.test.ts` for the ratios. What
 * belongs here is the part that must hold for every archetype the registry can
 * reach, including a tenth that lands tomorrow with no measurement of its own
 * yet: the mark is drawn, it is drawn in a named token, and that token is an
 * ink rather than a ground.
 */
function flaggedNoticeInks(html: string): { edge: string; label: string; body: string } {
  const at = html.indexOf(`>${NOTICE_LABEL}<`);
  expect(at, "the flagged notice is not in the markup at all").toBeGreaterThan(-1);
  const notice = html.slice(Math.max(0, at - 400), at + 200);
  const edge = /border:2px solid ([^;"]+);border-radius:8px/.exec(notice);
  const label = new RegExp(
    `class="label-caption" style="color:([^"]+)">${NOTICE_LABEL}<`,
  ).exec(notice);
  const body = /class="font-body content-text" style="color:([^"]+)"/.exec(notice);
  expect(edge, "no border ink on the notice").not.toBeNull();
  expect(label, "no label ink on the notice").not.toBeNull();
  expect(body, "no body ink on the notice").not.toBeNull();
  return { edge: edge![1], label: label![1], body: body![1] };
}

/** Suffixes that name a GROUND. An ink that ends in one of these is paper. */
const GROUND_SUFFIXES = [
  "-bg",
  "-paper",
  "-page",
  "-ground",
  "-surface",
  "-wall",
  "-plate",
  "-stock",
];

describe("praxis-read moderation notice (#2718)", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} draws the flagged notice, and only when flagged`, () => {
      const flagged = state();
      flagged.praxis = { ...PRAXIS, moderation_status: "flagged" };
      expect(render(<Archetype state={flagged} />).text, "the notice").toContain(NOTICE_LABEL);
      expect(
        render(<Archetype state={state()} />).text,
        "a visible praxis carries no notice",
      ).not.toContain(NOTICE_LABEL);
    });

    it(`${slug} paints the notice in a named ink, not in its own paper`, () => {
      const flagged = state();
      flagged.praxis = { ...PRAXIS, moderation_status: "flagged" };
      const { edge, label, body } = flaggedNoticeInks(render(<Archetype state={flagged} />).html);

      // 1. The mark and its rule are ONE colour (#1449). A label that drifts
      //    off its own border is the shape that bug had.
      expect(label, "the label and its rule are one colour").toBe(edge);

      // 2. Every ink is a declared token. A literal cannot flip with the
      //    cascade, so a hex here is a dark-mode bug that renders fine today.
      for (const [role, ink] of [["edge", edge], ["label", label], ["body", body]] as const) {
        expect(ink, `${role} is a declared token`).toMatch(/^var\(--[a-z0-9-]+\)$/);
        expect(
          ["currentColor", "inherit", "transparent"].includes(ink),
          `${role} takes a real ink, not an inherited one`,
        ).toBe(false);
      }

      // 3. And the token is an INK, not a GROUND. This is the assertion a text
      //    check cannot make: a notice painted in the paper under it still
      //    contains the word "FLAGGED" and is invisible.
      for (const [role, ink] of [["edge", edge], ["label", label], ["body", body]] as const) {
        const token = ink.slice(4, -1);
        for (const suffix of GROUND_SUFFIXES) {
          expect(token.endsWith(suffix), `${role} names a ground (${token})`).toBe(false);
        }
      }
    });
  }
});

describe("praxis-read steward bar (#2718)", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} mounts the steward bar for a steward and nobody else`, () => {
      const steward = aPraxisDetailState({ praxis: PRAXIS, showAdminBar: true });
      expect(render(<Archetype state={steward} />).text, "the bar").toContain(STEWARD_EYEBROW);
      expect(render(<Archetype state={state()} />).text, "and not for a reader").not.toContain(
        STEWARD_EYEBROW,
      );
    });
  }
});

describe("praxis-read owner controls (#2718)", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} gives the owner the one reopen control`, () => {
      const owned = aPraxisDetailState({
        praxis: { ...PRAXIS, created_by_id: 1, members: [aMember({ id: 10, character_id: 1 })] },
        isOwner: true,
        user: anOwner(),
      });
      expect(render(<Archetype state={owned} />).text, "the control").toContain(OWNER_TRIGGER);
      expect(render(<Archetype state={state()} />).text, "and a reader gets none").not.toContain(
        OWNER_TRIGGER,
      );
    });
  }
});

describe("praxis-read report card (#2718)", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} mounts the report card, and drops it once flagged`, () => {
      expect(render(<Archetype state={state()} />).text, "the card").toContain(REPORT_TITLE);
      // `PraxisFlagBlock` returns null on an already-flagged praxis: there is
      // nothing left to report. Asserted so the positive case above cannot be
      // satisfied by an archetype that draws the card unconditionally.
      const flagged = state();
      flagged.praxis = { ...PRAXIS, moderation_status: "flagged" };
      expect(render(<Archetype state={flagged} />).text, "nothing left to report").not.toContain(
        REPORT_TITLE,
      );
    });
  }
});

describe("praxis-read comments region (#2718)", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} mounts the thread as the page's third region`, () => {
      expect(render(<Archetype state={state()} />).text, "the region").toContain(COMMENTS_HEAD);
      // The gate lives in `PraxisDetailComments`, not in the skins (ADR-0061):
      // a thread renders on a `visible` praxis only, and one skin forgetting
      // that is the drift the shared slot exists to prevent.
      const failed = state();
      failed.praxis = { ...PRAXIS, moderation_status: "failed" };
      expect(render(<Archetype state={failed} />).text, "and not on a moderated one").not.toContain(
        COMMENTS_HEAD,
      );
    });
  }
});

describe("praxis-read duel card (#2718)", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} mounts the duel card for a duel and nothing without one`, () => {
      const duelled = aPraxisDetailState({
        praxis: { ...PRAXIS, duel_id: 5 },
        duel: aDuel({ id: 5, status: "settled", challenger: RIVAL }),
      });
      expect(render(<Archetype state={duelled} />).text, "the card").toContain(DUEL_HEAD);
      expect(render(<Archetype state={state()} />).text, "and no card without a duel").not.toContain(
        DUEL_HEAD,
      );
    });
  }
});

// ─── The kit is the only thing an archetype supplies (#2718) ─────────────────
//
// Everything above is a RENDER-side guard: it asks whether a slot reached the
// page. This last one is the AUTHORING-side complement, and it is the property
// the skin lane exists to create — the eleven invariant mounts moved into
// `PraxisDetailSkin`, and an archetype that re-mounts one itself has quietly
// forked the spine again. A render walk cannot see that: an archetype that drew
// its own comment thread instead of delegating would pass every case above,
// because the thread is on the page either way.
//
// BOTH ENDS ARE DERIVED, and the join between them is derived too. The slugs
// come from `surfaceMap('praxisDetail')`, as everything else in this file does.
// The FILE for a slug is read out of that faction's own manifest — the
// identifier `praxisDetail:` returns, then the `import()` that identifier is
// bound to — so a tenth faction is picked up with no edit here, and a faction
// that renames or moves its archetype moves this with it. There is no table.
//
// The list of mounts is hand-authored, which is what keeps this from being a
// tautology (`kitInvariants.test.tsx` records the same reasoning: a denominator
// derived from its own subject asserts only that the subject equals itself).
// The non-vacuity half is asserted directly — every name below must appear in
// the skin, or the guard is forbidding something nothing does.

/**
 * The mounts the skin owns. Each is a piece no faction dresses — the platform
 * speaking, a shared gate, or site chrome — so an archetype naming one is
 * either re-mounting it or has stopped delegating.
 *
 * The five NOT here are the ones a kit still supplies, dressed: `ScoreStamp`,
 * `MemberByline`, `PraxisOwnerActions`, `bylineFaces` and `taskRefMeta`. Those
 * are mounted INSIDE the header and score blocks the kit builds, so an
 * archetype naming them is doing its job.
 */
const SKIN_OWNED = [
  "PraxisStatusBanners",
  "PraxisAdminBar",
  "PraxisFlagBlock",
  "PraxisDetailComments",
  "DuelCard",
  "MetataskSeal",
  // The gate on the score panel: an unscored praxis draws no panel (#1444).
  // A rule, not a dress decision, so a kit re-deciding it is the drift.
  "scoreWasBanked",
  // Site chrome, above the surface (#2102). One trail, drawn once.
  "Breadcrumb",
] as const;

/**
 * slug → `pages/praxisDetail/archetypes/<X>.tsx`, read out of the manifests.
 *
 * Keyed on the `slug` each manifest DECLARES rather than on its filename: `na`
 * ships from `default.ts`, because `na` is a state and not a faction
 * (ADR-0039, and `factions/index.ts` says so where it lists them). Reading the
 * field keeps that true here without a line of mapping.
 */
function archetypeSources(): Record<string, string> {
  const dir = join(SRC_DIR, "factions");
  const manifests = readdirSync(dir).filter(
    (name) => name.endsWith(".ts") && name !== "index.ts" && name !== "manifest.ts",
  );
  const found: Record<string, string> = {};
  for (const name of manifests) {
    const manifest = readStripped(join(dir, name));
    const slug = manifest.match(/slug:\s*["'](\w+)["']/)?.[1];
    const binding = manifest.match(/praxisDetail:\s*\(\)\s*=>\s*(\w+)/)?.[1];
    if (!slug || !binding) continue;
    const path = manifest.match(
      new RegExp(`const ${binding}\\s*=[^\\n]*import\\(["']([^"']+)["']\\)`),
    )?.[1];
    expect(path, `${name} binds ${binding} to no import`).toBeTruthy();
    found[slug] = join(SRC_DIR, `${path!.replace(/^\.\.\//, "")}.tsx`);
  }
  return found;
}

describe("no archetype re-mounts what the skin owns (#2718)", () => {
  const skin = readStripped(
    join(SRC_DIR, "pages/praxisDetail/praxisDetailSkin.tsx"),
  );

  // The tripwire. A forbidden list that has drifted out of the shared layer
  // forbids nothing and reports green — the vacuous pass #2814's audit kept
  // finding from the other side.
  it.each(SKIN_OWNED)(
    "%s is mounted by the skin, so forbidding it means something",
    (name) => {
      expect(skin, `${name} is not in praxisDetailSkin.tsx`).toContain(name);
    },
  );

  const sources = archetypeSources();

  for (const slug of Object.keys(surfaceMap("praxisDetail"))) {
    it(`${slug} supplies a kit and nothing the skin already mounts`, () => {
      const file = sources[slug];
      expect(file, `no manifest declares a praxisDetail archetype for ${slug}`).toBeTruthy();
      const source = readStripped(file);
      for (const name of SKIN_OWNED) {
        expect(source, `${slug} re-mounts ${name}`).not.toContain(name);
      }
    });
  }
});

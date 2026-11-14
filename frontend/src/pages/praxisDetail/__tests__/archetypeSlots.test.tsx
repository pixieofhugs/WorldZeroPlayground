/**
 * Praxis-read content-slot invariant (ADR-0061): an archetype may ARRANGE slots
 * but not DROP one. Walks `surfaceMap('praxisDetail')` (plus Default), so a new
 * faction is covered with no edit here.
 */
import { join } from "node:path";
import { surfaceMap } from "../../../factions";
import { describe, it, expect, vi } from "vitest";
import { readStripped, sourceFiles, SRC_DIR, toRelative } from "../../../test/sourceScan";
import i18n from "../../../i18n";
import DefaultPraxisDetail from "../archetypes/DefaultPraxisDetail";
import { PraxisStatusBanners } from "../shared";
import type { PraxisDetailState } from "../usePraxisDetail";
import { aDuel, aMember, aMetatask } from '../../../test/fixtures'
import { RIVAL, aPraxisDetailState, aWalkedPraxis, anOwner, markup } from '../../../test/praxisDetail'

const mocks = vi.hoisted(() => ({ formFactor: "desktop" as "desktop" | "mobile" }));
vi.mock("../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));

// `text` is tag-stripped: some archetypes split the finding across spans.
const render = markup;


const PRAXIS = aWalkedPraxis();


function state(): PraxisDetailState {
  return aPraxisDetailState({
    praxis: PRAXIS,
  });
}

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

// Task Crown: exactly ONE fleur, in the stamp's corner, no hero panel
// (ADR-0054, #1710). Counted off the medallion's `title`.
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

// The layout contract every kit inherits (#1129): same aside track, crown never
// form-factor gated, ground on the column, report card outside the costume.
const rendered = (el: React.ReactElement, factor: "desktop" | "mobile" = "desktop") => {
  mocks.formFactor = factor;
  try {
    return render(el);
  } finally {
    mocks.formFactor = "desktop";
  }
};

describe("praxis-read layout contract at both form factors", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} holds the 330px aside on desktop and drops the track on mobile`, () => {
      const wide = rendered(<Archetype state={state()} />).html;
      expect(wide, "the aside track").toContain("0 0 330px");
      expect(wide, "not the retired outlier width").not.toContain("340px");
      expect(rendered(<Archetype state={state()} />, "mobile").html, "mobile stacks").not.toContain(
        "0 0 330px",
      );
    });

    it(`${slug} shows the crown at both form factors, and only when crowned`, () => {
      const crowned = state();
      crowned.praxis = { ...PRAXIS, is_top_for_task: true };
      for (const factor of ["desktop", "mobile"] as const) {
        expect(crownCount(rendered(<Archetype state={crowned} />, factor).html), factor).toBe(1);
        expect(crownCount(rendered(<Archetype state={state()} />, factor).html), factor).toBe(0);
      }
    });

    it(`${slug} carries its ground on the column, never the viewport`, () => {
      const { html } = rendered(<Archetype state={state()} />);
      expect(html).not.toContain("position:fixed");
      expect(html).not.toMatch(/class="[^"]*-backdrop/);
    });

    it(`${slug} leaves the report card outside the costume`, () => {
      const { html } = rendered(<Archetype state={state()} />);
      const card = html.slice(html.lastIndexOf("sidebar-card"), html.indexOf("</aside>"));
      expect(card, "the card is mounted").toContain(REPORT_TITLE);
      expect(card, "and carries no faction dress").not.toContain("--faction-");
    });
  }
});

// The failed mark keys on status alone; `admin_note` may be null or "" (#1538).

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

// Earned-points breakdown (#641, ADR-0053).

/** base 10 × 1.1 + 14 vote points = 25. */
function multiplierState(): PraxisDetailState {
  const s = state();
  s.praxis = { ...PRAXIS, task_point_value: 10, score: 25, display_multiplier: 1.1, points_from_votes: 14 };
  return s;
}

// Metatask seal stack (#932); the seal dispatches on the METATASK's faction.

const SEAL_METATASK = aMetatask({ metatask_faction_slug: "snide" });

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

// The task-reference band must not restate the stamp's total when it equals
// the base (#1833, `stampRestatesTaskPoints`).
const TASK_WORTH = i18n.t("praxis:detail.taskRef.points", { points: 30, count: 30 });

describe("task-reference points (#1833)", () => {
  const baseOnly = (over: Partial<typeof PRAXIS> = {}) => {
    const s = state();
    s.praxis = { ...PRAXIS, points_from_votes: 0, score: 30, ...over };
    return s;
  };

  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} drops the figure the stamp already prints`, () => {
      const { text } = render(<Archetype state={baseOnly()} />);
      expect(text, "the level still reads").toContain("Level 3");
      // Same string in both places (#1866), so only the count tells them apart.
      expect(text.split("30"), "the stamp still carries the total").toHaveLength(2);
      expect(text, "and the band does not repeat it").not.toContain(TASK_WORTH);
    });

    it(`${slug} keeps both figures once votes move the total`, () => {
      // base 30 + 16 from votes = 46.
      const { text } = render(<Archetype state={state()} />);
      expect(text, "what the task is worth").toContain(TASK_WORTH);
      expect(text, "what this praxis scored").toContain("46");
    });

    it(`${slug} keeps the figure on a praxis with no stamp at all`, () => {
      // A failed praxis has no stamp (#1444), so the band is the only readout.
      const { text } = render(<Archetype state={baseOnly({ moderation_status: "failed" })} />);
      expect(text.split("30"), "no total was banked").toHaveLength(2);
      expect(text, "so what the task is worth stays").toContain(TASK_WORTH);
    });
  }
});

// The remaining six slots (#2718). Each row also asserts the complement, so an
// archetype drawing the slot unconditionally fails too.

const NOTICE_LABEL = i18n.t("praxis:detail.banners.flaggedLabel");
const STEWARD_EYEBROW = i18n.t("praxis:detail.admin.eyebrow");
const OWNER_TRIGGER = i18n.t("praxis:detail.owner.unsubmit");
const REPORT_TITLE = i18n.t("praxis:detail.flag.title");
const COMMENTS_HEAD = i18n.t("praxis:detail.sections.comments");
const DUEL_HEAD = i18n.t("praxis:duelCrossLink.label");

/**
 * The notice's inks, read back out of the markup: a text check can't see a
 * notice painted in its own paper (#1627). Measured contrast lives in
 * `detailWallAlarmInk.test.tsx` and `utils/__tests__/factionContrast.test.ts`.
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

/** Suffixes that name a GROUND. */
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

      // #1449.
      expect(label, "the label and its rule are one colour").toBe(edge);

      // A literal cannot flip with the dark-mode cascade.
      for (const [role, ink] of [["edge", edge], ["label", label], ["body", body]] as const) {
        expect(ink, `${role} is a declared token`).toMatch(/^var\(--[a-z0-9-]+\)$/);
        expect(
          ["currentColor", "inherit", "transparent"].includes(ink),
          `${role} takes a real ink, not an inherited one`,
        ).toBe(false);
      }

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
      // Gated in `PraxisDetailComments` to `visible` praxes (ADR-0061).
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

// AUTHORING-side guard (#2718): an archetype that delegates to
// `PraxisDetailSkin` must not re-mount what the skin owns (a render walk can't
// see that). Slugs and files are derived from the manifests; the mount list is
// hand-authored so it isn't a tautology (see `kitInvariants.test.tsx`). Only
// delegating archetypes are held to it (own trees are allowed, ADR-0061), so
// the delegating population is pinned too.

/**
 * Mounts the skin owns. Not listed (kit-supplied, dressed): `ScoreStamp`,
 * `MemberByline`, `PraxisOwnerActions`, `bylineFaces`, `taskRefMeta`.
 */
const SKIN_OWNED = [
  "PraxisStatusBanners",
  "PraxisAdminBar",
  "PraxisFlagBlock",
  "PraxisDetailComments",
  "DuelCard",
  "MetataskSeal",
  // Score-panel gate (#1444): a rule, not dress.
  "scoreWasBanked",
  // Site chrome (#2102).
  "Breadcrumb",
] as const;

/**
 * slug → archetype file, from the manifests. Keyed on the declared `slug`, not
 * the filename (`na` ships from `default.ts`).
 */
function archetypeSources(): Record<string, string> {
  // The shared walk, never a private `readdirSync` (#2887).
  const manifests = sourceFiles({ dir: join(SRC_DIR, "factions"), match: /\.ts$/ });
  const found: Record<string, string> = {};
  for (const file of manifests) {
    const manifest = readStripped(file);
    const slug = manifest.match(/slug:\s*["'](\w+)["']/)?.[1];
    const binding = manifest.match(/praxisDetail:\s*\(\)\s*=>\s*(\w+)/)?.[1];
    if (!slug || !binding) continue;
    const path = manifest.match(
      new RegExp(`const ${binding}\\s*=[^\\n]*import\\(["']([^"']+)["']\\)`),
    )?.[1];
    expect(path, `${toRelative(file)} binds ${binding} to no import`).toBeTruthy();
    found[slug] = join(SRC_DIR, `${path!.replace(/^\.\.\//, "")}.tsx`);
  }
  return found;
}

/**
 * Split on whether the file imports `praxisDetailSkin`. `ownTree` is today only
 * the Albescent wrapper, which forwards to `DefaultPraxisDetail` (ADR-0048).
 */
function delegation(): {
  delegates: Record<string, string>;
  ownTree: string[];
} {
  const sources = archetypeSources();
  const delegates: Record<string, string> = {};
  const ownTree: string[] = [];
  for (const slug of Object.keys(surfaceMap("praxisDetail"))) {
    const file = sources[slug];
    expect(file, `no manifest declares a praxisDetail archetype for ${slug}`).toBeTruthy();
    const source = readStripped(file);
    if (/from\s*["'][^"']*praxisDetailSkin["']/.test(source)) delegates[slug] = source;
    else ownTree.push(slug);
  }
  return { delegates, ownTree };
}

describe("no delegating archetype re-mounts what the skin owns (#2718)", () => {
  const skin = readStripped(
    join(SRC_DIR, "pages/praxisDetail/praxisDetailSkin.tsx"),
  );
  const { delegates, ownTree } = delegation();

  // Non-vacuity: `<Name` or `Name(` is a mount; an import is not.
  it.each(SKIN_OWNED)("%s is mounted by the skin, not merely imported", (name) => {
    expect(
      new RegExp(`<${name}[\\s/>]|\\b${name}\\(`).test(skin),
      `${name} is imported by praxisDetailSkin.tsx but never mounted there — ` +
        "so forbidding it in the archetypes forbids nothing",
    ).toBe(true);
  });

  // A new own-tree faction may lower this legitimately; say so in the PR.
  it("eight of the nine registered archetypes are on the shared spine", () => {
    expect(
      Object.keys(delegates).length,
      `only ${Object.keys(delegates).length} archetype(s) import the skin; ` +
        `these do not: ${ownTree.join(", ") || "(none)"}`,
    ).toBeGreaterThanOrEqual(8);
    expect(ownTree, "the wrapper is the only archetype off the spine").toEqual([
      "albescent",
    ]);
  });

  for (const [slug, source] of Object.entries(delegates)) {
    it(`${slug} supplies a kit and nothing the skin already mounts`, () => {
      for (const name of SKIN_OWNED) {
        expect(source, `${slug} re-mounts ${name}`).not.toContain(name);
      }
    });
  }
});

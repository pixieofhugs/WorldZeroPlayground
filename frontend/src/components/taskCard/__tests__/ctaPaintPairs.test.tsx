/**
 * ONE CTA PAINT PER FACTION, ASSERTED WHERE IT CAN ACTUALLY DRIFT (#2642, and
 * a third surface since #2818).
 *
 * The seam is the RENDERED INLINE STYLE of the sign-up control on all three
 * surfaces — a task card, the task detail for the same task, and the faction
 * DIRECTORY tile's join button — read out of `renderToStaticMarkup` on each.
 * The tile is the same act (join this) reached by a different door, and it had
 * drifted exactly the way the detail had. Not the constant: a test that imported
 * `UA_CARD_CTA` and compared it with itself would pass while a call site quietly
 * spread `{ ...UA_CARD_CTA, background: somethingElse }` over the top, and a
 * call-site override is precisely the failure mode. Eighteen hand-maintained
 * paints came about one override at a time.
 *
 * EVERY FACTION IS NAMED, and the table is a literal rather than a census of
 * whatever the surface map happens to hold. A count-based check ("nine pairs
 * agree") passes just as happily when a tenth surface is registered wrong twice.
 *
 * WHAT IS ALLOWED TO DIFFER is exactly the keys of `CTA_DETAIL_SIZE` and
 * `CTA_SELECT_SIZE`, read from the tokens themselves so this file learns
 * nothing about which those are. That is the whole of the sanctioned
 * difference: the card's CTA sits in a narrow column, the detail's stands alone
 * in a panel, and the tile's runs the width of a 360px directory card.
 *
 * No jsdom in this repo (see `taskCardsV3.test.tsx`), so this is markup and
 * inline declarations — which is all a paint is here anyway.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ComponentType, ReactElement } from "react";
import { describe, it, expect, vi } from "vitest";
import "../../../i18n";

import { stripComments } from "../../../utils/__tests__/cssVars";

vi.mock("../../../hooks/useFormFactor", () => ({
  useFormFactor: () => "desktop",
}));

// Imported after the mock is registered.
import AlbescentTaskCard from "../AlbescentTaskCard";
import CovenTaskCard from "../CovenTaskCard";
import DefaultTaskCard from "../DefaultTaskCard";
import EphemeristsTaskCard from "../EphemeristsTaskCard";
import EverymenTaskCard from "../EverymenTaskCard";
import SingularityTaskCard from "../SingularityTaskCard";
import SnideTaskCard from "../SnideTaskCard";
import UaTaskCard from "../UaTaskCard";
import WowTaskCard from "../WowTaskCard";
import type { CardProps } from "../TaskCard";
import { CTA_DETAIL_SIZE, CTA_SELECT_SIZE, SINGULARITY_DETAIL_GLOW } from "../cardCta";

import AlbescentSelectCard from "../../selectCard/AlbescentSelectCard";
import CovenSelectCard from "../../selectCard/CovenSelectCard";
import DefaultSelectCard from "../../selectCard/DefaultSelectCard";
import EphemeristsSelectCard from "../../selectCard/EphemeristsSelectCard";
import EverymenSelectCard from "../../selectCard/EverymenSelectCard";
import SingularitySelectCard from "../../selectCard/SingularitySelectCard";
import SnideSelectCard from "../../selectCard/SnideSelectCard";
import UaSelectCard from "../../selectCard/UaSelectCard";
import WowSelectCard from "../../selectCard/WowSelectCard";
import type { FactionSelectCardProps } from "../../selectCard/FactionSelectCard";
import { setAlbescentRevealed } from "../../../utils/factions";

import AlbescentTaskDetail from "../../../pages/taskDetail/archetypes/AlbescentTaskDetail";
import CovenTaskDetail from "../../../pages/taskDetail/archetypes/CovenTaskDetail";
import DefaultTaskDetail from "../../../pages/taskDetail/archetypes/DefaultTaskDetail";
import EphemeristsTaskDetail from "../../../pages/taskDetail/archetypes/EphemeristsTaskDetail";
import EverymenTaskDetail from "../../../pages/taskDetail/archetypes/EverymenTaskDetail";
import SingularityTaskDetail from "../../../pages/taskDetail/archetypes/SingularityTaskDetail";
import SnideTaskDetail from "../../../pages/taskDetail/archetypes/SnideTaskDetail";
import UaTaskDetail from "../../../pages/taskDetail/archetypes/UaTaskDetail";
import WowTaskDetail from "../../../pages/taskDetail/archetypes/WowTaskDetail";
import type { TaskDetailState } from "../../../pages/taskDetail/useTaskDetail";
import { aTask } from "../../../test/fixtures";

const TASK = aTask({
  id: 207,
  description: "Leave something small and honest where a stranger will find it.",
  in_progress_count: 4,
});

/** A viewer who can sign up: the one state in which both surfaces draw a CTA. */
function detailState(): TaskDetailState {
  return {
    loading: false,
    task: TASK,
    fetchError: null,
    comments: null,
    submissions: [],
    friends: new Set(),
    foes: new Set(),
    mySubmission: undefined,
    isInProgress: false,
    inProgressPraxisId: null,
    canSignUp: true,
    levelJumpSignup: false,
    slotsOpen: 2,
    maxTaskSlots: 3,
    basePoints: 18,
    factionMultiplier: 1.0,
    modifiedPoints: 18,
    inProgressCount: 4,
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
}

type SelectCard = ComponentType<Omit<FactionSelectCardProps, "faction">>;

interface Trio {
  slug: string;
  Card: ComponentType<CardProps>;
  Detail: ComponentType<{ state: TaskDetailState }>;
  Select: SelectCard;
  /** The tile's own file. A handler is invisible to a static render. */
  tile: string;
}

/**
 * All nine. `na` and `albescent` are rows like any other — Albescent wraps the
 * na card, the na detail (ADR-0048) AND the na directory tile (#2632, #2644), so
 * it needs no fourth constant, and this row is what proves the inheritance
 * rather than assuming it.
 *
 * `FactionSelectCard` is the DISPATCHER and is deliberately not here: naming the
 * nine archetypes is the same choice the two columns beside them make, and a row
 * that went through the dispatcher would pass while an archetype was unregistered.
 */
const TILES = "../../selectCard/";
const TRIOS: Trio[] = [
  { slug: "na", Card: DefaultTaskCard, Detail: DefaultTaskDetail, Select: DefaultSelectCard, tile: `${TILES}DefaultSelectCard.tsx` },
  { slug: "albescent", Card: AlbescentTaskCard, Detail: AlbescentTaskDetail, Select: AlbescentSelectCard, tile: `${TILES}AlbescentSelectCard.tsx` },
  { slug: "coven", Card: CovenTaskCard, Detail: CovenTaskDetail, Select: CovenSelectCard, tile: `${TILES}CovenSelectCard.tsx` },
  { slug: "ephemerists", Card: EphemeristsTaskCard, Detail: EphemeristsTaskDetail, Select: EphemeristsSelectCard, tile: `${TILES}EphemeristsSelectCard.tsx` },
  { slug: "everymen", Card: EverymenTaskCard, Detail: EverymenTaskDetail, Select: EverymenSelectCard, tile: `${TILES}EverymenSelectCard.tsx` },
  { slug: "singularity", Card: SingularityTaskCard, Detail: SingularityTaskDetail, Select: SingularitySelectCard, tile: `${TILES}SingularitySelectCard.tsx` },
  { slug: "snide", Card: SnideTaskCard, Detail: SnideTaskDetail, Select: SnideSelectCard, tile: `${TILES}SnideSelectCard.tsx` },
  { slug: "ua", Card: UaTaskCard, Detail: UaTaskDetail, Select: UaSelectCard, tile: `${TILES}UaSelectCard.tsx` },
  { slug: "wow", Card: WowTaskCard, Detail: WowTaskDetail, Select: WowSelectCard, tile: `${TILES}WowSelectCard.tsx` },
];

/**
 * The tile, in the state where its door is OPEN — which is the state the other
 * two columns are rendered in (`canSignUp: true`).
 *
 * Only Albescent has a shut one, and it is not a paint difference: an unrevealed
 * viewer gets `disabled` and `cursor: default` (#2409, ADR-0082), so comparing a
 * redacted tile against a live task card would report the affordance as drift.
 * The flag is module-level, hence the reset.
 */
function selectMarkup(Select: SelectCard): string {
  setAlbescentRevealed(true);
  try {
    return markup(<Select state="eligible" members={3} />);
  } finally {
    setAlbescentRevealed(false);
  }
}

function markup(element: ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
}

/** One tile's source, comments stripped — they cite the retired handlers. */
function tileSource(relative: string): string {
  return stripComments(readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8"));
}

/** `minHeight` → `min-height`, the way React writes it into the attribute. */
function kebab(key: string): string {
  return key.replace(/[A-Z]/g, (upper) => `-${upper.toLowerCase()}`);
}

/**
 * The sanctioned difference, read off the two geometry tokens and dropped from
 * every surface — so a card's padding is no more pinned than a tile's, and this
 * file still learns nothing about which declarations they are.
 */
const SIZE_KEYS = new Set(
  [...Object.keys(CTA_DETAIL_SIZE), ...Object.keys(CTA_SELECT_SIZE)].map(kebab),
);

/**
 * The ONE per-faction exception, owner-ruled on #2642 (2026-08-27): Singularity's
 * detail keeps the glow the consolidation would otherwise have subtracted.
 *
 * Keyed BY SLUG and read off the constant, so this file learns nothing about
 * which declarations those are and a second exception cannot be smuggled in by
 * editing a test. Every other faction's allowance is empty, which is the point:
 * `singularity` is named here and the other eight are named by their absence.
 */
const EXTRA_DETAIL_KEYS: Record<string, Set<string>> = {
  singularity: new Set(Object.keys(SINGULARITY_DETAIL_GLOW).map(kebab)),
};

/**
 * The CTA's declarations, keyed, with the size token's keys dropped.
 *
 * Anchored on `min-height:44px` — the WCAG 2.5.5 floor out of `CARD_CTA`, which
 * every faction constant spreads and which nothing else on either surface
 * declares inline. Asserting there is exactly ONE such element is half the
 * guard: it is what makes the anchor a handle on the sign-up rather than on
 * whatever else happens to be tall enough.
 */
function ctaPaint(
  html: string,
  where: string,
  allowed: Set<string> = new Set(),
): Map<string, string> {
  const styles = [...html.matchAll(/style="([^"]*)"/g)]
    .map(([, value]) => value)
    .filter((value) => value.includes("min-height:44px"));
  expect(styles, `one CTA on the ${where}`).toHaveLength(1);
  const paint = new Map<string, string>();
  for (const declaration of styles[0].split(";")) {
    const at = declaration.indexOf(":");
    if (at < 0) continue;
    const key = declaration.slice(0, at).trim();
    if (SIZE_KEYS.has(key) || allowed.has(key)) continue;
    paint.set(key, declaration.slice(at + 1).trim());
  }
  return paint;
}

describe("a faction's task card, task detail and directory tile wear one CTA paint", () => {
  for (const { slug, Card, Detail, Select, tile } of TRIOS) {
    it(`${slug} paints its sign-up the same on all three surfaces`, () => {
      const card = ctaPaint(
        markup(
          <Card
            task={TASK}
            basePoints={TASK.point_value}
            multiplier={1.0}
            inProgressCount={4}
            onSignup={() => {}}
          />,
        ),
        `${slug} card`,
      );
      const detail = ctaPaint(
        markup(<Detail state={detailState()} />),
        `${slug} detail`,
        EXTRA_DETAIL_KEYS[slug],
      );
      // NO ALLOWANCE FOR THE TILE, and that is a decision (#2818). The one
      // carve-out is `SINGULARITY_DETAIL_GLOW` — ruled because consolidating
      // eighteen paints onto nine was purely SUBTRACTIVE on that one surface,
      // which is a fact about the detail and not about the faction. The tile
      // never had the glow, so extending the allowance to it would license the
      // glow to appear or vanish there unnoticed, which is the opposite of what
      // a named exception is for. All nine tiles compare exactly.
      const select = ctaPaint(selectMarkup(Select), `${slug} tile`);

      expect(Object.fromEntries(detail)).toEqual(Object.fromEntries(card));
      expect(Object.fromEntries(select)).toEqual(Object.fromEntries(card));
      // Not vacuous: a paint is a colour and a face, never an empty map.
      expect(card.size, `${slug} declares a paint at all`).toBeGreaterThan(4);
    });

    it(`${slug} declares every exception it is allowed, and no other`, () => {
      // The allowance above lets a key DIFFER; it does not require the key to be
      // there. Without this, dropping Singularity's glow again passes the pair
      // check silently -- which is precisely how it was dropped in the first
      // place, and the failure mode a subtractive carve-out always has.
      const detail = ctaPaint(markup(<Detail state={detailState()} />), `${slug} detail`);
      for (const key of EXTRA_DETAIL_KEYS[slug] ?? []) {
        expect(detail.has(key), `${slug} detail still declares ${key}`).toBe(true);
      }
    });

    it(`${slug} keeps the 44px hit target on the detail and the tile`, () => {
      // Geometry, not spacing (WCAG 2.5.5): a size token may widen a button but
      // may never shorten it below the floor the card solved for. The tile is
      // the reason this is asserted per surface rather than inferred from the
      // spread — before #2818 not one of the ten directory tiles carried it, and
      // S.N.I.D.E.'s computed to roughly 34px.
      expect(markup(<Detail state={detailState()} />)).toContain("min-height:44px");
      expect(selectMarkup(Select)).toContain("min-height:44px");
    });

    it(`${slug}'s tile hands its join button no hover of its own`, () => {
      // Owner ruling (#2818): all nine tiles behave the way both other surfaces
      // already do. `index.css` carries no `:hover` on any CTA class and no task
      // card CTA has a handler, so three tiles repainting themselves inline was
      // the odd one out. Asserted on the SOURCE because a static render cannot
      // see a handler at all — which is exactly why the drift survived.
      //
      // `:focus-visible` is untouched by this and by the ruling: it is a
      // stylesheet state, and nothing here or in the tiles suppresses it.
      expect(tileSource(tile), `${slug}'s tile repaints its CTA on hover`).not.toMatch(
        /onMouse(Enter|Leave)/,
      );
    });
  }
});

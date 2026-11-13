/**
 * One CTA paint per faction across task card, task detail and directory tile
 * (#2642, #2818). The seam is the RENDERED inline style, not the constant: the
 * failure mode is a call site spreading an override over it. Every faction is
 * named literally, not censused. Only `CTA_DETAIL_SIZE`/`CTA_SELECT_SIZE` keys
 * may differ.
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
 * Albescent inherits the na card, detail and tile (ADR-0048, #2644); its row
 * proves that. Not the `FactionSelectCard` dispatcher: that would pass while an
 * archetype was unregistered.
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
 * The tile with its door OPEN, matching `canSignUp: true`. An unrevealed
 * Albescent tile is `disabled` (#2409) — not drift. The flag is module-level.
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

/** The sanctioned difference, read off the two size tokens. */
const SIZE_KEYS = new Set(
  [...Object.keys(CTA_DETAIL_SIZE), ...Object.keys(CTA_SELECT_SIZE)].map(kebab),
);

/**
 * The ONE exception, owner-ruled on #2642: Singularity's detail keeps its glow.
 * Read off the constant, keyed by slug, so no exception can be added in a test.
 */
const EXTRA_DETAIL_KEYS: Record<string, Set<string>> = {
  singularity: new Set(Object.keys(SINGULARITY_DETAIL_GLOW).map(kebab)),
};

/**
 * The CTA's declarations minus size keys. Anchored on `min-height:44px` (from
 * `CARD_CTA`, declared by nothing else); exactly ONE match keeps the anchor honest.
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
      // No allowance for the tile (#2818): it never had the glow, so allowing
      // it would let the glow appear or vanish there unnoticed.
      const select = ctaPaint(selectMarkup(Select), `${slug} tile`);

      expect(Object.fromEntries(detail)).toEqual(Object.fromEntries(card));
      expect(Object.fromEntries(select)).toEqual(Object.fromEntries(card));
      expect(card.size, `${slug} declares a paint at all`).toBeGreaterThan(4);
    });

    it(`${slug} declares every exception it is allowed, and no other`, () => {
      // The allowance lets a key DIFFER; this makes it required, so dropping
      // the glow can't pass silently.
      const detail = ctaPaint(markup(<Detail state={detailState()} />), `${slug} detail`);
      for (const key of EXTRA_DETAIL_KEYS[slug] ?? []) {
        expect(detail.has(key), `${slug} detail still declares ${key}`).toBe(true);
      }
    });

    it(`${slug} keeps the 44px hit target on the detail and the tile`, () => {
      // WCAG 2.5.5; before #2818 no directory tile carried it.
      expect(markup(<Detail state={detailState()} />)).toContain("min-height:44px");
      expect(selectMarkup(Select)).toContain("min-height:44px");
    });

    it(`${slug}'s tile hands its join button no hover of its own`, () => {
      // Owner ruling (#2818). Asserted on SOURCE: a static render can't see a
      // handler. `:focus-visible` is a stylesheet state and untouched.
      expect(tileSource(tile), `${slug}'s tile repaints its CTA on hover`).not.toMatch(
        /onMouse(Enter|Leave)/,
      );
    });
  }
});

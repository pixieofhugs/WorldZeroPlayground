/**
 * ONE CTA PAINT PER FACTION, ASSERTED WHERE IT CAN ACTUALLY DRIFT (#2642).
 *
 * The seam is the RENDERED INLINE STYLE of the sign-up control on both surfaces
 * — a task card, and the task detail for the same task — read out of
 * `renderToStaticMarkup` on each. Not the constant: a test that imported
 * `UA_CARD_CTA` and compared it with itself would pass while a call site quietly
 * spread `{ ...UA_CARD_CTA, background: somethingElse }` over the top, and a
 * call-site override is precisely the failure mode. Eighteen hand-maintained
 * paints came about one override at a time.
 *
 * EVERY FACTION IS NAMED, and the table is a literal rather than a census of
 * whatever the surface map happens to hold. A count-based check ("nine pairs
 * agree") passes just as happily when a tenth surface is registered wrong twice.
 *
 * WHAT IS ALLOWED TO DIFFER is exactly the keys of `CTA_DETAIL_SIZE`, read from
 * the token itself so this file learns nothing about which those are. That is
 * the whole of the sanctioned difference: the card's CTA sits in a narrow
 * column, the detail's stands alone in a panel.
 *
 * No jsdom in this repo (see `taskCardsV3.test.tsx`), so this is markup and
 * inline declarations — which is all a paint is here anyway.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ComponentType, ReactElement } from "react";
import { describe, it, expect, vi } from "vitest";
import "../../../i18n";

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
import { CTA_DETAIL_SIZE, SINGULARITY_DETAIL_GLOW } from "../cardCta";

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

interface Pair {
  slug: string;
  Card: ComponentType<CardProps>;
  Detail: ComponentType<{ state: TaskDetailState }>;
}

/**
 * All nine. `na` and `albescent` are pairs like any other — Albescent wraps the
 * na card AND the na detail (ADR-0048), so it needs no fourth constant, and this
 * row is what proves the inheritance rather than assuming it.
 */
const PAIRS: Pair[] = [
  { slug: "na", Card: DefaultTaskCard, Detail: DefaultTaskDetail },
  { slug: "albescent", Card: AlbescentTaskCard, Detail: AlbescentTaskDetail },
  { slug: "coven", Card: CovenTaskCard, Detail: CovenTaskDetail },
  { slug: "ephemerists", Card: EphemeristsTaskCard, Detail: EphemeristsTaskDetail },
  { slug: "everymen", Card: EverymenTaskCard, Detail: EverymenTaskDetail },
  { slug: "singularity", Card: SingularityTaskCard, Detail: SingularityTaskDetail },
  { slug: "snide", Card: SnideTaskCard, Detail: SnideTaskDetail },
  { slug: "ua", Card: UaTaskCard, Detail: UaTaskDetail },
  { slug: "wow", Card: WowTaskCard, Detail: WowTaskDetail },
];

function markup(element: ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
}

/** `minHeight` → `min-height`, the way React writes it into the attribute. */
function kebab(key: string): string {
  return key.replace(/[A-Z]/g, (upper) => `-${upper.toLowerCase()}`);
}

const SIZE_KEYS = new Set(Object.keys(CTA_DETAIL_SIZE).map(kebab));

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

describe("a faction's task card and task detail wear one CTA paint", () => {
  for (const { slug, Card, Detail } of PAIRS) {
    it(`${slug} paints its sign-up the same on both surfaces`, () => {
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

      expect(Object.fromEntries(detail)).toEqual(Object.fromEntries(card));
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

    it(`${slug} keeps the 44px hit target on both surfaces`, () => {
      // Geometry, not spacing (WCAG 2.5.5): the size token may widen the detail's
      // button but may never shorten it below the floor the card solved for.
      const detail = markup(<Detail state={detailState()} />);
      expect(detail).toContain("min-height:44px");
    });
  }
});

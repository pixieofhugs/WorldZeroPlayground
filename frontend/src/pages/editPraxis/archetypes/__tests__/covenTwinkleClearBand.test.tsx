/**
 * The Coven masthead's twinkles stay out of the middle (#1983).
 *
 * The bug: a gold four-point twinkle sat immediately left of the "c" in "cozy",
 * so star + c read as one crossed letter — "tozy". Nudging that one star is the
 * wrong fix, and this test exists to pin WHY.
 *
 * `TwinkleField`'s svg is `width="100%"` with `preserveAspectRatio="none"`, so a
 * star's x is a fixed FRACTION of the band. The wordmark above it is a centred
 * flex row at a FIXED size (`SigilDisc size={30}` + `--space-sm` + 22px text).
 * Narrow the viewport and the fixed row grows as a fraction while the star does
 * not move — so a star near the centre drifts FURTHER under the lettering, never
 * clear of it. The y axis is no escape either: the 72-unit viewBox is stretched
 * over a wrapper that is the wordmark row PLUS the `Braid`, so a star's y does
 * not map to "above the lettering".
 *
 * Horizontal exclusion is the only rule that holds at every width, and the
 * wordmark is centred, so the ornament keeps one rule: stay out of the middle.
 *
 * CLEAR BAND — the arithmetic, at the narrowest supported viewport (375px, the
 * floor SPEC-faction-ui-profile §"No fixed-px grids" names):
 *
 *   band width = 375 − 2×12 (ComposerSheet's mobile padX, `--space-md`)
 *                    − 2×16 (the masthead's own `--space-lg` padding) = 319px
 *   wordmark   = 30 (SigilDisc) + 8 (`--space-sm`)
 *              + 3.832em × 22px  ("cozy coven" summed off the shipped
 *                                 grenze-gotisch-400to600 woff2 at wght 400)
 *              + 10 × 0.02 × 22  (letterSpacing) = 126.7px
 *   fraction   = 126.7 / 319 = 39.7%, centred → 30.1%…69.9%
 *              → 144.8…335.2 of the 480-unit viewBox.
 *
 * That clears [105, 375] with ~40 viewBox units to spare each side. The row only
 * reaches 105/375 once the band falls to 126.7 / (270/480) = 225px, i.e. a 281px
 * viewport — below any supported width. So 105/375 is the guard, and if a future
 * wordmark grows the answer is to WIDEN the exclusion, not to re-enter the
 * centre.
 *
 * renderToStaticMarkup, no DOM — this reads the shipped path data rather than a
 * source constant, so a star cannot re-enter the band by any route.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../../i18n";
import { anEditPraxisState } from "../../../../test/fixtures";
import type { PraxisOut } from "../../../../api/praxis";
import type { TaskOut } from "../../../../api/tasks";

const mocks = vi.hoisted(() => ({
  formFactor: "desktop" as "mobile" | "desktop",
}));
vi.mock("../../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));

import CovenEditPraxis from "../CovenEditPraxis";

/** The wordmark is centred, so the exclusion is symmetric about 240 of 480. */
const CLEAR_FROM = 105;
const CLEAR_TO = 375;

const task = {
  id: 7,
  title: "Bless the work",
  description: "Do a small honest thing.",
  point_value: 20,
  level_required: 1,
  status: "active",
  task_type: "standard",
  primary_faction_slug: "coven",
  allowed_modes: ["solo", "collab", "duel"],
} as unknown as TaskOut;

const praxis = {
  id: 55,
  task_id: 7,
  task_title: "Bless the work",
  task_faction_slug: "coven",
  type: "solo",
  status: "in_progress",
  title: "I helped a stranger",
  body_text: "Caught the papers.",
  moderation_status: "visible",
  duel_id: null,
  created_by_id: 3,
  members: [],
  invites: [],
  media_items: [],
} as unknown as PraxisOut;

// Everything not named here is the fixture's quiet default (#2877).
const state = anEditPraxisState({
  praxis,
  task,
  // Spelled, not `praxis.title`: that is `string | null` on the wire and the
  // composer's draft title is not — a mismatch the old cast hid.
  title: "I helped a stranger",
  body: "Caught the papers.",
  autoSubmitDays: 10,
  duelChipVisible: true,
});

/** The twinkle band is the one svg on the page drawn in a 480×72 viewBox. */
function twinklePaths(formFactor: "mobile" | "desktop"): string[] {
  mocks.formFactor = formFactor;
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <CovenEditPraxis state={state} />
    </MemoryRouter>,
  );
  const band = markup.match(/<svg[^>]*viewBox="0 0 480 72"[^>]*>(.*?)<\/svg>/s);
  expect(band, "the twinkle band is missing from the masthead").not.toBeNull();
  return Array.from(band![1].matchAll(/\bd="([^"]+)"/g), (m) => m[1]);
}

/**
 * Widest and narrowest x the path paints — walked, not derived from `starPath`,
 * so a change to the star's SHAPE is caught as well as a change to its centre.
 * Every twinkle is one `M x y` followed by relative `l dx dy` pairs.
 */
function xSpan(d: string): [number, number] {
  const nums = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  let x = nums[0];
  let min = x;
  let max = x;
  for (let i = 2; i + 1 < nums.length; i += 2) {
    x += nums[i];
    min = Math.min(min, x);
    max = Math.max(max, x);
  }
  return [min, max];
}

describe("Coven masthead twinkles (#1983)", () => {
  it.each(["desktop", "mobile"] as const)(
    "keeps every star clear of the wordmark's centre on %s",
    (formFactor) => {
      const spans = twinklePaths(formFactor).map(xSpan);
      expect(spans.length).toBeGreaterThan(0);
      for (const [min, max] of spans) {
        // Wholly left of the band, or wholly right of it. Never across it.
        expect(
          max <= CLEAR_FROM || min >= CLEAR_TO,
          `star spanning ${min}…${max} enters the wordmark's clear band ` +
            `[${CLEAR_FROM}, ${CLEAR_TO}] of the 480-unit viewBox`,
        ).toBe(true);
      }
    },
  );

  it("keeps the ornament at full strength — six twinkles, not fewer", () => {
    // The fix is to MOVE the stars, not to thin them out; a shrinking field
    // would pass the clear-band check for the wrong reason.
    expect(twinklePaths("desktop")).toHaveLength(6);
  });
});

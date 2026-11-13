/**
 * The Coven masthead's twinkles stay out of the middle (#1983): a star beside
 * the "c" read as "tozy". The svg stretches (`preserveAspectRatio="none"`) while
 * the centred wordmark is fixed-size, so narrowing pushes central stars further
 * under it, and y doesn't map to "above the lettering". Horizontal exclusion is
 * the only rule that holds at every width.
 *
 * At 375px: band = 375 − 2×12 − 2×16 = 319px; wordmark = 30 + 8 + 3.832em×22
 * ("cozy coven", grenze-gotisch wght 400) + 10×0.02×22 = 126.7px → 39.7%
 * centred → 144.8…335.2 of 480. [105, 375] reaches the wordmark only at a 281px
 * viewport. If the wordmark grows, widen the exclusion.
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

const state = anEditPraxisState({
  praxis,
  task,
  // Spelled: `praxis.title` is `string | null`, the draft title is not.
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

/** x extent, walked from `M x y` + relative `l dx dy` pairs so shape changes count. */
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
        expect(
          max <= CLEAR_FROM || min >= CLEAR_TO,
          `star spanning ${min}…${max} enters the wordmark's clear band ` +
            `[${CLEAR_FROM}, ${CLEAR_TO}] of the 480-unit viewBox`,
        ).toBe(true);
      }
    },
  );

  it("keeps the ornament at full strength — six twinkles, not fewer", () => {
    // Thinning the field would pass the clear-band check for the wrong reason.
    expect(twinklePaths("desktop")).toHaveLength(6);
  });
});

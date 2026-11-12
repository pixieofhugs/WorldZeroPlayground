/**
 * The task slip's title is a link on every slip surface (#1705), rendered per
 * slug so a skin's `titleStyle` is seen landing on the box, not swallowed.
 * `waiting` covers `PraxisWaitingSurface`, the slip's other caller.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../../i18n";
import type { EditPraxisState } from "../../useEditPraxis";
import { anEditPraxisState } from "../../../../test/fixtures";
import type { PraxisOut } from "../../../../api/praxis";
import type { TaskOut } from "../../../../api/tasks";

vi.mock("../../../../hooks/useFormFactor", () => ({
  useFormFactor: () => "desktop",
}));

import { surfaceMap } from "../../../../factions";
import { resolveVariant } from "../../../../utils/factionDispatch";
import { resolvedArchetype } from "../../../../factions/lazyArchetype";

const TASK_ID = 7;
const TASK_TITLE = "A Very Human Thing";
const SUBMITTED = "2026-02-01T00:00:00Z";

function task(slug: string | null): TaskOut {
  return {
    id: TASK_ID,
    title: TASK_TITLE,
    description: "Do a small honest thing.",
    point_value: 20,
    level_required: 1,
    status: "active",
    task_type: "standard",
    created_by: 3,
    primary_faction_slug: slug,
    metatask_faction_slug: null,
    created_at: "2026-01-01T00:00:00Z",
    can_sign_up: true,
    allowed_modes: ["solo", "collab", "duel"],
    eligible_for_current_user: true,
  } as unknown as TaskOut;
}

function praxis(slug: string | null): PraxisOut {
  return {
    id: 55,
    task_id: TASK_ID,
    task_title: TASK_TITLE,
    task_faction_slug: slug,
    task_point_value: 20,
    type: "solo",
    status: "in_progress",
    title: "I helped a stranger",
    body_text: "## What I did\n\nCaught the papers.",
    moderation_status: "visible",
    duel_id: null,
    created_by_id: 3,
    submitted_at: SUBMITTED,
    updated_at: SUBMITTED,
    submit_proposed_at: SUBMITTED,
    score: 20,
    metatask_points: 0,
    display_multiplier: 1,
    points_from_votes: 0,
    members: [],
    invites: [],
    media_items: [],
  } as unknown as PraxisOut;
}

function state(slug: string | null, phase: "composing" | "waiting"): EditPraxisState {
  return anEditPraxisState({
    phase,
    praxis: praxis(slug),
    task: task(slug),
    title: "I helped a stranger",
    body: "## What I did",
    autoSubmitDays: 10,
  });
}

function render(slug: string | null, phase: "composing" | "waiting"): string {
  const Archetype = resolvedArchetype(
    resolveVariant(surfaceMap("editPraxis"), slug),
  )!;
  return renderToStaticMarkup(
    <MemoryRouter>
      <Archetype state={state(slug, phase)} />
    </MemoryRouter>,
  );
}

/** Title box + anchor as one match: the breadcrumb has the same href and text. */
const SLIP_TITLE = new RegExp(
  `<div style="([^"]*)">(<a [^>]*>)${TASK_TITLE}</a></div>`,
);

/** Every `editPraxis` slug from the registry (#2815), plus factionless `null`. */
const SLUGS: (string | null)[] = [
  null,
  ...Object.keys(surfaceMap("editPraxis")),
];

const STAGES = ["composing", "waiting"] as const;

describe.each(STAGES)("the slip title links its task while %s (#1705)", (phase) => {
  it.each(SLUGS)("%s", (slug) => {
    const match = render(slug, phase).match(SLIP_TITLE);
    expect(match).not.toBeNull();
    const [, boxStyle, anchor] = match!;
    expect(anchor).toContain(`href="/tasks/${TASK_ID}"`);
    expect(anchor).toContain("hover:underline");
    // The dress stays on the box; the anchor inherits.
    expect(boxStyle).toContain("font-size:var(--text-content)");
    expect(anchor).toContain("color:inherit");
  });
});

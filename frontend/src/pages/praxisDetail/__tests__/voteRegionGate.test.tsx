/**
 * Vote-region ownership gate (#1429).
 *
 * `VoteUI` has always hidden ITSELF for a logged-in viewer the backend says can
 * never vote here (`viewer_can_vote === false`: account ownership or duel
 * participation — the two PERMANENT blocks, #998). The chrome around it did not:
 * every archetype drew the "Cast your vote" heading and its prompt OUTSIDE that
 * component, so the author of a praxis got a section that promised a control and
 * then rendered nothing under it. CLAUDE.md's rule is to hide an unusable
 * control, and an empty plate is that failure one step further along.
 *
 * The seam under test is the region decision, not the widget: `voteRegionVisible`
 * in `components/vote/VoteUI` is the ONE predicate, consumed by `VoteUI` for
 * itself and by each archetype for the section it wraps around it. This walks the
 * real `surfaceMap('praxisDetail')` registry (plus the Default fallback) exactly
 * as `archetypeSlots.test.tsx` does, so a new faction skin is picked up here with
 * no edit to this file — a test that pinned only `Default` would not have caught
 * a bug that shipped in eight archetypes at once.
 *
 * Three viewers, because the gate is not simply `viewer_can_vote`:
 *  - the owner (logged in, `false`) gets NO region at all;
 *  - an eligible logged-in viewer still gets it;
 *  - an ANONYMOUS viewer gets it even on `false`, because `VoteUI` deliberately
 *    falls through to the per-widget login gate for logged-out visitors (#855).
 *
 * SSR-only harness (`renderToStaticMarkup`, no DOM, effects never run), so the
 * signed-in viewer is supplied through the exported `AuthContext` rather than a
 * provider that fetches — and through `state.user`, which `usePraxisDetail` reads
 * off that same context.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import type { ReactElement } from "react";
import "../../../i18n";
import { surfaceMap } from "../../../factions";
import { AuthContext } from "../../../auth/AuthContext";
import DefaultPraxisDetail from "../archetypes/DefaultPraxisDetail";
import type { PraxisDetailState } from "../usePraxisDetail";
import type { CurrentUser } from "../../../api/auth";
import { aPraxis } from '../../../test/fixtures'
import { aPraxisDetailState } from '../../../test/praxisDetail'

const HEADING = "Cast your vote";
const PROMPT = "How much did this move you?";

const PRAXIS = aPraxis({
  task_title: "Mangrove",
  task_point_value: 30,
  task_level_required: 3,
  task_faction_slug: "ua",
  title: "Reforestation",
  body_text: "Seedlings planted along the estuary.",
  submitted_at: "2026-01-02T00:00:00Z",
  created_by_id: 3,
  created_by_display_name: "Ada",
  created_by_faction_slug: "ua",
  updated_at: "2026-01-02T00:00:00Z",
  members: [],
  media_items: [],
  score: 46,
  points_from_votes: 16,
});

function viewer(): CurrentUser {
  return {
    account_id: 1,
    email: 'wz_pilgrim@example.com',
    provider: 'google',
    character: {
      id: 3,
      username: "ada",
      display_name: "Ada",
      bio: '',
      tagline: '',
      avatar_url: '',
      location: '',
      level: 8,
      score: 100,
      all_time_score: 100,
      faction_slug: "ua",
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      badges: [],
      invitations: [],
    },
    is_admin: false,
    can_create_additional_character: false,
    can_start_as_albescent: false,
    albescent_revealed: false,
    albescent_glimpsed: false,
    can_propose_task: false,
    can_propose_metatask: false,
    can_apply_metatask: false,
    can_see_retired_tasks: false,
    can_see_pending_tasks: false,
    can_comment: true,
    albescent_level_required: 8,
    second_character_level_required: 5,
    era_name: "Era 3",
    level_jump_reach: 0,
    level_jump_available: false,
    task_browse_defaults_to_eligible: false,
  };
}

/** Detail state for one viewer, carrying the backend's eligibility answer. */
function state(user: CurrentUser | null, viewerCanVote: boolean): PraxisDetailState {
  return aPraxisDetailState({
    praxis: { ...PRAXIS, viewer_can_vote: viewerCanVote },
    user,
  });
}

function render(element: ReactElement, user: CurrentUser | null): string {
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={{ user, loading: false, refetch: async () => {}, applyUser: () => {}, signOut: async () => {} }}>
      <MemoryRouter>{element}</MemoryRouter>
    </AuthContext.Provider>,
  );
  return html.replace(/<[^>]*>/g, "");
}

// Default fallback is a registered renderable too — walk it alongside the map.
const archetypes = { ...surfaceMap("praxisDetail"), __default__: DefaultPraxisDetail };

describe("praxis-read vote region — ownership gate (#1429)", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} draws no vote region for a viewer who can never vote`, () => {
      const user = viewer();
      const text = render(<Archetype state={state(user, false)} />, user);
      expect(text, "no heading over an absent control").not.toContain(HEADING);
      expect(text, "and no prompt either").not.toContain(PROMPT);
    });

    it(`${slug} still draws the vote region for an eligible viewer`, () => {
      const user = viewer();
      const text = render(<Archetype state={state(user, true)} />, user);
      expect(text, "the heading").toContain(HEADING);
      expect(text, "the prompt").toContain(PROMPT);
    });

    it(`${slug} keeps the region for an anonymous viewer on the same answer`, () => {
      // The logged-out visitor never gets `false` from the backend, but the
      // client must not hide the login gate if one ever arrives (#855).
      const text = render(<Archetype state={state(null, false)} />, null);
      expect(text, "the login gate still needs its heading").toContain(HEADING);
    });
  }
});

/**
 * Praxis-read content-slot invariant guard (ADR-0017 §2, ADR-0002).
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
import { renderToStaticMarkup } from "react-dom/server";
import { surfaceMap } from "../../../factions";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
// Initialize the i18n catalog so shared-chrome copy keys resolve to English text.
import "../../../i18n";
import DefaultPraxisDetail from "../archetypes/DefaultPraxisDetail";
import type { PraxisDetailState } from "../usePraxisDetail";
import type { PraxisOut } from "../../../api/praxis";
import type { TaskOut } from "../../../api/tasks";
import type { VoteSummary } from "../../../api/votes";

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
  // Tag-stripped text — several archetypes split the finding across spans
  // (the Ephemerists' lapis last-word), so the headline only reads contiguously
  // once the wrapping tags are removed.
  return { html, text: html.replace(/<[^>]*>/g, "") };
}

const PRAXIS: PraxisOut = {
  id: 1,
  task_id: 7,
  task_title: "Mangrove",
  task_point_value: 30,
  task_level_required: 3,
  task_faction_slug: "ua",
  type: "solo",
  status: "submitted",
  title: "Reforestation",
  body_text: "Seedlings planted along the estuary.",
  moderation_status: "visible",
  admin_note: null,
  flagged_at: null,
  submitted_at: "2026-01-02T00:00:00Z",
  submit_proposed_at: null,
  created_by_id: 3,
  created_by_display_name: "Ada",
  created_by_faction_slug: "ua",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  members: [],
  invites: [],
  media_items: [],
  // score = (base 30 + meta 0) × 1.0 + vote points 16 = 46 — the common case.
  score: 46,
  metatask_points: 0,
  display_multiplier: 1.0,
  points_from_votes: 16,
  is_top_for_task: false,
  duel_id: null,
  can_flag: true,
  applied_metatasks: [],
};

const VOTES: VoteSummary = {
  praxis_id: 1,
  total_votes: 4,
  total_score: 16,
};

/** Minimal state — the read archetypes consume praxis + votes for presentation;
 *  behavior-slot state is left in its default (anonymous, non-owner) shape. */
function state(): PraxisDetailState {
  return {
    loading: false,
    praxis: PRAXIS,
    fetchError: null,
    comments: null,
    votes: VOTES,
    voters: [],
    duel: null,
    isOwner: false,
    showAdminBar: false,
    user: null,
    withdrawing: false,
    showWithdrawConfirm: false,
    setShowWithdrawConfirm: () => {},
    withdrawError: null,
    adminFailNote: "",
    setAdminFailNote: () => {},
    showFailInput: false,
    setShowFailInput: () => {},
    moderating: false,
    moderateError: null,
    showFlagForm: false,
    setShowFlagForm: () => {},
    flagReason: null,
    setFlagReason: () => {},
    flagDetail: "",
    setFlagDetail: () => {},
    flagging: false,
    flagError: null,
    setFlagError: () => {},
    flagSubmitted: false,
    handleModerate: async () => {},
    handleWithdraw: async () => {},
    handleFlag: async () => {},
    handleKickMember: async () => {},
  };
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

// ─── Task Crown hero (ADR-0028) ──────────────────────────────────────────────
// The crown banner lives in the shared PraxisStatusBanners chrome, so every
// archetype shows it on a crowned praxis and hides it otherwise.

describe("praxis-read Task Crown hero", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} shows the crown hero iff is_top_for_task`, () => {
      const crowned = state();
      crowned.praxis = { ...PRAXIS, is_top_for_task: true };
      expect(render(<Archetype state={crowned} />).text).toContain("TASK CROWN");
      expect(render(<Archetype state={state()} />).text).not.toContain("TASK CROWN");
    });
  }
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
  s.votes = { praxis_id: 1, total_votes: 4, total_score: 14 };
  return s;
}

// ─── Metatask seal stack (#932) ──────────────────────────────────────────────
// Every detail archetype renders the read-only applied-metatask seal stack in
// its below-score / above-media slot when `applied_metatasks` is non-empty, and
// nothing when it is empty. The seal dispatches on the METATASK's issuing
// faction (here `snide`), not the host archetype's — a UA-hosted page shows a
// Snide-issued seal. Its condition line is the metatask title, the anchor below.

const SEAL_METATASK: TaskOut = {
  id: 501,
  title: "Composting",
  description: null,
  point_value: 60,
  level_required: 0,
  status: "active",
  task_type: "metatask",
  created_by: 9,
  primary_faction_slug: null,
  metatask_faction_slug: "snide",
  is_task_vision_eligible: false,
  created_at: "2026-01-01T00:00:00Z",
  can_submit_praxis: false,
  allowed_modes: [],
  eligible_for_current_user: false,
};

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

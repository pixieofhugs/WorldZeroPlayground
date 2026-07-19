/**
 * Praxis-read content-slot invariant guard (ADR-0017 §2, ADR-0002).
 *
 * Every per-faction praxis-read archetype wears a different skin (gilt salon,
 * ransom dossier, terminal printout, union poster, whimsy.exe, illuminated
 * vellum) but must render the same CONTENT slots — an archetype may *arrange*
 * them freely but may not *drop* one. This walks the real `surfaceMap('praxisDetail')`
 * registry (plus the Default fallback) and asserts every registered archetype
 * still emits the invariant slots, so a new faction that drops one fails here.
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
  // Merit = base (30) × 1.0 + vote points (16) = 46 — the common ×1.0 case.
  score: 46,
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
    handleResubmit: async () => {},
    handleFlag: async () => {},
    metatasks: [],
    metataskLoading: false,
    metataskError: null,
    applyingMetataskId: null,
    removingMetataskId: null,
    handleApplyMetatask: async () => {},
    handleRemoveMetatask: async () => {},
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
// Every detail archetype now renders exactly one explicit `{base} + {votes}`
// breakdown (mirroring the card's PraxisScoreHero idiom) instead of a votes-only
// score echoed in the byline, the card header, AND the vote tally. When the
// fixed-at-award multiplier ≠ 1.0, the `{base} × {mult} + {votes}` form renders.

/** A rare non-1.0 multiplier: base 10 × 1.1 + 14 vote points = 25 merit. */
function multiplierState(): PraxisDetailState {
  const s = state();
  s.praxis = { ...PRAXIS, task_point_value: 10, score: 25 };
  s.votes = { praxis_id: 1, total_votes: 4, total_score: 14 };
  return s;
}

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

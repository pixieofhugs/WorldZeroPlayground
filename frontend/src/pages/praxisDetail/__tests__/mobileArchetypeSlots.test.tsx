/**
 * Mobile praxis-read content-slot invariant — the mobile twin of
 * archetypeSlots.test. Walks surfaceMap('mobilePraxisDetail') (the COVEN pilot) plus the
 * Default mobile skin and asserts each still emits the invariant CONTENT slots:
 * the finding title, the account body, the re-task link, and the author byline.
 * The shared Task Crown banner is checked separately. Rendered to static markup
 * (no DOM); `useAuth` resolves to its anonymous default, so the vote caster
 * shows its login gate rather than throwing.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { surfaceMap } from '../../../factions'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'
import DefaultMobilePraxisDetail from '../mobileArchetypes/DefaultPraxisDetail'
import type { PraxisDetailState } from '../usePraxisDetail'
import type { PraxisOut } from '../../../api/praxis'
import type { TaskOut } from '../../../api/tasks'
import type { VoteSummary } from '../../../api/votes'

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

const PRAXIS: PraxisOut = {
  id: 1,
  task_id: 7,
  task_title: 'Mangrove',
  task_point_value: 30,
  task_level_required: 3,
  task_faction_slug: 'wow',
  type: 'solo',
  status: 'submitted',
  title: 'Reforestation',
  body_text: 'Seedlings planted along the estuary.',
  moderation_status: 'visible',
  admin_note: null,
  flagged_at: null,
  submitted_at: '2026-01-02T00:00:00Z',
  submit_proposed_at: null,
  created_by_id: 3,
  created_by_display_name: 'Ada',
  created_by_faction_slug: 'wow',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
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
}

const VOTES: VoteSummary = { praxis_id: 1, total_votes: 4, total_score: 16 }

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
    adminFailNote: '',
    setAdminFailNote: () => {},
    showFailInput: false,
    setShowFailInput: () => {},
    moderating: false,
    moderateError: null,
    showFlagForm: false,
    setShowFlagForm: () => {},
    flagReason: null,
    setFlagReason: () => {},
    flagDetail: '',
    setFlagDetail: () => {},
    flagging: false,
    flagError: null,
    setFlagError: () => {},
    flagSubmitted: false,
    handleModerate: async () => {},
    handleWithdraw: async () => {},
    handleResubmit: async () => {},
    handleFlag: async () => {},
    handleKickMember: async () => {},
    metatasks: [],
    metataskLoading: false,
    metataskError: null,
    applyingMetataskId: null,
    removingMetataskId: null,
    handleApplyMetatask: async () => {},
    handleRemoveMetatask: async () => {},
  }
}

const archetypes = { ...surfaceMap('mobilePraxisDetail'), __default__: DefaultMobilePraxisDetail }

describe('mobile praxis-read content-slot invariant', () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} renders the finding, account body, task link, and author byline`, () => {
      const { html, text } = render(<Archetype state={state()} />)
      expect(text, 'finding/title slot').toContain('Reforestation')
      expect(text, 'account-body slot').toContain('Seedlings')
      expect(html, 're-task-link slot').toContain('href="/tasks/7"')
      expect(html, 'author-byline slot').toContain('href="/characters/3"')
    })
  }
})

describe('mobile praxis-read Task Crown hero', () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} shows the crown hero iff is_top_for_task`, () => {
      const crowned = state()
      crowned.praxis = { ...PRAXIS, is_top_for_task: true }
      expect(render(<Archetype state={crowned} />).text).toContain('TASK CROWN')
      expect(render(<Archetype state={state()} />).text).not.toContain('TASK CROWN')
    })
  }
})

// ─── Single earned-points breakdown (#641) ───────────────────────────────────
// The mobile twin: each mobile detail archetype renders one `{base} + {votes}`
// breakdown above its star caster, and the `× {mult}` form when the fixed-at-
// award multiplier ≠ 1.0.

/** A rare non-1.0 multiplier: base 10 × 1.1 + 14 vote points = 25 merit. */
function multiplierState(): PraxisDetailState {
  const s = state()
  s.praxis = { ...PRAXIS, task_point_value: 10, score: 25, display_multiplier: 1.1, points_from_votes: 14 }
  s.votes = { praxis_id: 1, total_votes: 4, total_score: 14 }
  return s
}

// ─── Metatask seal stack (#932) ──────────────────────────────────────────────
// The mobile twin: each mobile detail archetype renders the read-only
// applied-metatask seal stack in its below-byline / above-media slot when
// `applied_metatasks` is non-empty, and nothing when empty. The seal dispatches
// on the METATASK's issuing faction (here `snide`), not the host archetype's.

const SEAL_METATASK: TaskOut = {
  id: 501,
  title: 'Composting',
  description: null,
  point_value: 60,
  level_required: 0,
  status: 'active',
  task_type: 'metatask',
  created_by: 9,
  primary_faction_slug: null,
  metatask_faction_slug: 'snide',
  is_task_vision_eligible: false,
  created_at: '2026-01-01T00:00:00Z',
  can_submit_praxis: false,
  allowed_modes: [],
  eligible_for_current_user: false,
}

/** Same praxis, now carrying one applied metatask seal. */
function sealedState(): PraxisDetailState {
  const s = state()
  s.praxis = { ...PRAXIS, applied_metatasks: [SEAL_METATASK] }
  return s
}

describe('mobile praxis-read metatask seal stack', () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} renders the applied seal, and nothing when none applied`, () => {
      expect(render(<Archetype state={sealedState()} />).text, 'seal condition line').toContain(
        'Composting',
      )
      expect(render(<Archetype state={state()} />).text, 'no seal when empty').not.toContain(
        'Composting',
      )
    })
  }
})

describe('mobile praxis-read earned-points breakdown', () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} renders the base + vote-points breakdown`, () => {
      const { text } = render(<Archetype state={state()} />)
      expect(text, 'base points').toContain('30')
      expect(text, 'vote points').toContain('16')
    })

    it(`${slug} renders the × multiplier form when the multiplier ≠ 1.0`, () => {
      const { text } = render(<Archetype state={multiplierState()} />)
      expect(text, 'multiplier value').toContain('1.1')
      expect(text, 'multiplier operator').toContain('×')
      expect(text, 'vote points').toContain('14')
    })
  }
})

// ─── Logged-out vote gate voice (#864) ───────────────────────────────────────
// The mobile caster does NOT go through VoteUI, so nothing published the task
// faction to the shared gate chrome and every mobile gate spoke the
// unaffiliated spectrum while desktop spoke its faction's. Each archetype now
// publishes its own slug on VoteFactionContext. `state()` leaves `user` null, so
// MobileStarVote renders the gate rather than the caster.

/**
 * The gate's own style attribute — isolated by the copy that follows the tag, so
 * a faction token used ELSEWHERE in the skin (its accent is all over the page)
 * can't satisfy the assertion. Singularity's caret prefix sits between the two.
 */
function gateStyle(html: string): string {
  const copy = i18n.t('votes:chrome.loginGate')
  const match = html.match(
    new RegExp(`<p[^>]*class="eyebrow"[^>]*style="([^"]*)"[^>]*>[^<]*${copy}`),
  )
  expect(match, 'logged-out gate is rendered').not.toBeNull()
  return match![1]
}

/** A gate wearing the spectrum is the bug this describes — the default voice. */
const SPECTRUM = '--faction-default-rainbow'

describe('mobile praxis-read logged-out vote gate', () => {
  for (const [slug, Archetype] of Object.entries(surfaceMap('mobilePraxisDetail'))) {
    it(`${slug} speaks in its own voice, not the unaffiliated default`, () => {
      const style = gateStyle(render(<Archetype state={state()} />).html)
      expect(style, 'faction accent').toContain(`--faction-${slug}-card-accent`)
      expect(style, 'default spectrum').not.toContain(SPECTRUM)
    })
  }

  it('gives wow the chronicle voice through the default archetype', () => {
    // wow has no mobile archetype of its own, so the default skin has to carry
    // the slug through — a constant would have silently unthemed it.
    const style = gateStyle(render(<DefaultMobilePraxisDetail state={state()} />).html)
    expect(style, 'faction accent').toContain('--faction-wow-card-accent')
    expect(style, 'default spectrum').not.toContain(SPECTRUM)
  })

  for (const slug of ['na', 'albescent']) {
    it(`keeps ${slug} on the unaffiliated spectrum`, () => {
      const unaffiliated = state()
      unaffiliated.praxis = { ...PRAXIS, task_faction_slug: slug }
      const style = gateStyle(render(<DefaultMobilePraxisDetail state={unaffiliated} />).html)
      expect(style, 'default spectrum').toContain(SPECTRUM)
    })
  }
})

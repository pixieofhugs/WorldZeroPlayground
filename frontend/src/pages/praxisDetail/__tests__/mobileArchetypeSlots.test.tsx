/**
 * Mobile praxis-read content-slot invariant — the mobile twin of
 * archetypeSlots.test. Walks MOBILE_ARCHETYPE_BY_SLUG (the WOW pilot) plus the
 * Default mobile skin and asserts each still emits the invariant CONTENT slots:
 * the finding title, the account body, the re-task link, and the author byline.
 * The shared Task Crown banner is checked separately. Rendered to static markup
 * (no DOM); `useAuth` resolves to its anonymous default, so the vote caster
 * shows its login gate rather than throwing.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import { MOBILE_ARCHETYPE_BY_SLUG } from '../../PraxisDetail'
import DefaultMobilePraxisDetail from '../mobileArchetypes/DefaultPraxisDetail'
import type { PraxisDetailState } from '../usePraxisDetail'
import type { PraxisOut } from '../../../api/praxis'
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
  score: 42,
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
    metatasks: [],
    metataskLoading: false,
    metataskError: null,
    applyingMetataskId: null,
    removingMetataskId: null,
    handleApplyMetatask: async () => {},
    handleRemoveMetatask: async () => {},
  }
}

const archetypes = { ...MOBILE_ARCHETYPE_BY_SLUG, __default__: DefaultMobilePraxisDetail }

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

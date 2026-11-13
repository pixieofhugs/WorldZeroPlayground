/**
 * #1557 — the "what do I do now?" half of the desktop FieldDesk, and that the
 * roster half survives beside it (owner ruling 2026-08-02). SSR runs no
 * effects, so the fetch filters are exported constants asserted directly.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { PraxisCardOut } from '../../../api/praxis'
import type { CurrentUser } from '../../../api/auth'

const mocks = vi.hoisted(() => ({
  activePraxes: [] as unknown[],
  canVote: undefined as boolean | undefined,
}))

vi.mock('../../../hooks/useFormFactor', () => ({ useFormFactor: () => 'desktop' }))
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({
    // Roster gate open (#1560); `fieldDeskRosterGate.test.tsx` owns the shut case.
    user: {
      account_id: 1,
      character: { id: 1, faction_slug: 'na' },
      can_create_additional_character: true,
      can_vote: mocks.canVote,
    } as unknown as CurrentUser,
    loading: false,
    refetch: async () => {},
    signOut: async () => {},
  }),
}))
vi.mock('../../../hooks/useSidebarPanels', () => ({
  useSidebarPanels: () => ({
    pending_requests_count: 0,
    global_activity: [],
    active_praxes: mocks.activePraxes,
    loading: false,
    refetch: () => {},
  }),
}))
vi.mock('../../../hooks/useVotesReceived', () => ({
  useVotesReceived: () => ({ votesReceived: 0, loading: false }),
}))
vi.mock('../../../hooks/useGameConfig', () => ({ useGameConfig: () => null }))
vi.mock('../../../api/me', () => ({
  getMyCharacters: async () => [],
  setActiveCharacter: async () => {},
}))
vi.mock('../../../api/tasks', () => ({ listTasks: async () => [] }))
vi.mock('../../../api/praxis', () => ({
  listPraxes: async () => [],
  createPraxis: async () => ({ id: 1 }),
}))

// Imported after the mocks are registered.
import FieldDesk, { BROWSE_TASK_FILTERS, BROWSE_PRAXIS_FILTERS } from '../../FieldDesk'

function praxis(overrides: Partial<PraxisCardOut>): PraxisCardOut {
  return {
    id: 1,
    task_id: 3,
    task_title: 'Plant a verge',
    task_point_value: 30,
    task_level_required: 0,
    task_faction_slug: null,
    type: 'solo',
    status: 'in_progress',
    title: null,
    moderation_status: 'visible',
    created_by_id: 7,
    created_by_display_name: 'Isolde',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    submitted_at: null,
    member_count: 1,
    score: 30,
    voter_count: 0,
    metatask_points: 0,
    display_multiplier: 1,
    points_from_votes: 0,
    is_top_for_task: false,
    ...overrides,
  } as PraxisCardOut
}

function render(): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <FieldDesk />
    </MemoryRouter>,
  )
}

function text(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

describe('the desktop FieldDesk keeps the roster and gains the new sections (#1557)', () => {
  it('still asks whose shoes today, above the new sections', () => {
    mocks.activePraxes = [praxis({})]
    const body = text(render())
    expect(body).toContain('Whose shoes today?')
    expect(body.indexOf('Whose shoes today?')).toBeLessThan(body.indexOf('Continue where you left off'))
  })

  it('shows the continue card when something is in flight', () => {
    mocks.activePraxes = [praxis({})]
    expect(text(render())).toContain('Continue where you left off')
  })

  it('hides the continue card when nothing is in flight', () => {
    mocks.activePraxes = []
    expect(text(render())).not.toContain('Continue where you left off')
  })

  it('reads a draft row as a draft and a filed one as submitted', () => {
    mocks.activePraxes = [
      praxis({ id: 1, status: 'in_progress', score: 30 }),
      praxis({ id: 2, status: 'submitted', score: 42, voter_count: 8, task_title: 'Repaint a bench' }),
    ]
    const html = text(render())
    expect(html).toContain('Draft · +30 pts')
    expect(html).toContain('Submitted · 42 pts · 8 votes')
  })

  it('links a draft to its composer and a filed praxis to its page', () => {
    mocks.activePraxes = [
      praxis({ id: 1, status: 'in_progress' }),
      praxis({ id: 2, status: 'submitted' }),
    ]
    const html = render()
    expect(html).toContain('href="/praxis/1/edit"')
    expect(html).toContain('href="/praxis/2"')
  })

  it('lands on the Tasks tab, with both pills and the tab-specific see-more', () => {
    mocks.activePraxes = []
    const html = render()
    const body = text(html)
    expect(body).toContain('Tasks you can sign up for')
    expect(body).not.toContain('Praxis that needs your vote')
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('aria-pressed="false"')
    expect(html).toContain('href="/tasks"')
  })
})

describe('the vote-only tab follows the server\'s can_vote (#3169)', () => {
  const VOTE_TAB = 'aria-pressed'
  it('is absent, with no tab switch, for a character who cannot vote', () => {
    mocks.activePraxes = []
    mocks.canVote = false
    const html = render()
    expect(html).not.toContain(VOTE_TAB)
    expect(text(html)).toContain('Tasks you can sign up for')
  })

  it('appears once the same character becomes eligible', () => {
    mocks.activePraxes = []
    mocks.canVote = false
    expect(render()).not.toContain(VOTE_TAB)
    mocks.canVote = true
    expect(render()).toContain(VOTE_TAB)
  })

  it('is kept when the payload carries no can_vote at all', () => {
    mocks.activePraxes = []
    mocks.canVote = undefined
    expect(render()).toContain(VOTE_TAB)
  })
})

describe('both browse tabs ask for already-narrowed data', () => {
  it('asks for tasks the viewer can sign up for, with no status of its own', () => {
    expect(BROWSE_TASK_FILTERS.can_sign_up).toBe(true)
    expect(BROWSE_TASK_FILTERS).not.toHaveProperty('status')
  })

  it('asks for praxes that need the viewer’s vote', () => {
    expect(BROWSE_PRAXIS_FILTERS.voted).toBe('no')
  })
})

describe('the page ground is bare (#2551)', () => {
  it('paints no dot field behind the desktop FieldDesk', () => {
    mocks.activePraxes = []
    const root = render().match(/^<div class="page"[^>]*>/)
    expect(root).not.toBeNull()
    expect(root![0]).not.toContain('background')
  })
})

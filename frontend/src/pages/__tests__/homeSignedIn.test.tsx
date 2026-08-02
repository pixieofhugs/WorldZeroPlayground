/**
 * #1557 — the desktop signed-in home.
 *
 * SSR (`renderToStaticMarkup`) never runs effects, so these pin the STATIC
 * shape: which of `/`'s two screens rendered, the continue rows and their two
 * meta states, the tab switch, and the browse section's landing tab. The two
 * fetches cannot be observed this way at all, which is why the filters they use
 * are exported constants and asserted directly — an unfiltered list under
 * "Tasks you can sign up for" renders perfectly and is still a bug.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../i18n'
import type { PraxisCardOut } from '../../api/praxis'

const mocks = vi.hoisted(() => ({
  user: null as unknown,
  activePraxes: [] as unknown[],
}))

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user, loading: false, refetch: async () => {}, signOut: () => {} }),
}))
vi.mock('../../hooks/useSidebarPanels', () => ({
  useSidebarPanels: () => ({
    pending_requests_count: 0,
    global_activity: [],
    active_praxes: mocks.activePraxes,
    loading: false,
    refetch: () => {},
  }),
}))
vi.mock('../../hooks/useGameConfig', () => ({ useGameConfig: () => null }))
vi.mock('../../api/tasks', () => ({ listTasks: async () => [] }))
vi.mock('../../api/praxis', () => ({
  listPraxes: async () => [],
  createPraxis: async () => ({ id: 1 }),
}))

// Imported after the mocks are registered.
import Home, { BROWSE_TASK_FILTERS, BROWSE_PRAXIS_FILTERS } from '../Home'

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
      <Home />
    </MemoryRouter>,
  )
}

function text(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

describe('the signed-in desktop home (#1557)', () => {
  it('shows the marketing landing to a guest, not the signed-in home', () => {
    mocks.user = null
    mocks.activePraxes = []
    const html = text(render())
    expect(html).toContain('a collaborative production game played in the real world')
    expect(html).not.toContain('Continue where you left off')
  })

  it('shows the signed-in home to a signed-in viewer, not the hero', () => {
    mocks.user = { character: { id: 1, faction_slug: 'na' } }
    mocks.activePraxes = [praxis({})]
    const html = text(render())
    expect(html).not.toContain('a collaborative production game played in the real world')
    expect(html).toContain('Continue where you left off')
  })

  it('hides the continue card when nothing is in flight', () => {
    mocks.user = { character: { id: 1, faction_slug: 'na' } }
    mocks.activePraxes = []
    expect(text(render())).not.toContain('Continue where you left off')
  })

  it('reads a draft row as a draft and a filed one as submitted', () => {
    mocks.user = { character: { id: 1, faction_slug: 'na' } }
    mocks.activePraxes = [
      praxis({ id: 1, status: 'in_progress', score: 30 }),
      praxis({ id: 2, status: 'submitted', score: 42, voter_count: 8, task_title: 'Repaint a bench' }),
    ]
    const html = text(render())
    expect(html).toContain('Draft · +30 pts')
    expect(html).toContain('Submitted · 42 pts · 8 votes')
  })

  it('links a draft to its composer and a filed praxis to its page', () => {
    mocks.user = { character: { id: 1, faction_slug: 'na' } }
    mocks.activePraxes = [
      praxis({ id: 1, status: 'in_progress' }),
      praxis({ id: 2, status: 'submitted' }),
    ]
    const html = render()
    expect(html).toContain('href="/praxis/1/edit"')
    expect(html).toContain('href="/praxis/2"')
  })

  it('lands on the Tasks tab, with both pills and the tab-specific see-more', () => {
    mocks.user = { character: { id: 1, faction_slug: 'na' } }
    mocks.activePraxes = []
    const html = render()
    const body = text(html)
    expect(body).toContain('Tasks you can sign up for')
    expect(body).not.toContain('Praxes that need your vote')
    // Both pills are present; the inactive one is a control the viewer can use.
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('aria-pressed="false"')
    expect(html).toContain('href="/tasks"')
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

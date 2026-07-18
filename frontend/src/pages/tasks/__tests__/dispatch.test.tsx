/**
 * Tasks form-factor dispatch — useFormFactor mocked 'mobile' selects the Default
 * mobile browse skin; 'desktop' keeps the existing flex-wrap list. Mirrors the
 * TaskDetail dispatch seam (#494/#496). useTasks is mocked to a canned state so
 * the branch under test renders without hitting the network / auth context.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { TasksState } from '../useTasks'

// Mutable form factor the mocked hook reports; each test sets it before render.
const dispatch: { formFactor: 'mobile' | 'desktop' } = { formFactor: 'desktop' }

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => dispatch.formFactor,
}))

// Canned, empty task set: exercises the dispatch branch without rendering
// TaskCard (which needs auth/admin contexts) — an empty list hits each branch's
// own empty state instead.
const CANNED: TasksState = {
  user: null,
  tasks: [],
  loading: false,
  error: null,
  factions: [{ slug: 'everymen' }],
  factionConfigs: [],
  levelFilters: [0, 1, 2, 3, 4, 5],
  statusFilters: ['All', 'active'],
  status: 'All',
  setStatus: () => {},
  faction: '',
  setFaction: () => {},
  level: '',
  setLevel: () => {},
  query: '',
  setQuery: () => {},
  hasMore: false,
  loadMore: () => {},
  signupMsg: null,
  handleSignup: async () => {},
  displayPointsFor: () => 0,
}

vi.mock('../useTasks', () => ({
  useTasks: () => CANNED,
  LEVEL_FILTERS: [0, 1, 2, 3, 4, 5],
}))

import Tasks from '../../Tasks'

function html(): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <Tasks />
    </MemoryRouter>,
  )
}

describe('Tasks form-factor dispatch', () => {
  it('renders the Default mobile browse skin on mobile', () => {
    dispatch.formFactor = 'mobile'
    expect(html()).toContain('mobile-tasks-browse')
  })

  it('renders the existing desktop list on desktop', () => {
    dispatch.formFactor = 'desktop'
    const out = html()
    expect(out, 'no mobile skin').not.toContain('mobile-tasks-browse')
    // The desktop rubber-stamp status filter (FilterStamps) is desktop-only chrome.
    expect(out.toLowerCase(), 'desktop status filter').toContain('status:')
  })
})

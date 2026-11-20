// @vitest-environment jsdom
/** Seam: `App` at `/admin/*` — own layout, real routes, rail counts and current page. */
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from '../../../App'

const api = vi.hoisted(() => ({
  getFlaggedPraxes: vi.fn(async () => [{}, {}]),
  getFlaggedComments: vi.fn(async () => [{}]),
  getMessages: vi.fn(async () => [{}]),
  getPendingTasks: vi.fn(async () => []),
  getOverview: vi.fn(async () => ({ praxis: 38, active_tasks: 10, accounts: 21 })),
}))
vi.mock('../../../api/admin', () => api)
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { is_admin: true }, loading: false }),
  hadSessionLastVisit: () => true,
}))
vi.mock('../../../auth/AdminModeContext', () => ({ useAdminMode: () => ({ adminMode: false }) }))
vi.mock('../../../components/Layout', () => ({ default: () => 'PLAYER LAYOUT' }))
vi.mock('../consolePages', () => ({
  ReportsPage: () => 'ReportsPage',
  MessagesPage: () => 'MessagesPage',
  TasksPage: () => 'TasksPage',
  PraxisPage: () => 'PraxisPage',
  PeoplePage: () => 'PeoplePage',
  EraPage: () => 'EraPage',
  CopySheetIndexPage: () => 'CopySheetIndexPage',
}))
vi.mock('../FactionCopySheet', () => ({ default: () => 'FactionCopySheet' }))
vi.mock('../LevelUpCopySheet', () => ({ default: () => 'LevelUpCopySheet' }))

afterEach(cleanup)

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

describe('admin console shell', () => {
  it('redirects /admin to reports, outside the player layout', async () => {
    at('/admin')
    expect(await screen.findByText('ReportsPage')).toBeTruthy()
    expect(screen.queryByText('PLAYER LAYOUT')).toBeNull()
  })

  it.each([
    ['/admin/messages', 'MessagesPage'],
    ['/admin/proposals', 'TasksPage'],
    ['/admin/tasks', 'TasksPage'],
    ['/admin/praxis', 'PraxisPage'],
    ['/admin/people', 'PeoplePage'],
    ['/admin/era', 'EraPage'],
    ['/admin/copy', 'CopySheetIndexPage'],
    ['/admin/copy/ua', 'FactionCopySheet'],
    ['/admin/level-ups', 'LevelUpCopySheet'],
  ])('%s renders %s inside the rail', async (path, page) => {
    at(path)
    expect(await screen.findByText(page)).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Admin' })).toBeTruthy()
  })

  it('rail shows groups, counts and tallies, and marks only the current page', async () => {
    at('/admin/tasks')
    const rail = await screen.findByRole('navigation', { name: 'Admin' })
    for (const group of ['Needs you', 'Run the game', 'Words', 'Danger']) {
      expect(within(rail).getByText(group)).toBeTruthy()
    }
    expect(await within(rail).findByLabelText('3 waiting')).toBeTruthy()
    expect(within(rail).getByLabelText('1 waiting')).toBeTruthy()
    expect(await within(rail).findByText('38')).toBeTruthy()
    const current = within(rail).getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page')
    expect(current.map((a) => a.textContent)).toEqual(['Tasks10'])
    expect(within(rail).getByRole('link', { name: '← Back to World Zero' }).getAttribute('href')).toBe('/')
  })

  it('phone top bar titles the current page with its count, no second brand', async () => {
    at('/admin/reports')
    const bar = (await screen.findByRole('banner')) as HTMLElement
    expect(await within(bar).findByLabelText('3 waiting')).toBeTruthy()
    expect(within(bar).getByText('Reports')).toBeTruthy()
    expect(within(bar).queryByText('World Zero')).toBeNull()
    expect(within(bar).getByRole('link', { name: '← World Zero' })).toBeTruthy()
  })
})

// @vitest-environment jsdom
/** Seam: the real Admin layout over the real console pages — jump to People, phone Menu, rail badge reload. */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../../../i18n'

const api = vi.hoisted(() => ({
  getFlaggedPraxes: vi.fn(),
  getFlaggedComments: vi.fn(async () => []),
  getMessages: vi.fn(async () => []),
  getPendingTasks: vi.fn(async () => []),
  getOverview: vi.fn(async () => ({ praxis: 1, active_tasks: 1, accounts: 1 })),
  getModLog: vi.fn(async () => ({ items: [], total: 0, limit: 20, offset: 0 })),
  listAdminPraxes: vi.fn(async () => []),
  getAdminCharacters: vi.fn(async () => []),
  getAdmins: vi.fn(async () => []),
  getVoteRing: vi.fn(),
  moderatePraxis: vi.fn(async () => ({})),
  banCharacter: vi.fn(),
  suspendAccount: vi.fn(),
  removeFlaggedPraxes: vi.fn(),
}))
vi.mock('../../../api/admin', () => api)
vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => ({ user: { is_owner: false } }) }))
vi.mock('../AdminRosterSection', () => ({ default: () => 'ROSTER' }))

import Admin from '../../Admin'
import { PeoplePage, ReportsPage } from '../consolePages'

const now = new Date().toISOString()
const flagged = {
  id: 7, title: 'Walked a new street', task_title: 'Walk', created_by_id: 3, created_by_display_name: 'Moss Tern',
  author_username: 'moss', author_account_id: 9, author_status: 'active', author_account_status: 'active',
  author_flagged_count: 1, created_at: now, flagged_at: now, media_items: [],
  flags: [{ reason: 'slop', reason_detail: 'x', flagged_by_id: 5, flagged_by_name: 'Ada', created_at: now }],
}

const mount = () => {
  window.scrollTo = vi.fn() as typeof window.scrollTo
  render(
    <MemoryRouter initialEntries={['/admin/reports']}>
      <Routes>
        <Route path="/admin" element={<Admin />}>
          <Route path="reports" element={<ReportsPage />} />
          <Route path="people" element={<PeoplePage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  api.getFlaggedPraxes.mockResolvedValue([flagged])
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('console follow-ups', () => {
  it('Reports "open people" lands on People searching the author', async () => {
    mount()
    fireEvent.click(await screen.findByRole('button', { name: /People/ }))
    await waitFor(() => expect(api.getAdminCharacters).toHaveBeenCalledWith('moss'))
    expect(document.title).toContain('People')
  })

  it('phone Menu toggles aria-expanded and closes on navigate', async () => {
    mount()
    const menu = await screen.findByRole('button', { name: 'Menu' })
    expect(menu.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(menu)
    expect(menu.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Admin' })).getByRole('link', { name: /People/ }))
    await waitFor(() => expect(menu.getAttribute('aria-expanded')).toBe('false'))
  })

  it('a decision refreshes the rail badge', async () => {
    mount()
    const rail = screen.getByRole('navigation', { name: 'Admin' })
    expect(await within(rail).findByLabelText('1 waiting')).toBeTruthy()
    api.getFlaggedPraxes.mockResolvedValue([])
    fireEvent.click(await screen.findByRole('button', { name: 'Keep it' }))
    await waitFor(() => expect(within(rail).queryByLabelText('1 waiting')).toBeNull())
  })
})

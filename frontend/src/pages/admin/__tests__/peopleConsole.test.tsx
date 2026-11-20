// @vitest-environment jsdom
/** Seam: PeopleTab with the admin API mocked — segments, search, the panel, ban behind a confirm. */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../../../i18n'

const api = vi.hoisted(() => ({
  getAdminCharacters: vi.fn(),
  getAdmins: vi.fn(async () => [{}, {}]),
  getVoteRing: vi.fn(),
  banCharacter: vi.fn(async () => undefined),
  suspendAccount: vi.fn(async () => undefined),
}))
vi.mock('../../../api/admin', () => api)
vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => ({ user: { is_owner: true } }) }))
vi.mock('../AdminRosterSection', () => ({ default: () => 'ROSTER' }))

import PeopleTab from '../PeopleTab'

const person = (id: number, name: string, over = {}) => ({
  id, account_id: id + 10, username: name.toLowerCase(), display_name: name, faction_slug: 'na', status: 'active',
  account_status: 'active', level: 3, score: 0, votes_available: 0, created_at: '2026-01-01T00:00:00Z', votes_cast: 31, ...over,
})
const moss = person(1, 'Moss')
const pell = person(2, 'Pell', { status: 'banned' })
const wren = person(3, 'Wren', { account_status: 'suspended' })

const at = (path = '/admin/people') =>
  render(<MemoryRouter initialEntries={[path]}><PeopleTab /></MemoryRouter>)

beforeEach(() => {
  api.getAdminCharacters.mockResolvedValue([moss, pell, wren])
  api.getVoteRing.mockResolvedValue({
    total_votes: 10, eligible: 19,
    recipients: [{ account_id: 5, display_name: 'Ada', votes: 5, average_stars: 5, share: 0.5, votes_back: 9, votes_back_of: 12 }],
  })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('People list', () => {
  it('segments carry counts and filter', async () => {
    at()
    expect(await screen.findByRole('tab', { name: 'All 3' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Suspended 1' })).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Banned 1' }))
    expect(screen.queryByText('Moss')).toBeNull()
    expect(screen.getByText('Pell')).toBeTruthy()
  })

  it('search goes to the API, seeded from ?search=', async () => {
    at('/admin/people?search=moss')
    await waitFor(() => expect(api.getAdminCharacters).toHaveBeenCalledWith('moss'))
  })

  it('shows the Admins count for the owner', async () => {
    at()
    expect(await screen.findByRole('button', { name: 'Admins (2)…' })).toBeTruthy()
  })
})

describe('the person panel', () => {
  it('shows the ring against the baseline and the vote-back note', async () => {
    at()
    fireEvent.click(await screen.findByRole('button', { name: /Moss/ }))
    expect(await screen.findByText('10 votes went to 1 of the 19 people they could vote for.')).toBeTruthy()
    expect(screen.getByText(/about 5%/)).toBeTruthy()
    expect(screen.getByText(/Ada votes back: 9 of their 12 votes went to Moss\./)).toBeTruthy()
  })

  it('bans only after the confirm', async () => {
    at()
    fireEvent.click(await screen.findByRole('button', { name: /Moss/ }))
    const panel = await screen.findByRole('complementary', { name: 'Moss' })
    fireEvent.click(within(panel).getByRole('button', { name: 'Ban character…' }))
    expect(api.banCharacter).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /confirm — ban character/ }))
    await waitFor(() => expect(api.banCharacter).toHaveBeenCalledWith(1, true))
  })

  it('suspend asks first too', async () => {
    at()
    fireEvent.click(await screen.findByRole('button', { name: /Moss/ }))
    const panel = await screen.findByRole('complementary', { name: 'Moss' })
    fireEvent.click(within(panel).getByRole('button', { name: 'Suspend account…' }))
    expect(api.suspendAccount).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /confirm — suspend account/ }))
    await waitFor(() => expect(api.suspendAccount).toHaveBeenCalledWith(11, true))
  })
})

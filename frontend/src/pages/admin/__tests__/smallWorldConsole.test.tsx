// @vitest-environment jsdom
/** Seam: SmallWorldTab with the admin API mocked — rows rendered from the API, the switch PUT, Set all, the rail item. */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../../../i18n'

const api = vi.hoisted(() => ({ getSmallWorld: vi.fn(), setSmallWorld: vi.fn() }))
vi.mock('../../../api/admin', () => api)

import AdminRail from '../../../components/admin/AdminRail'
import SmallWorldTab from '../SmallWorldTab'

const dial = (dial_key: string, side: 'small' | 'full', small: object, full: object, over = {}) => ({
  dial_key, side, small, full, is_default: true, updated_by: null, updated_at: null, ...over,
})
const dials = (cooldownSide: 'small' | 'full' = 'small') => [
  dial('praxis_post_cooldown', cooldownSide, { praxis_post_cooldown_hours: 0 }, { praxis_post_cooldown_hours: 31 },
    { updated_by: 'Rook', updated_at: '2026-11-19T10:00:00Z' }),
  dial('vote_requires_received_vote', 'small', { vote_requires_received_vote: false }, { vote_requires_received_vote: true }),
  dial('invitation', 'full', { invitation_task_threshold: 1, invitation_point_threshold: 10 }, { invitation_task_threshold: 2, invitation_point_threshold: 50 }),
]
const renderTab = () => render(<MemoryRouter><SmallWorldTab /></MemoryRouter>)

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Small world', () => {
  it('renders both values from the API, who changed it, and the current side', async () => {
    api.getSmallWorld.mockResolvedValue(dials())
    renderTab()
    expect(await screen.findByText('31 h')).toBeTruthy()
    expect(screen.getByText('1 tasks · 10 pts')).toBeTruthy()
    expect(screen.getByText('2 tasks · 50 pts')).toBeTruthy()
    expect(screen.getByText(/Rook/)).toBeTruthy()
    const group = screen.getByRole('radiogroup', { name: 'Post cooldown' })
    expect(group.querySelector('[aria-checked="true"]')?.textContent).toBe('Small world')
  })

  it('a switch PUTs just that dial and shows the result with a Mod log link', async () => {
    api.getSmallWorld.mockResolvedValue(dials())
    api.setSmallWorld.mockResolvedValue(dials('full'))
    renderTab()
    const group = await screen.findByRole('radiogroup', { name: 'Post cooldown' })
    fireEvent.click(group.querySelectorAll('button')[1])
    await waitFor(() => expect(api.setSmallWorld).toHaveBeenCalledWith({ praxis_post_cooldown: 'full' }))
    expect((await screen.findByRole('status')).textContent).toContain('Post cooldown is now on Full game')
    expect(screen.getByRole('link', { name: 'Mod log' }).getAttribute('href')).toBe('/admin/mod-log')
  })

  it('Set all sends every dial as small in one PUT', async () => {
    api.getSmallWorld.mockResolvedValue(dials())
    api.setSmallWorld.mockResolvedValue(dials().map((d) => ({ ...d, side: 'small' })))
    renderTab()
    fireEvent.click(await screen.findByRole('button', { name: 'Set all to small world' }))
    await waitFor(() =>
      expect(api.setSmallWorld).toHaveBeenCalledWith({
        praxis_post_cooldown: 'small', vote_requires_received_vote: 'small', invitation: 'small',
      }),
    )
  })
})

describe('Rail', () => {
  it('lists Small world before Mod log', () => {
    const none = { reports: null, messages: null, proposals: null, praxis: null, tasks: null, people: null }
    render(<MemoryRouter><AdminRail open onNavigate={() => {}} counts={none} /></MemoryRouter>)
    const names = screen.getAllByRole('link').map((l) => l.textContent)
    expect(names.indexOf('Small world')).toBeGreaterThan(-1)
    expect(names.indexOf('Small world')).toBeLessThan(names.indexOf('Mod log'))
  })
})

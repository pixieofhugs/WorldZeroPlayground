// @vitest-environment jsdom
/** #3770 — the Blocked section: rail order, list, remove, empty, failure. Seam: the section + its api calls. */
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const h = vi.hoisted(() => ({
  user: { character: { id: 3 } } as { character: { id: number } | null },
  listBlocks: vi.fn(),
  unblockCharacter: vi.fn(),
}))

vi.mock('../../../auth/AuthContext', async (orig) => ({
  ...(await orig<typeof import('../../../auth/AuthContext')>()),
  useAuth: () => ({ user: h.user }),
}))
vi.mock('../../../api/relationships', () => ({
  listBlocks: h.listBlocks,
  unblockCharacter: h.unblockCharacter,
}))

import '../../../i18n'
import { SETTINGS_SECTIONS } from '../../Settings'
import BlockedSection from '../sections/BlockedSection'
import common from '../../../locales/en/common.json'

const ROW = (id: number, name: string) => ({
  character_id: id,
  display_name: name,
  avatar_url: '',
  faction_slug: 'ua',
  created_at: '2026-11-01T12:00:00Z',
})

const mount = () =>
  render(
    <MemoryRouter>
      <BlockedSection sectionId="sec-blocked" />
    </MemoryRouter>,
  )

afterEach(cleanup)

beforeEach(() => {
  vi.clearAllMocks()
  h.user = { character: { id: 3 } }
})

describe('BlockedSection', () => {
  it('sits between data and account in the rail', () => {
    const keys = SETTINGS_SECTIONS.map((s) => s.key)
    expect(keys.indexOf('blocked')).toBe(keys.indexOf('data') + 1)
    expect(keys.indexOf('blocked')).toBe(keys.indexOf('account') - 1)
  })

  it('lists each block with a profile link, and drops the row on Unblock', async () => {
    h.listBlocks.mockResolvedValue([ROW(7, 'Reza'), ROW(8, 'Ana')])
    h.unblockCharacter.mockResolvedValue(undefined)
    mount()
    const link = await screen.findByRole('link', { name: 'Reza' })
    expect(link.getAttribute('href')).toBe('/characters/7')
    fireEvent.click(screen.getAllByRole('button', { name: common.settings.blocked.unblock })[0])
    await waitFor(() => expect(screen.queryByText('Reza')).toBeNull())
    expect(h.unblockCharacter).toHaveBeenCalledWith(7)
    expect(screen.getByText('Ana')).toBeTruthy()
  })

  it('shows the empty state for an empty list', async () => {
    h.listBlocks.mockResolvedValue([])
    mount()
    expect(await screen.findByText(common.settings.blocked.empty)).toBeTruthy()
  })

  it('shows the empty state, and asks nothing, for a viewer with no character', () => {
    h.user = { character: null }
    mount()
    expect(screen.getByText(common.settings.blocked.empty)).toBeTruthy()
    expect(h.listBlocks).not.toHaveBeenCalled()
  })

  it('keeps the row and says so when Unblock fails', async () => {
    h.listBlocks.mockResolvedValue([ROW(7, 'Reza')])
    h.unblockCharacter.mockRejectedValue(new Error('boom'))
    mount()
    fireEvent.click(await screen.findByRole('button', { name: common.settings.blocked.unblock }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByText('Reza')).toBeTruthy()
  })

  it('keeps the lead to ADR-0077 reach: silent, like the block confirm', () => {
    expect(common.settings.blocked.lead.toLowerCase()).toContain("aren't told")
    expect(common.relationships.blockConfirm.body.toLowerCase()).toContain('not told')
  })
})

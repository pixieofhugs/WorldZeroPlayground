// @vitest-environment jsdom
/** Seam: ModLogTab with the admin API mocked — rows as sentences, the kind and mod filters, search, paging. */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../../../i18n'

const api = vi.hoisted(() => ({ getModLog: vi.fn() }))
vi.mock('../../../api/admin', () => api)

import ModLogTab from '../ModLogTab'

const row = (id: number, over: Record<string, unknown>) => ({
  id,
  actor_account_id: 7,
  actor_name: 'Rook',
  action: 'ban',
  target_type: 'character',
  target_id: 1,
  detail: null,
  created_at: '2026-11-14T10:00:00Z',
  target_name: 'Spamlord',
  target_author: null,
  ...over,
})
const page = (items: unknown[], total = items.length) => ({
  items,
  total,
  limit: 20,
  offset: 0,
  counts: { reports: 1, tasks: 0, people: 1, rules: 2 },
  mods: [{ account_id: 7, name: 'Rook' }],
})
const items = [
  row(1, { action: 'praxis_failed', target_type: 'praxis', target_name: 'Refilled my water bottle', target_author: 'Moss Tern', detail: 'A water bottle is meant to run out.' }),
  row(2, {}),
]

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Mod log', () => {
  it('reads each row as a sentence with names, and the reason the author saw', async () => {
    api.getModLog.mockResolvedValue(page(items))
    render(<ModLogTab />)
    expect(await screen.findByText('“Refilled my water bottle” by Moss Tern')).toBeTruthy()
    expect(screen.getByText('A water bottle is meant to run out.')).toBeTruthy()
    expect(screen.getByText('character Spamlord')).toBeTruthy()
    expect(screen.getByText('banned')).toBeTruthy()
  })

  it('segments carry server counts; All is their sum, and a segment asks the server', async () => {
    api.getModLog.mockResolvedValue(page(items))
    render(<ModLogTab />)
    expect(await screen.findByRole('tab', { name: 'All 4' })).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Rules 2' }))
    await waitFor(() => expect(api.getModLog).toHaveBeenLastCalledWith(0, { kind: 'rules' }))
  })

  it('the mod chip and search narrow server-side', async () => {
    api.getModLog.mockResolvedValue(page(items))
    render(<ModLogTab />)
    await screen.findByText('banned')
    fireEvent.change(screen.getByRole('combobox', { name: 'Mod: anyone' }), { target: { value: '7' } })
    await waitFor(() => expect(api.getModLog).toHaveBeenLastCalledWith(0, { actor: 7 }))
    fireEvent.change(screen.getByPlaceholderText(/Search a player/), { target: { value: 'bottle' } })
    await waitFor(() => expect(api.getModLog).toHaveBeenLastCalledWith(0, { actor: 7, q: 'bottle' }))
  })

  it('pages with Load more from the rows already shown', async () => {
    api.getModLog.mockResolvedValueOnce(page(items, 3)).mockResolvedValueOnce(page([row(3, {})], 3))
    render(<ModLogTab />)
    fireEvent.click(await screen.findByRole('button', { name: /Load more/ }))
    await waitFor(() => expect(api.getModLog).toHaveBeenLastCalledWith(2, {}))
    await waitFor(() => expect(screen.queryByRole('button', { name: /Load more/ })).toBeNull())
  })

  it('a row opens its entry in the side panel', async () => {
    api.getModLog.mockResolvedValue(page(items))
    render(<ModLogTab />)
    fireEvent.click((await screen.findAllByRole('button', { name: /Nov 14/ }))[0])
    expect(screen.getByRole('complementary', { name: 'Log entry' })).toBeTruthy()
  })
})

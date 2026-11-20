// @vitest-environment jsdom
/** Seam: the Reports page over a mocked admin API: empty state, decision + reason flow, recent decisions. */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../../../i18n'
import ReportsTab from '../ReportsTab'

const api = vi.hoisted(() => ({
  getFlaggedPraxes: vi.fn(),
  getFlaggedComments: vi.fn(),
  getModLog: vi.fn(),
  listAdminPraxes: vi.fn(),
  moderatePraxis: vi.fn(),
  moderateComment: vi.fn(),
  banCharacter: vi.fn(),
  suspendAccount: vi.fn(),
  removeFlaggedPraxes: vi.fn(),
}))
vi.mock('../../../api/admin', () => api)

const now = new Date().toISOString()
const entry = (id: number, action: string) => ({
  id, actor_account_id: 1, actor_name: 'Rook', action, target_type: 'praxis', target_id: id, detail: null, created_at: now,
})
const flagged = {
  id: 7, title: 'Walked a new street', task_title: 'Walk a New Street', created_by_id: 3,
  created_by_display_name: 'Moss Tern', author_username: 'moss', author_account_id: 9,
  author_status: 'active', author_account_status: 'active', author_flagged_count: 2,
  created_at: now, flagged_at: now, media_items: [],
  flags: [{ reason: 'slop', reason_detail: 'Stock photo.', flagged_by_id: 5, flagged_by_name: 'Ada Quill', created_at: now }],
}

const mount = (praxes: unknown[], log = [entry(1, 'praxis_visible'), entry(2, 'ban'), entry(3, 'unban'), entry(4, 'suspend')]) => {
  api.getFlaggedPraxes.mockResolvedValue(praxes)
  api.getFlaggedComments.mockResolvedValue([])
  api.getModLog.mockResolvedValue({ items: log, total: log.length, limit: 20, offset: 0 })
  api.listAdminPraxes.mockResolvedValue([{ id: 42 }])
  api.moderatePraxis.mockResolvedValue({})
  render(<MemoryRouter><ReportsTab onViewAccount={vi.fn()} /></MemoryRouter>)
}

beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

describe('Reports', () => {
  it('empty: says nothing needs you, names the last decision and links the newest praxis', async () => {
    mount([])
    expect(await screen.findByText('Nothing needs you.')).toBeTruthy()
    expect(screen.getByText(/The last decision: Rook: kept \(praxis #1\)/)).toBeTruthy()
    await waitFor(() => expect(screen.getByRole('link', { name: 'Newest praxis' }).getAttribute('href')).toBe('/praxis/42'))
  })

  it('recent decisions: the last three mod-log entries only', async () => {
    mount([])
    const panel = await screen.findByRole('complementary', { name: 'Recent decisions' })
    expect(within(panel).getAllByText(/Rook:/)).toHaveLength(3)
  })

  it('Remove asks for a reason and sends it; Keep sends none', async () => {
    mount([flagged])
    const card = await screen.findByRole('region', { name: 'Walked a new street' })
    expect(within(card).getByText('Stock photo.', { exact: false })).toBeTruthy()
    expect(within(card).getByLabelText('Reason the author sees')).toBeTruthy() // present before any tap (phone shows it)
    fireEvent.click(within(card).getByRole('button', { name: 'Remove' }))
    const submit = screen.getByRole('button', { name: 'Remove with this reason' }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Reason the author sees'), { target: { value: ' Not your photo. ' } })
    fireEvent.click(submit)
    await waitFor(() => expect(api.moderatePraxis).toHaveBeenCalledWith(7, 'hidden', 'Not your photo.'))

    fireEvent.click(within(card).getByRole('button', { name: 'Keep it' }))
    await waitFor(() => expect(api.moderatePraxis).toHaveBeenCalledWith(7, 'visible', undefined))
  })

  it("Doesn't meet the task is the failed status", async () => {
    mount([flagged])
    fireEvent.click(await screen.findByRole('button', { name: "Doesn't meet the task" }))
    fireEvent.change(screen.getByLabelText('Reason the author sees'), { target: { value: 'No proof.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Mark not met with this reason' }))
    await waitFor(() => expect(api.moderatePraxis).toHaveBeenCalledWith(7, 'failed', 'No proof.'))
  })

  it('Remove moves focus to the reason field', async () => {
    mount([flagged])
    const card = await screen.findByRole('region', { name: 'Walked a new street' })
    fireEvent.click(within(card).getByRole('button', { name: 'Remove' }))
    expect(document.activeElement).toBe(within(card).getByLabelText('Reason the author sees'))
  })

  it('a mod-log failure does not hide the queue, and the log asks for reports only', async () => {
    mount([flagged])
    api.getModLog.mockRejectedValue(new Error('boom'))
    cleanup()
    render(<MemoryRouter><ReportsTab onViewAccount={vi.fn()} /></MemoryRouter>)
    expect(await screen.findByRole('region', { name: 'Walked a new street' })).toBeTruthy()
    expect(api.getModLog).toHaveBeenCalledWith(0, { kind: 'reports' })
  })

  it('?character= shows only that character\'s reports', async () => {
    api.getFlaggedPraxes.mockResolvedValue([flagged, { ...flagged, id: 8, title: 'Other post', created_by_id: 4 }])
    api.getFlaggedComments.mockResolvedValue([])
    api.getModLog.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 })
    render(<MemoryRouter initialEntries={['/admin/reports?character=3']}><ReportsTab onViewAccount={vi.fn()} /></MemoryRouter>)
    expect(await screen.findByRole('region', { name: 'Walked a new street' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Other post' })).toBeNull()
  })

  it('?character= counts the tabs from the filtered list and says when nothing is left', async () => {
    const comment = { id: 5, body_text: 'rude', author: { id: 4, display_name: 'Pike' }, praxis_id: 1, task_id: null, created_at: now, flags: flagged.flags }
    api.getFlaggedPraxes.mockResolvedValue([flagged, { ...flagged, id: 8, created_by_id: 4 }])
    api.getFlaggedComments.mockResolvedValue([comment])
    api.getModLog.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 })
    render(<MemoryRouter initialEntries={['/admin/reports?character=3']}><ReportsTab onViewAccount={vi.fn()} /></MemoryRouter>)
    expect((await screen.findByRole('tab', { name: 'Praxis 1' }))).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Comments 0' })).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Comments 0' }))
    expect(screen.getByText(/No open reports about this character/)).toBeTruthy()
    expect(screen.queryByText('No open reports.')).toBeNull()
  })

  it('a comment Remove asks for a reason and sends it', async () => {
    const comment = { id: 5, body_text: 'rude', author: { id: 4, display_name: 'Pike' }, praxis_id: 1, task_id: null, created_at: now, flags: flagged.flags }
    api.getFlaggedPraxes.mockResolvedValue([])
    api.getFlaggedComments.mockResolvedValue([comment])
    api.getModLog.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 })
    api.moderateComment.mockResolvedValue({})
    render(<MemoryRouter><ReportsTab onViewAccount={vi.fn()} /></MemoryRouter>)
    const card = await screen.findByRole('region', { name: 'Pike' })
    fireEvent.click(within(card).getByRole('button', { name: 'Remove' }))
    const submit = screen.getByRole('button', { name: 'Remove with this reason' }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Reason the author sees'), { target: { value: 'Rude to a newcomer.' } })
    fireEvent.click(submit)
    await waitFor(() => expect(api.moderateComment).toHaveBeenCalledWith(5, 'deleted', 'Rude to a newcomer.'))
  })

  it('Remove all their flagged asks for a reason and sends it', async () => {
    mount([flagged])
    fireEvent.click(await screen.findByRole('button', { name: /Remove all their flagged/ }))
    const go = screen.getByRole('button', { name: /confirm . remove 2 posts/ }) as HTMLButtonElement
    expect(go.disabled).toBe(true)
    fireEvent.change(screen.getAllByLabelText('Reason the author sees').at(-1)!, { target: { value: ' Spam. ' } })
    fireEvent.click(go)
    await waitFor(() => expect(api.removeFlaggedPraxes).toHaveBeenCalledWith(3, 'Spam.'))
  })
})

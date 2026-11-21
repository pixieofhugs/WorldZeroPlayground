/** #3704 — the ask shows once, only on a first praxis where push can turn on; the tap alone asks the browser. */
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  list: vi.fn(),
  subscribe: vi.fn(),
  subscribed: vi.fn(),
  block: vi.fn(),
}))
vi.mock('../../../api/client', () => ({ apiGet: m.get, apiPut: m.put }))
vi.mock('../../../api/praxis', () => ({ listPraxes: m.list }))
vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => ({ user: { character: { id: 7 } } }) }))
vi.mock('../../../utils/pushSubscribe', () => ({
  subscribePush: m.subscribe,
  deviceSubscribed: m.subscribed,
  pushBlock: m.block,
}))

import PushAsk from '../PushAsk'
import { PUSH_ASK_DISMISSED_KEY } from '../../../utils/pushAskDismissed'

const row = { on_updates: true, by_email: true, by_push: false, locked: false }

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  m.get.mockResolvedValue({ data: { events: { vote_on_mine: row }, vapid_public_key: 'k' } })
  m.put.mockResolvedValue({ data: {} })
  m.list.mockResolvedValue([{ id: 5 }])
  m.subscribed.mockResolvedValue(false)
  m.block.mockReturnValue('ok')
})
afterEach(cleanup)

describe('PushAsk', () => {
  it('stays away until the tap, then subscribes, switches the rows on and goes for good', async () => {
    render(<PushAsk praxisId={5} />)
    const on = await screen.findByText('Turn on notifications')
    expect(m.subscribe).not.toHaveBeenCalled()
    m.subscribe.mockResolvedValue('ok')
    fireEvent.click(on)
    await waitFor(() => expect(screen.queryByTestId('push-ask')).toBeNull())
    expect(m.subscribe).toHaveBeenCalledWith('k')
    expect(m.put.mock.calls[0][1].body.events.vote_on_mine.by_push).toBe(true)
    expect(localStorage.getItem(PUSH_ASK_DISMISSED_KEY)).toBe('1')
  })

  it('Not now dismisses it for good', async () => {
    render(<PushAsk praxisId={5} />)
    fireEvent.click(await screen.findByText('Not now'))
    expect(screen.queryByTestId('push-ask')).toBeNull()
    expect(localStorage.getItem(PUSH_ASK_DISMISSED_KEY)).toBe('1')
  })

  it.each([
    ['not the first praxis', () => m.list.mockResolvedValue([{ id: 5 }, { id: 4 }])],
    ['a different praxis', () => m.list.mockResolvedValue([{ id: 4 }])],
    ['push blocked', () => m.block.mockReturnValue('denied')],
    ['already subscribed', () => m.subscribed.mockResolvedValue(true)],
    ['dismissed before', () => localStorage.setItem(PUSH_ASK_DISMISSED_KEY, '1')],
  ])('is absent: %s', async (_name, arrange) => {
    arrange()
    render(<PushAsk praxisId={5} />)
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.queryByTestId('push-ask')).toBeNull()
  })
})

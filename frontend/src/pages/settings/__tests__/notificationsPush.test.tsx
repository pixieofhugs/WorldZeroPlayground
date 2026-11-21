/** #3703 — Push on an unsubscribed device: drawn off, first tap asks + subscribes, then the stored prefs show. */
// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => 'desktop',
}))

const m = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  subscribe: vi.fn(),
  subscribed: vi.fn(),
}))
vi.mock('../../../api/client', () => ({ apiGet: m.get, apiPut: m.put }))
vi.mock('../../../utils/pushSubscribe', () => ({
  subscribePush: m.subscribe,
  deviceSubscribed: m.subscribed,
}))

import NotificationsSection, { NotificationRows } from '../sections/NotificationsSection'
import type { NotificationPrefs } from '../notificationPrefs'

const row = { on_updates: true, by_email: true, by_push: true, locked: false }
const PREFS: NotificationPrefs = { comment_on_mine: row }
const PUSH = 'settings-notifications-comment_on_mine-by_push'

afterEach(cleanup)

beforeEach(() => {
  vi.resetAllMocks()
  m.get.mockResolvedValue({ data: { events: PREFS, vapid_public_key: 'k' } })
  m.put.mockImplementation(async () => ({ data: { events: PREFS } }))
  m.subscribed.mockResolvedValue(false)
})

describe('an unsubscribed device', () => {
  it('draws stored-on Push switches off but still tappable', () => {
    const html = renderToStaticMarkup(
      <NotificationRows prefs={PREFS} deviceOff onToggle={() => {}} onToggleAll={() => {}} />,
    )
    const at = html.indexOf(`data-testid="${PUSH}"`)
    const cell = html.slice(html.lastIndexOf('<button', at), html.indexOf('>', at) + 1)
    expect(cell).toContain('aria-checked="false"')
    expect(cell).not.toContain('aria-disabled')
  })

  async function tap() {
    render(<NotificationsSection sectionId="s" />)
    const sw = await screen.findByTestId(PUSH)
    await waitFor(() => expect(sw.getAttribute('aria-checked')).toBe('false'))
    fireEvent.click(sw)
    return sw
  }

  it('subscribes on the first tap, saves the stored choice, then shows it', async () => {
    m.subscribe.mockResolvedValue('ok')
    const sw = await tap()
    await waitFor(() => expect(m.put).toHaveBeenCalled())
    expect(m.subscribe).toHaveBeenCalledWith('k')
    expect(m.put.mock.calls[0][1].body.events.comment_on_mine.by_push).toBe(true)
    await waitFor(() => expect(sw.getAttribute('aria-checked')).toBe('true'))
  })

  it.each(['denied', 'dismissed', 'unsupported'] as const)('%s: nothing is saved', async (result) => {
    m.subscribe.mockResolvedValue(result)
    await tap()
    await waitFor(() => expect(m.subscribe).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 0))
    expect(m.put).not.toHaveBeenCalled()
  })

  it('unsupported says so', async () => {
    m.subscribe.mockResolvedValue('unsupported')
    await tap()
    expect((await screen.findByRole('alert')).textContent).toMatch(/push notifications/i)
  })
})

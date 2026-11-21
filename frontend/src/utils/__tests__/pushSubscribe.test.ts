// @vitest-environment jsdom
/** Seam: deviceSubscribed() against stubbed browser push globals. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { deviceSubscribed } from '../pushSubscribe'

function stubBrowser(registration: unknown) {
  vi.stubGlobal('Notification', { permission: 'granted' })
  vi.stubGlobal('PushManager', class {})
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistration: vi.fn().mockResolvedValue(registration) },
  })
}

beforeEach(() => {
  vi.stubGlobal('Notification', undefined)
})
afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(navigator, 'serviceWorker')
})

describe('deviceSubscribed', () => {
  it('is false when there is no service-worker registration', async () => {
    stubBrowser(undefined)
    expect(await deviceSubscribed()).toBe(false)
  })

  it('is false when the registration has no push subscription', async () => {
    stubBrowser({ pushManager: { getSubscription: vi.fn().mockResolvedValue(null) } })
    expect(await deviceSubscribed()).toBe(false)
  })

  it('is true when the registration holds a subscription', async () => {
    stubBrowser({ pushManager: { getSubscription: vi.fn().mockResolvedValue({}) } })
    expect(await deviceSubscribed()).toBe(true)
  })
})

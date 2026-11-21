// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { pushBlock } from '../pushSubscribe'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function browser({ push, permission = 'default' }: { push: boolean; permission?: string }) {
  vi.stubGlobal('Notification', { permission })
  if (push) vi.stubGlobal('PushManager', class {})
  else delete (window as unknown as Record<string, unknown>).PushManager
  Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true })
}

describe('pushBlock', () => {
  it('has no key, no push, denied, or ok, in that order', () => {
    browser({ push: true })
    expect(pushBlock(null)).toBe('keys')
    expect(pushBlock('k')).toBe('ok')
    browser({ push: true, permission: 'denied' })
    expect(pushBlock('k')).toBe('denied')
    browser({ push: false })
    expect(pushBlock('k')).toBe('unsupported')
  })

  it('iPhone Safari outside the home-screen app is ios, ahead of unsupported', () => {
    browser({ push: false })
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    )
    window.matchMedia = vi.fn(() => ({ matches: false })) as unknown as typeof window.matchMedia
    expect(pushBlock('k')).toBe('ios')
  })
})

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { pushBlock } from '../pushSubscribe'

afterEach(() => vi.unstubAllGlobals())

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
})

import { describe, expect, it } from 'vitest'
// @ts-expect-error classic-script worker with no types; vite-node supplies the `module` its guard exports to.
import { route } from '../../public/sw.js'

const O = 'https://worldzero.org'

describe('service worker route', () => {
  it('caches only the shell', () => {
    expect(route(`${O}/assets/index-abc.js`, 'cors', 'GET', O)).toBe('asset')
    expect(route(`${O}/tasks`, 'navigate', 'GET', O)).toBe('nav')
  })
  it('never touches API, auth, media or writes', () => {
    expect(route('https://api.worldzero.org/auth/me', 'cors', 'GET', O)).toBeNull()
    expect(route(`${O}/auth/me`, 'navigate', 'GET', O)).toBeNull()
    expect(route(`${O}/media/x.png`, 'navigate', 'GET', O)).toBeNull()
    expect(route(`${O}/tasks`, 'cors', 'GET', O)).toBeNull()
    expect(route(`${O}/assets/a.js`, 'cors', 'POST', O)).toBeNull()
  })
})

import { describe, expect, it, vi } from 'vitest'
import push from '../locales/en/push.json'
// @ts-expect-error classic-script worker with no types; vite-node supplies the `module` its guard exports to.
import { route, shellUrls, pushMessage, safeUrl, focusOrOpen } from '../../public/sw.js'

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

const SHELL_HTML = `<script type="module" src="/assets/index-a.js"></script>
<link rel="stylesheet" href="/assets/index-b.css">
<script>var m=["assets/chunk-c.js"],c=[]</script>`

describe('shellUrls', () => {
  it('returns exactly the /assets set, leading slash normalised', () => {
    expect(shellUrls(SHELL_HTML).sort()).toEqual(['/assets/chunk-c.js', '/assets/index-a.js', '/assets/index-b.css'])
  })
})

const S = { ...push, origin: O }

describe('pushMessage', () => {
  it('heads with the character and collapses ratings under one tag', () => {
    const m = pushMessage(
      { kind: 'vote_on_mine', tag: 'votes:7', url: '/praxis/7', character: 'Agent Teacup', actor: 'Juniper', task: 'Find a Cool Stick', count: 3 },
      S,
    )
    expect(m.title).toBe('World Zero · for Agent Teacup')
    expect(m.options.body).toBe('3 new ratings\nJuniper and 2 more rated your praxis for Find a Cool Stick.')
    expect(m.options.tag).toBe('votes:7')
    expect(m.options.data.url).toBe('/praxis/7')
    expect(m.options.body).not.toMatch(/vote/i)
  })
  it('falls back for a missing actor, task or unknown kind', () => {
    const m = pushMessage({ kind: 'nope', url: '/', character: 'X', actor: null, task: null, count: null }, S)
    expect(m.options.body).toBe('Something happened\nOpen World Zero to see.')
    expect(pushMessage({ kind: 'comment_mention', character: 'X' }, S).options.body).toContain('Someone mentioned you')
  })
})

describe('safeUrl', () => {
  it('keeps same-origin paths and refuses everything else', () => {
    expect(safeUrl('/tasks?x=1', O)).toBe('/tasks?x=1')
    expect(safeUrl('https://evil.example/x', O)).toBe('/')
    expect(safeUrl('//evil.example/x', O)).toBe('/')
    expect(safeUrl(undefined, O)).toBe('/')
  })
})

describe('focusOrOpen', () => {
  it('focuses and navigates an open client', async () => {
    const c = { focus: vi.fn(), navigate: vi.fn() }
    const clients = { matchAll: async () => [c], openWindow: vi.fn() }
    await focusOrOpen(clients, '/tasks')
    expect(c.navigate).toHaveBeenCalledWith('/tasks')
    expect(clients.openWindow).not.toHaveBeenCalled()
  })
  it('opens a window when none is open or navigate is refused', async () => {
    const none = { matchAll: async () => [], openWindow: vi.fn() }
    await focusOrOpen(none, '/a')
    expect(none.openWindow).toHaveBeenCalledWith('/a')
    const refuse = { matchAll: async () => [{ focus: vi.fn(), navigate: () => Promise.reject(new Error('x')) }], openWindow: vi.fn() }
    await focusOrOpen(refuse, '/b')
    expect(refuse.openWindow).toHaveBeenCalledWith('/b')
  })
})

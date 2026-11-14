/**
 * #1349 — the `useAuth().refetch()` ledger. `refetch()` reloads the WHOLE
 * `CurrentUser`; every surviving call site is listed with why it survives.
 * A source-scan ratchet: a new call site fails until its reason is written down.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { readStripped, sourceFiles, toRelative } from '../../test/sourceScan'
import { refetchWhenVisible, runSessionProbe, runSignOut } from '../AuthContext'
import { ApiError, ApiNetworkError } from '../../api/apiError'
import type { CurrentUser } from '../../api/auth'


type Verdict =
  /** The mutation genuinely changed `CurrentUser` and nothing cheaper exists. */
  'identity-changed'

interface LedgerEntry {
  file: string
  calls: number
  verdict: Verdict
  why: string
}

/**
 * Every `useAuth().refetch()` in the tree. All are `identity-changed`: the
 * mutation moved `CurrentUser` and no response carries it. A response that
 * carries the whole viewer goes through `applyUser()` instead (#1383).
 */
const LEDGER: LedgerEntry[] = [
  {
    file: 'pages/Home.tsx',
    calls: 1,
    verdict: 'identity-changed',
    why: 'POST /auth/dev-login sets the cookie and returns nothing — /auth/me is the only way to learn who that is.',
  },
  {
    file: 'pages/onboarding/ReturningCard.tsx',
    calls: 1,
    verdict: 'identity-changed',
    why: 'POST /auth/returning-player mints a brand-new account and sets the cookie; the body is an acknowledgement, so /auth/me is the only way to learn who that is (#2162).',
  },
  {
    file: 'pages/characterPaths/useCreateCharacter.ts',
    calls: 1,
    verdict: 'identity-changed',
    why: 'The server carries the new life immediately; every capability flag is recomputed against it.',
  },
  {
    file: 'pages/characterPaths/useEditCharacter.ts',
    calls: 2,
    verdict: 'identity-changed',
    why: 'Edit returns a CharacterOut, not a CurrentUser; delete makes the server re-resolve the active life (or none).',
  },
  {
    file: 'pages/editPraxis/useEditPraxis.ts',
    calls: 3,
    verdict: 'identity-changed',
    why: 'publish / pullBack / leaveCollab each run a backend stats recalc; publish also delivers invitation letters.',
  },
  {
    file: 'pages/praxisDetail/usePraxisDetail.ts',
    calls: 1,
    verdict: 'identity-changed',
    why: 'Withdraw runs unsubmit_praxis, which recalculates every member — the points come back off.',
  },
]

/** Files binding `refetch` off `useAuth()` (not `useResource`'s etc.) → call count. */
function measureAuthRefetches(): Map<string, number> {
  const measured = new Map<string, number>()
  for (const file of sourceFiles()) {
    const code = readStripped(file)
    // `[^{}]`, not `[^}]`: the latter can start at an earlier brace.
    const bindsRefetch = [...code.matchAll(/\{([^{}]*)\}\s*=\s*useAuth\(\)/g)].some((binding) =>
      binding[1]
        .split(',')
        .map((name) => name.trim())
        .includes('refetch'),
    )
    if (!bindsRefetch) continue
    const calls = code.match(/\brefetch\(\)/g)?.length ?? 0
    if (calls > 0) {
      measured.set(toRelative(file), calls)
    }
  }
  return measured
}

describe('the useAuth().refetch() inventory matches the ledger', () => {
  const measured = measureAuthRefetches()

  it('has no call site the ledger does not justify', () => {
    const unledgered = [...measured.keys()].filter(
      (file) => !LEDGER.some((entry) => entry.file === file),
    )
    expect(unledgered).toEqual([])
  })

  it('has no ledger entry whose call site is gone', () => {
    const stale = LEDGER.map((entry) => entry.file).filter((file) => !measured.has(file))
    expect(stale).toEqual([])
  })

  it.each(LEDGER)('$file reloads the whole identity $calls time(s): $why', ({ file, calls }) => {
    expect(measured.get(file)).toBe(calls)
  })

  it('totals the count this sweep reports', () => {
    const total = [...measured.values()].reduce((sum, calls) => sum + calls, 0)
    expect(total).toBe(9)
    expect(measured.size).toBe(6)
  })

  it('leaves only identity reloads', () => {
    // A new site belongs only if the mutation moved the viewer AND no response carries it.
    const verdicts = new Set(LEDGER.map((entry) => entry.verdict))
    expect([...verdicts]).toEqual(['identity-changed'])
  })
})

describe('signing out never re-asks who the viewer is', () => {
  const files = sourceFiles()

  it('routes every sign-out through AuthContext, which alone imports `logout`', () => {
    const importsLogout = /import\s*\{[^}]*\blogout\b[^}]*\}\s*from\s*['"][^'"]*api\/auth['"]/
    const importers = files
      .filter((file) => importsLogout.test(readFileSync(file, 'utf8')))
      .map(toRelative)
    expect(importers).toEqual(['auth/AuthContext.tsx'])
  })
})

describe('runSignOut', () => {
  it('ends the session, then forgets the viewer', async () => {
    const order: string[] = []
    const endSession = async () => {
      order.push('logout')
    }
    const forgetViewer = () => {
      order.push('forget')
    }
    await runSignOut(endSession, forgetViewer)()
    expect(order).toEqual(['logout', 'forget'])
  })

  it('keeps the viewer if the session could not be ended', async () => {
    let forgotten = false
    const failed = runSignOut(
      async () => {
        throw new Error('network')
      },
      () => {
        forgotten = true
      },
    )
    await expect(failed()).rejects.toThrow('network')
    expect(forgotten).toBe(false)
  })
})

/** #3134 — only a 401 means signed out; other failures keep the viewer. */
describe('runSessionProbe', () => {
  const ME = { albescent_revealed: false } as CurrentUser

  function harness(whoAmI: () => Promise<CurrentUser>) {
    const adopted: (CurrentUser | null)[] = []
    const hints: boolean[] = []
    let settled = 0
    const probe = runSessionProbe(
      whoAmI,
      (me) => adopted.push(me),
      (signedIn) => hints.push(signedIn),
      () => {
        settled += 1
      },
    )
    return { adopted, hints, probe, settled: () => settled }
  }

  const answers = (status: number) => async () => {
    throw new ApiError(new Response(null, { status }), undefined)
  }

  it('adopts the viewer the server names', async () => {
    const h = harness(async () => ME)
    await h.probe()
    expect(h.adopted).toEqual([ME])
    expect(h.hints).toEqual([true])
    expect(h.settled()).toBe(1)
  })

  it('forgets the viewer on a 401', async () => {
    const h = harness(answers(401))
    await h.probe()
    expect(h.adopted).toEqual([null])
    expect(h.hints).toEqual([false])
    expect(h.settled()).toBe(1)
  })

  it.each([
    ['the network drops', async () => Promise.reject(new ApiNetworkError(new TypeError('offline')))],
    ['the server answers 500', answers(500)],
    ['the server answers 403', answers(403)],
    ['something else throws', async () => Promise.reject(new Error('boom'))],
  ])('keeps the viewer, and leaves the hint unwritten, when %s', async (_case, whoAmI) => {
    const h = harness(whoAmI)
    await expect(h.probe(), 'refetch() never rejects').resolves.toBeUndefined()
    expect(h.adopted).toEqual([])
    expect(h.hints).toEqual([])
    expect(h.settled(), 'loading still ends false').toBe(1)
  })
})

describe('re-reading the viewer when the tab returns (#3169)', () => {
  it('refetches on becoming visible, and not on being hidden', () => {
    let visible = false
    let calls = 0
    const handler = refetchWhenVisible(() => visible, async () => { calls += 1 })
    handler()
    expect(calls).toBe(0)
    visible = true
    handler()
    expect(calls).toBe(1)
  })
})

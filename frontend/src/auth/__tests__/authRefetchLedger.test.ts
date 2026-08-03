/**
 * #1349 — the `useAuth().refetch()` ledger.
 *
 * `refetch()` reloads the WHOLE of `CurrentUser`: the carried character, its
 * era stats, its invitation letters, and a dozen server-computed capability
 * flags. The refetch family (#1346) has been closing it down one reason at a
 * time — #1382 retired the per-star reload, #1390 stopped a fresh `CurrentUser`
 * object fanning out into unrelated reads, #1349 deleted the post-`logout()`
 * pair, and #1383 had the six sites that discarded a `CurrentUser` the server
 * had already built consume it instead. What is left is an inventory in which
 * every surviving call site is written down with the reason it survives.
 *
 * WHAT THIS PROVES, AND WHAT IT CANNOT
 * ------------------------------------
 * Vitest runs in the `node` environment with no jsdom, so the harness is
 * `renderToStaticMarkup` and effects never run. Nothing in this repo can assert
 * "one request instead of two". So this is a SOURCE test, the same posture as
 * `hooks/__tests__/authDepNarrowing.test.ts`: it reads the tree and pins the
 * shape the fix turns on. Its value is the ratchet — a call site added later
 * fails the suite until somebody writes down why the whole identity has to be
 * re-read, which is exactly the discipline the sweep exists to leave behind.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { runSignOut } from '../AuthContext'

const SOURCE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

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
 * Every `useAuth().refetch()` in the tree, with its justification.
 *
 * #1383 closed the ledger's second class out. Every entry that survives is
 * `identity-changed`: the mutation really did move `CurrentUser` and no response
 * carries the new one. Publishing, withdrawing or leaving a praxis each run a
 * stats recalc (points, level, and on publish the delivery of newly-earned
 * invitation letters); creating, editing and deleting a life change or
 * re-resolve the carried one; dev-login has no other way to learn who signed in.
 *
 * The two classes that are gone, and why they are not coming back:
 *
 *  - `response-in-hand` — 6 calls across 4 files that discarded a `CurrentUser`
 *    the server had already built. #1383 widened `POST /factions/choose` to
 *    answer one and had those callers, plus the three `POST /me/active-character`
 *    callers, adopt it via `applyUser()`. A mutation that answers the whole
 *    viewer should be consumed, never chased with `/auth/me`.
 *  - Merely redundant — the post-`logout()` reloads in `NavBar` and `Settings`,
 *    deleted by #1349. See the `signOut` rule below.
 */
const LEDGER: LedgerEntry[] = [
  {
    file: 'pages/Home.tsx',
    calls: 1,
    verdict: 'identity-changed',
    why: 'POST /auth/dev-login sets the cookie and returns nothing — /auth/me is the only way to learn who that is.',
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

/** Source files, tests excluded — a test may name `refetch()` freely. */
function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = path.join(directory, entry)
    if (statSync(full).isDirectory()) {
      return entry === '__tests__' ? [] : sourceFiles(full)
    }
    return /\.tsx?$/.test(entry) ? [full] : []
  })
}

/** Comments say `refetch()` too, and they are not call sites. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

/**
 * Files that bind `refetch` off `useAuth()` itself, mapped to their call count.
 *
 * Deliberately narrow: `useResource` and `useSidebarPanels` expose a `refetch`
 * of their own, and those are ordinary re-reads of one list, not identity
 * reloads. Only a bare `refetch` destructured from `useAuth()` counts.
 */
function measureAuthRefetches(): Map<string, number> {
  const measured = new Map<string, number>()
  for (const file of sourceFiles(SOURCE_ROOT)) {
    const code = withoutComments(readFileSync(file, 'utf8'))
    // `[^{}]` and not `[^}]`: the latter happily starts the match at an earlier
    // brace and swallows the real destructuring pattern whole.
    const bindsRefetch = [...code.matchAll(/\{([^{}]*)\}\s*=\s*useAuth\(\)/g)].some((binding) =>
      binding[1]
        .split(',')
        .map((name) => name.trim())
        .includes('refetch'),
    )
    if (!bindsRefetch) continue
    const calls = code.match(/\brefetch\(\)/g)?.length ?? 0
    if (calls > 0) {
      measured.set(path.relative(SOURCE_ROOT, file).split(path.sep).join('/'), calls)
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
    // 16 before #1349, in 12 files; 14 in 10 after it; 8 in 5 once #1383 had
    // the six `response-in-hand` sites consume the response instead.
    const total = [...measured.values()].reduce((sum, calls) => sum + calls, 0)
    expect(total).toBe(8)
    expect(measured.size).toBe(5)
  })

  it('leaves only identity reloads', () => {
    // Both other classes are closed: merely-redundant (#1349) and
    // response-in-hand (#1383). A new call site belongs here only if the
    // mutation moved the whole viewer AND no response carries it — otherwise
    // consume the response, or delete the call.
    const verdicts = new Set(LEDGER.map((entry) => entry.verdict))
    expect([...verdicts]).toEqual(['identity-changed'])
  })
})

describe('signing out never re-asks who the viewer is', () => {
  const files = sourceFiles(SOURCE_ROOT)

  it('routes every sign-out through AuthContext, which alone imports `logout`', () => {
    // A component that imports `logout` has to clear the auth state itself, and
    // `refetch()` is the only handle it has for that — which is how both
    // sign-out buttons ended up paying for a `/auth/me` they knew the answer to.
    const importsLogout = /import\s*\{[^}]*\blogout\b[^}]*\}\s*from\s*['"][^'"]*api\/auth['"]/
    const importers = files
      .filter((file) => importsLogout.test(readFileSync(file, 'utf8')))
      .map((file) => path.relative(SOURCE_ROOT, file).split(path.sep).join('/'))
    expect(importers).toEqual(['auth/AuthContext.tsx'])
  })

  it('clears the viewer locally instead of refetching a guaranteed 401', () => {
    // `/auth/me` is a SESSION_PROBE (`api/sessionRedirect.ts`), so the 401 was
    // swallowed rather than fatal — it just cost a round trip to arrive at the
    // `null` the caller had already caused. What keeps the client honest without
    // it: the provider sets the same `null` and the same session hint that a
    // failed `/auth/me` would have set.
    const source = withoutComments(
      readFileSync(path.join(SOURCE_ROOT, 'auth', 'AuthContext.tsx'), 'utf8'),
    )
    expect(source).toMatch(/runSignOut\(logout,/)
    expect(source).toMatch(/setUser\(null\)/)
    expect(source).toMatch(/rememberSession\(false\)/)
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

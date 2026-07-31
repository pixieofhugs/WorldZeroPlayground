/**
 * #1390 — the star-cast amplifier ratchet.
 *
 * `/auth/me` returns a fresh `CurrentUser` object on every `refetch()`, and
 * `useVote` refetches after every cast. So an effect that lists the whole
 * `user` object in its dependency array re-runs — and re-requests — every time
 * the viewer moves a single star. Five such effects turned one cast into a
 * fan-out of unrelated reads.
 *
 * WHY THIS IS A SOURCE TEST, AND WHAT IT DOES NOT PROVE
 * ----------------------------------------------------
 * Vitest runs in the `node` environment here with no jsdom, so the harness is
 * `renderToStaticMarkup` and effects never run. This test therefore CANNOT
 * assert "one cast fires one request" — nothing in this repo can. What it pins
 * is the property the fix actually turns on: these effects key on a value that
 * survives a `/auth/me` refetch instead of one that never does. Same posture as
 * `searchQueryParamAdoption.test.ts`, which reads source for the same reason.
 *
 * Note the fix could NOT be made upstream in `AuthProvider`. A star cast
 * changes the payload for real — `votes_available` is computed from spent votes
 * (`schemas/character.py`) — so the new object is legitimately new, and no
 * memoisation or deep-equality check at the provider would suppress it.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const SOURCE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url))

/**
 * Every module that both reads `useAuth()` and fetches from an effect keyed on
 * the viewer. Adding a file here is cheap; the point is that the guard is a
 * standing rule rather than a note about six lines that were once wrong.
 */
const AUTH_KEYED_FETCHERS = [
  { name: 'useMyActiveTasks', relativePath: '../useMyActiveTasks.ts' },
  { name: 'useSidebarPanels', relativePath: '../useSidebarPanels.tsx' },
  { name: 'CharacterProfile', relativePath: '../../pages/CharacterProfile.tsx' },
  { name: 'useEditPraxis', relativePath: '../../pages/editPraxis/useEditPraxis.ts' },
  { name: 'useTaskDetail', relativePath: '../../pages/taskDetail/useTaskDetail.ts' },
] as const

function read(relativePath: string): string {
  return readFileSync(path.join(SOURCE_DIRECTORY, relativePath), 'utf8')
}

/** Contents of every `}, [...])` dependency array in a module. */
function dependencyArrays(source: string): string[] {
  return [...source.matchAll(/\},\s*\[([^\]]*)\]\)/g)].map((match) => match[1])
}

/** Top-level elements of one dependency array, trimmed. */
function dependencies(arrayContents: string): string[] {
  return arrayContents
    .split(',')
    .map((entry) => entry.replace(/\/\/.*$/gm, '').trim())
    .filter((entry) => entry.length > 0)
}

describe.each(AUTH_KEYED_FETCHERS)('$name keys on the character, not the auth object', ({ relativePath }) => {
  const source = read(relativePath)

  it('lists no bare `user` in any dependency array', () => {
    const offenders = dependencyArrays(source).filter((contents) =>
      dependencies(contents).includes('user'),
    )
    expect(offenders).toEqual([])
  })

  it('reads the viewer through the narrow, refetch-stable slice', () => {
    // `user?.character?.id` directly, or hoisted to a `characterId` const first.
    expect(source).toMatch(/user\?\.character\?\.id/)
  })
})

describe('useSidebarPanels settles on a value a refetch cannot disturb', () => {
  const source = read('../useSidebarPanels.tsx')

  it('compares the settled character id, not the auth object identity', () => {
    // The rail's read is the widest server fan-out on the page, so this is the
    // costliest of the five. Its guard was never wrong about the MOUNT double
    // fire, but `settledUser.current === user` could not match after a refetch
    // minted a new object, so every cast still re-read all three panels.
    expect(source).toMatch(/settledCharacterId\.current === characterId/)
    expect(source).not.toMatch(/settledUser\.current === user\b/)
  })

  it('still keeps the sentinel that suppresses the mount double-fetch', () => {
    expect(source).toMatch(/const first = settledCharacterId\.current === UNSETTLED/)
    expect(source).toMatch(/if \(!first\) refetch\(\)/)
  })
})

describe('useTaskDetail asks for relationships once', () => {
  const source = read('../../pages/taskDetail/useTaskDetail.ts')

  it('makes a single listRelationships call', () => {
    // It used to ask twice — once `{ type: 'friend' }`, once `{ type: 'foe' }` —
    // where the list response already carries `type` on every row
    // (`api/relationships.ts`), so the second trip bought nothing.
    expect(source.match(/listRelationships\(/g)).toHaveLength(1)
  })

  it('does not pass a type filter it can apply client-side', () => {
    expect(source).not.toMatch(/listRelationships\(\{\s*type:/)
  })

  it('still separates friends from foes, active only', () => {
    expect(source).toMatch(/r\.type === "friend"/)
    expect(source).toMatch(/r\.type === "foe"/)
    expect(source).toMatch(/r\.status === "active"/)
  })
})

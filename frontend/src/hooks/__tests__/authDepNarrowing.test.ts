/**
 * #1390 — refetch amplifier ratchet. `/auth/me` mints a new `CurrentUser` on
 * every refetch, so an effect keyed on `user` re-requests each time. Source test
 * (effects never run in node); can't be fixed in `AuthProvider`, since a real
 * change legitimately returns a different payload.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const SOURCE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url))

/** Every module that reads `useAuth()` and fetches from a viewer-keyed effect. */
const AUTH_KEYED_FETCHERS = [
  { name: 'useMyActiveTasks', relativePath: '../useMyActiveTasks.ts' },
  { name: 'useSidebarPanels', relativePath: '../useSidebarPanels.tsx' },
  { name: 'CharacterProfile', relativePath: '../../pages/CharacterProfile.tsx' },
  { name: 'useEditPraxis', relativePath: '../../pages/editPraxis/useEditPraxis.ts' },
  { name: 'useComposerRoster', relativePath: '../../pages/editPraxis/useComposerRoster.ts' },
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
    // Every row already carries `type` (`api/relationships.ts`).
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

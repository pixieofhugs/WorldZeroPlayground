/**
 * `REQUEST_ITEM_TYPES` is the server's own `requests` type-set, across a
 * language boundary (#2220).
 *
 * THE SEAM
 * --------
 * The set decides whether an archive write fires the requests bus, and the bus
 * is the only thing that clears the bell's phantom badge without a hard reload.
 * Add a fifth type to `FILTER_REQUESTS` server-side and leave this one, and
 * archiving THAT type silently reopens the exact bug this shipped to close —
 * green typecheck, green vitest, both halves compiling fine apart.
 *
 * Drift the other way is just as quiet: a type that LEAVES the filter keeps
 * firing a bus event that refetches three surfaces for nothing.
 *
 * A comment saying "keep these in sync" is the version of this that rots. This
 * reads the Python source, which is the only thing that cannot. Same trick as
 * `activityCountCap.test.ts` next door.
 */
import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { REQUEST_ITEM_TYPES } from '../activityFeed'

const SERVICE = new URL('../../../../backend/services/activity_feed.py', import.meta.url)

/** `FEED_ITEM_TYPE_COLLAB_INVITE = "collab_invite"` → the wire string. */
function wireStrings(source: string): Map<string, string> {
  const declarations = source.matchAll(/^(FEED_ITEM_TYPE_\w+) = "(\w+)"$/gm)
  return new Map([...declarations].map(([, name, value]) => [name, value]))
}

/**
 * Every `FeedSource` whose `filters` name `FILTER_REQUESTS`.
 *
 * Reads the registry rather than `REQUEST_ITEM_TYPES` itself, because the
 * Python constant is `frozenset(FILTER_QUERIES[FILTER_REQUESTS])` — derived
 * from these very declarations, so there is no literal there to read.
 */
function requestTypesInRegistry(source: string): Set<string> {
  const names = wireStrings(source)
  const sources = source.matchAll(
    /item_type=(FEED_ITEM_TYPE_\w+),\s*\n\s*filters=frozenset\(\{([^}]*)\}\)/g,
  )
  const found = new Set<string>()
  for (const [, name, filters] of sources) {
    if (!filters.includes('FILTER_REQUESTS')) continue
    const wire = names.get(name)
    expect(wire, `${name} is in FILTER_REQUESTS but has no string declaration`).toBeDefined()
    found.add(wire!)
  }
  return found
}

describe('REQUEST_ITEM_TYPES', () => {
  it('is exactly the set of feed sources the server puts in FILTER_REQUESTS', () => {
    const source = readFileSync(SERVICE, 'utf8')
    const fromRegistry = requestTypesInRegistry(source)

    // A zero-length match means the registry's shape moved, not that the filter
    // emptied — assert it found something before comparing, or a broken regex
    // reads as a passing test.
    expect(
      fromRegistry.size,
      'no FeedSource matched — FEED_SOURCES was reformatted, so this regex is now blind',
    ).toBeGreaterThan(0)
    expect([...fromRegistry].sort()).toEqual([...REQUEST_ITEM_TYPES].sort())
  })
})

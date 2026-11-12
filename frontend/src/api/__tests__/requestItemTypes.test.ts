/**
 * `REQUEST_ITEM_TYPES` must equal the server's `FILTER_REQUESTS` set (#2220):
 * a type added server-side would reopen the phantom badge on archive, one
 * removed would ring the bus for nothing. Read from the Python source, like
 * `activityCountCap.test.ts`.
 */
import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { REQUEST_ITEM_TYPES } from '../activityFeed'

const SERVICE = new URL('../../../../backend/services/activity_feed.py', import.meta.url)

function wireStrings(source: string): Map<string, string> {
  const declarations = source.matchAll(/^(FEED_ITEM_TYPE_\w+) = "(\w+)"$/gm)
  return new Map([...declarations].map(([, name, value]) => [name, value]))
}

/**
 * Reads the `FeedSource` registry: the Python constant is derived from it, so
 * there is no literal to read.
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

    // Guard against a blind regex passing vacuously.
    expect(
      fromRegistry.size,
      'no FeedSource matched — FEED_SOURCES was reformatted, so this regex is now blind',
    ).toBeGreaterThan(0)
    expect([...fromRegistry].sort()).toEqual([...REQUEST_ITEM_TYPES].sort())
  })
})

import { beforeAll } from 'vitest'

/**
 * Resolve every faction archetype before any test runs (#1045).
 *
 * Archetypes are code-split (`factions/lazyArchetype.tsx`), so a manifest entry
 * is a component that renders `null` until its chunk lands. Tests render through
 * `renderToStaticMarkup`, which is synchronous and never runs effects — so
 * without this, every test that walks `surfaceMap()` would assert against empty
 * markup. `preload()` parks each module in a plain closure, after which the
 * archetype renders synchronously and all 1702 existing assertions behave
 * exactly as they did before the split.
 *
 * WHY THIS IMPORTS INSIDE `beforeAll` AND NOT AT MODULE SCOPE
 * ----------------------------------------------------------
 * Setup files evaluate BEFORE the test file's `vi.mock` calls are registered.
 * Importing the faction index at module scope here therefore pulled the whole
 * graph — and everything it transitively imports, `useGameConfig` included —
 * into the module cache as the REAL implementation, so 25 test files that mock
 * something reachable from a faction silently got the unmocked version. That
 * broke tests with no connection to factions at all (StakesTiles renders its
 * figures from `useGameConfig`, and went blank).
 *
 * `beforeAll` runs after the test module and its mocks are in place, so these
 * dynamic imports resolve inside the mocked graph — which is also why it warms
 * the right copy of the closures for files that deliberately re-import
 * `../factions` after a `vi.mock`.
 */
beforeAll(async () => {
  // Import the index first: registration happens when a manifest module
  // evaluates, so this is what guarantees all eight are known.
  await import('../factions')
  const { preloadAllArchetypes } = await import('../factions/lazyArchetype')
  await preloadAllArchetypes()
})

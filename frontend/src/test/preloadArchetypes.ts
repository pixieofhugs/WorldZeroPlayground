import { afterEach, beforeAll } from 'vitest'

/**
 * Resolve every code-split faction archetype before tests run (#1045); static
 * render would otherwise see `null`.
 *
 * Imports live inside `beforeAll`, NOT module scope: setup files evaluate before
 * a test's `vi.mock`, so a top-level import would cache the real (unmocked)
 * graph for every test.
 */
beforeAll(async () => {
  // Index first: manifests register on evaluation.
  await import('../factions')
  const { preloadAllArchetypes } = await import('../factions/lazyArchetype')
  await preloadAllArchetypes()
  // /start copy is route-loaded in the app; tests render its cards directly.
  await (await import('../i18n')).loadOnboardingCopy()
})

// No `globals`, so RTL never auto-unmounts: a tree left mounted keeps its
// timers, which can fire after jsdom teardown ("window is not defined", #3887).
afterEach(async () => {
  if (typeof document !== 'undefined') (await import('@testing-library/react')).cleanup()
})

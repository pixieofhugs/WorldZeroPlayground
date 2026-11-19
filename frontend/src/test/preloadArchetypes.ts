import { beforeAll } from 'vitest'

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
  // /start and app copy are route-loaded in the app; tests render its cards directly.
  const i18nModule = await import('../i18n')
  await i18nModule.loadOnboardingCopy()
  await i18nModule.loadAppCopy()
})

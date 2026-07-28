/**
 * The load-time guard on the faction manifests (#1045).
 *
 * Every archetype is code-split by going through `lazyArchetype`. That is the
 * whole reason a new faction skin costs the initial payload nothing: the
 * manifest holds a loader, and the chunk is fetched only when that faction's
 * surface actually renders.
 *
 * One ordinary-looking edit undoes it for the entire app:
 *
 *     import CovenTaskDetail from '../pages/taskDetail/archetypes/CovenTaskDetail'
 *     // ...
 *     taskDetail: () => CovenTaskDetail,
 *
 * That is a *static* import. `factions/index.ts` imports all eight manifests, so
 * anything imported statically from one lands in the entry chunk — and it takes
 * everything that component imports with it. This is exactly how the app ended
 * up shipping all ~184 archetypes to a logged-out visitor on the marketing
 * homepage.
 *
 * The byte budget (`npm run budget`) would eventually notice, but only once the
 * damage is large enough to cross a threshold. This fails on the first one, and
 * says which surface did it.
 */
import { describe, it, expect } from 'vitest'

import { FACTION_MANIFESTS, SURFACE_KEYS } from '..'
import type { FactionManifest, FactionSurface } from '..'

/** A component built by `lazyArchetype` carries these; a plain import does not. */
function isDeferred(component: unknown): boolean {
  return (
    typeof component === 'function' &&
    typeof (component as { preload?: unknown }).preload === 'function'
  )
}

describe('faction manifests stay code-split', () => {
  for (const manifest of FACTION_MANIFESTS) {
    const claimed = SURFACE_KEYS.filter(
      (surface) => (manifest as FactionManifest)[surface as FactionSurface] !== undefined,
    )

    it(`${manifest.slug} declares ${claimed.length} surfaces, all through lazyArchetype`, () => {
      const eager = claimed.filter((surface) => {
        const thunk = (manifest as FactionManifest)[surface as FactionSurface] as () => unknown
        return !isDeferred(thunk())
      })

      expect(
        eager,
        `${manifest.slug} wires ${eager.join(', ')} to a component that is NOT code-split.\n` +
          `A manifest entry must be built with lazyArchetype:\n\n` +
          `    const X = lazyArchetype(() => import('../path/to/X'))\n` +
          `    // ...\n` +
          `    ${eager[0] ?? 'surface'}: () => X,\n\n` +
          `A plain \`import X from '...'\` here puts X — and everything it imports —\n` +
          `into the entry chunk for every visitor, including ones who never see this\n` +
          `faction. See docs/agents/load-time.md.`,
      ).toEqual([])
    })
  }

  it('covers every faction, so a new manifest cannot skip this guard', () => {
    expect(FACTION_MANIFESTS.length).toBeGreaterThan(0)
    for (const manifest of FACTION_MANIFESTS) expect(manifest.slug).toBeTruthy()
  })
})

/**
 * Load-time guard (#1045): every manifest entry goes through `lazyArchetype`.
 * One static `import X from '../pages/...'` in a manifest pulls X and its whole
 * tree into the entry chunk, since the index imports every manifest. The byte
 * budget only notices past a threshold; this fails on the first one.
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

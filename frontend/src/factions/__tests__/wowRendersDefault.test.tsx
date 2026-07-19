/**
 * Warriors of Whimsy's interim state (#784).
 *
 * Its lo-fi pink `.exe` identity moved wholesale to Cozy Coven, so `wow` now
 * registers no manifest and no theme. That is intended — a clean slate for the
 * gold redesign — but it opens a specific, quiet failure mode.
 *
 * The dangerous failure is NOT a crash. A faction that renders `Default` looks
 * fine. The failure is `factionName()` falling through to `names.na` and
 * silently labelling a real, populated, joinable faction "Unaffiliated" for
 * however long the redesign takes. Nothing else in the suite would notice:
 * there is no type error, no thrown key, no visual diff a build can see. So
 * this file asserts both halves together — falls back everywhere AND still has
 * words — because it is their combination that means "clean slate" rather than
 * "broken faction".
 *
 * DELETE THIS FILE when the gold identity ships and `wow` has a manifest again.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'

import { FACTION_MANIFESTS, surfaceMap, SURFACE_KEYS } from '..'
import type { FactionSurface } from '..'
import { pickVariant } from '../../utils/factionDispatch'
import {
  factionCssVar,
  factionColor,
  factionDescription,
  factionName,
  isKnownFaction,
} from '../../utils/factions'

function Sentinel() {
  return <div>default-sentinel</div>
}

describe('wow falls back to Default on every surface', () => {
  it('registers no manifest at all', () => {
    expect(FACTION_MANIFESTS.map((manifest) => manifest.slug)).not.toContain('wow')
  })

  for (const surface of SURFACE_KEYS) {
    it(`claims nothing on the ${surface} surface, so it gets the fallback`, () => {
      const map = surfaceMap(surface as FactionSurface)

      // Unclaimed: no bespoke component is registered for the slug...
      expect(map['wow'], `${surface} should be unclaimed by wow`).toBeUndefined()

      // ...so the dispatcher hands back the caller's Default, and it renders.
      const Resolved = pickVariant(map as Record<string, typeof Sentinel>, 'wow', Sentinel)
      expect(Resolved).toBe(Sentinel)
      expect(renderToStaticMarkup(<Resolved />)).toContain('default-sentinel')
    })
  }

  it('reads the neutral theme rather than a token that no longer exists', () => {
    // --faction-wow-* moved to --faction-coven-*. Resolving anywhere else would
    // emit a var() naming a declaration that is not in index.css: valid CSS,
    // lints clean, renders as nothing.
    expect(factionCssVar('wow')).toBe('var(--faction-default)')
    expect(factionCssVar('wow', 'card-bg')).toBe('var(--faction-default-card-bg)')
    expect(isKnownFaction('wow')).toBe(false)
    expect(factionColor('wow')).toBe(factionColor('na'))
  })
})

describe('wow still reads as a real faction', () => {
  it('resolves its own name, NOT the Unaffiliated fallback', () => {
    expect(factionName('wow')).toBe('Warriors of Whimsy')
    expect(factionName('wow')).not.toBe(factionName('na'))
  })

  it('resolves its own description, NOT the empty-description fallback', () => {
    const description = factionDescription('wow')
    expect(description).not.toBe(factionDescription('na'))
    expect(description).not.toBe(factionDescription('definitely_not_a_faction'))
    expect(description.length).toBeGreaterThan(0)
  })

  it('is distinguishable from Cozy Coven, which took its aesthetic', () => {
    // The rename is only sound if the two slugs are genuinely separate
    // identities. If these ever collide, one of them has swallowed the other.
    expect(factionName('coven')).not.toBe(factionName('wow'))
    expect(factionDescription('coven')).not.toBe(factionDescription('wow'))
  })
})

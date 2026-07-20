/**
 * Warriors of Whimsy is THEMED and PARTLY SKINNED (#784, #812, then #821).
 *
 * #784 moved its lo-fi pink `.exe` identity wholesale to Cozy Coven, leaving
 * `wow` with no manifest and no theme. #812 gave back a minimal yellow
 * `--faction-wow-*` block, so WOW rejoins the rainbow. #821 ships its FIRST
 * bespoke surfaces: the praxis card, its mobile twin, and the vote widget. Every
 * OTHER surface still falls through to `Default*` — WOW is themed-and-partly-
 * skinned, not fully dressed, and definitely not "broken faction".
 *
 * That split is fragile in BOTH directions, neither of which crashes:
 *
 *  - Register a component "helpfully" on an UNCLAIMED surface and WOW starts
 *    wearing a half-built skin nobody designed, most likely one borrowed from the
 *    faction that took its old one.
 *  - Let the theme lapse and `factionName()` falls through to `names.na`,
 *    silently labelling a real, populated, joinable faction "Unaffiliated".
 *
 * So this file pins the exact skinned set AND the theme AND the words together:
 * only the three redesign surfaces are claimed, the rest fall back, WOW resolves
 * its own hue, and it still has a name and description of its own.
 *
 * DELETE (or re-scope) THIS FILE when WOW's remaining surfaces ship.
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
  factionFill,
  factionName,
  isKnownFaction,
} from '../../utils/factions'

function Sentinel() {
  return <div>default-sentinel</div>
}

/** The three surfaces #821 skinned. Every other surface must fall back. */
const WOW_SKINNED: ReadonlySet<FactionSurface> = new Set([
  'praxisCard',
  'mobilePraxisCard',
  'vote',
])

describe('wow is partly skinned: three surfaces claimed, the rest fall back', () => {
  it('registers a manifest now (#821)', () => {
    expect(FACTION_MANIFESTS.map((manifest) => manifest.slug)).toContain('wow')
  })

  for (const surface of SURFACE_KEYS) {
    const claimed = WOW_SKINNED.has(surface as FactionSurface)
    it(`${claimed ? 'claims' : 'falls back on'} the ${surface} surface`, () => {
      const map = surfaceMap(surface as FactionSurface)

      if (claimed) {
        // A bespoke component is registered for the slug, so the dispatcher
        // hands it back rather than the caller's Default.
        expect(map['wow'], `${surface} should be claimed by wow`).toBeDefined()
        const Resolved = pickVariant(map as Record<string, typeof Sentinel>, 'wow', Sentinel)
        expect(Resolved).not.toBe(Sentinel)
        return
      }

      // Unclaimed: no component for the slug, so the caller's Default renders.
      expect(map['wow'], `${surface} should be unclaimed by wow`).toBeUndefined()
      const Resolved = pickVariant(map as Record<string, typeof Sentinel>, 'wow', Sentinel)
      expect(Resolved).toBe(Sentinel)
      expect(renderToStaticMarkup(<Resolved />)).toContain('default-sentinel')
    })
  }

  it('reads its OWN theme — the fallback is a skin fallback, not a colour one', () => {
    // Every var() named here has a real declaration in index.css (#812). A
    // slug pointed at a token that is not declared emits valid CSS, lints
    // clean, and renders as nothing — which is why this asserts the resolved
    // names rather than trusting CSS_KEY to be internally consistent.
    expect(factionCssVar('wow')).toBe('var(--faction-wow)')
    expect(factionCssVar('wow', 'card-bg')).toBe('var(--faction-wow-card-bg)')
    expect(factionCssVar('wow', 'on-fill')).toBe('var(--faction-wow-on-fill)')
  })

  it('is a known faction, so its members get coloured ornament', () => {
    // The predicate reads the mapped VALUE, not key presence (#749) — this is
    // the single assertion that separates #812's state from #784's.
    expect(isKnownFaction('wow')).toBe(true)
    expect(factionColor('wow')).not.toBe(factionColor('na'))
  })

  it('has a solid fill, not the unaffiliated spectrum', () => {
    // ADR-0039: a gradient is `na`'s identity. A real faction returns its hue
    // for every shape, with the paired AA ink on a pill.
    expect(factionFill('wow', 'bar')).toEqual({ background: 'var(--faction-wow)' })
    expect(factionFill('wow', 'dot')).toEqual({ background: 'var(--faction-wow)' })
    expect(factionFill('wow', 'pill')).toEqual({
      background: 'var(--faction-wow)',
      color: 'var(--faction-wow-on-fill)',
    })
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

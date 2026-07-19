/**
 * Warriors of Whimsy has a COLOUR but not a SKIN (#784, then #812).
 *
 * #784 moved its lo-fi pink `.exe` identity wholesale to Cozy Coven, leaving
 * `wow` with no manifest and no theme. #812 gave back only the second of those:
 * a minimal yellow `--faction-wow-*` block, so WOW rejoins the rainbow and its
 * members get faction-coloured ornament. The manifest is still empty, and that
 * is the settled intent — "most other aspects of them will be indistinguishable
 * from na until we ship the design".
 *
 * That split is the whole point of this file, and it is fragile in BOTH
 * directions, neither of which crashes:
 *
 *  - Register a component "helpfully" and WOW starts wearing a half-built skin
 *    nobody designed, most likely one borrowed from the faction that took its
 *    old one.
 *  - Let the theme lapse and `factionName()` falls through to `names.na`,
 *    silently labelling a real, populated, joinable faction "Unaffiliated".
 *
 * Neither produces a type error, a thrown key, or a visual diff a build can
 * see. So the three halves are asserted together — falls back on every surface,
 * AND resolves its own theme, AND still has words — because it is their
 * combination that means "colour, not skin" rather than "broken faction".
 *
 * DELETE THIS FILE when WOW's real design ships and it registers a manifest.
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

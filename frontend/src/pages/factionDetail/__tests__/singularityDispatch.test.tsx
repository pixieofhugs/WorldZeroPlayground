/**
 * Mobile faction-page Singularity dispatch (#526) — asserts the MOBILE registry
 * routes the Singularity faction page to its bespoke terminal skin, while other
 * slugs fall through to the Default mobile faction page.
 */
import { describe, it, expect } from 'vitest'
import { pickVariant } from '../../../utils/factionDispatch'
import { surfaceMap } from '../../../factions'
import DefaultFactionPage from '../mobileArchetypes/DefaultFactionPage'
import SingularityFactionPage from '../mobileArchetypes/SingularityFactionPage'

describe('mobile faction-page Singularity dispatch', () => {
  it('resolves singularity to the bespoke terminal faction page', () => {
    expect(pickVariant(surfaceMap('mobileFactionPage'), 'singularity', DefaultFactionPage)).toBe(SingularityFactionPage)
  })

  it('falls through to the Default mobile faction page for other slugs', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(surfaceMap('mobileFactionPage'), slug, DefaultFactionPage)).toBe(DefaultFactionPage)
    }
  })
})

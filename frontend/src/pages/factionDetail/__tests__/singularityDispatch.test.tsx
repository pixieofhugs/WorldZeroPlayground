/**
 * Mobile faction-page Singularity dispatch (#526) — asserts the MOBILE registry
 * routes the Singularity faction page to its bespoke terminal skin, while other
 * slugs fall through to the Default mobile faction page.
 */
import { describe, it, expect } from 'vitest'
import { pickVariant } from '../../../utils/factionDispatch'
import { MOBILE_ARCHETYPE_BY_SLUG } from '../../FactionDetail'
import DefaultFactionPage from '../mobileArchetypes/DefaultFactionPage'
import SingularityFactionPage from '../mobileArchetypes/SingularityFactionPage'

describe('mobile faction-page Singularity dispatch', () => {
  it('resolves singularity to the bespoke terminal faction page', () => {
    expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, 'singularity', DefaultFactionPage)).toBe(SingularityFactionPage)
  })

  it('falls through to the Default mobile faction page for other slugs', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, slug, DefaultFactionPage)).toBe(DefaultFactionPage)
    }
  })
})

/**
 * Mobile praxis-detail Singularity dispatch (#526) — asserts the MOBILE registry
 * routes a Singularity praxis to its bespoke terminal skin (distinct from the
 * desktop archetype), while other slugs fall through to the Default mobile skin.
 */
import { describe, it, expect } from 'vitest'
import { pickVariant } from '../../../utils/factionDispatch'
import { MOBILE_ARCHETYPE_BY_SLUG } from '../../PraxisDetail'
import DefaultMobilePraxisDetail from '../mobileArchetypes/DefaultPraxisDetail'
import SingularityMobilePraxisDetail from '../mobileArchetypes/SingularityPraxisDetail'
import SingularityDesktopPraxisDetail from '../archetypes/SingularityPraxisDetail'

describe('mobile praxis-detail Singularity dispatch', () => {
  it('resolves singularity to the bespoke terminal mobile skin', () => {
    const skin = pickVariant(MOBILE_ARCHETYPE_BY_SLUG, 'singularity', DefaultMobilePraxisDetail)
    expect(skin).toBe(SingularityMobilePraxisDetail)
    expect(skin).not.toBe(SingularityDesktopPraxisDetail)
  })

  it('falls through to the Default mobile skin for other slugs', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, slug, DefaultMobilePraxisDetail)).toBe(DefaultMobilePraxisDetail)
    }
  })
})

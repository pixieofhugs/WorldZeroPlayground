/**
 * Mobile praxis-detail Singularity dispatch (#526) — asserts the MOBILE registry
 * routes a Singularity praxis to its bespoke terminal skin (distinct from the
 * desktop archetype), while other slugs fall through to the Default mobile skin.
 */
import { describe, it, expect } from 'vitest'
import { pickVariant } from '../../../utils/factionDispatch'
import { surfaceMap } from '../../../factions'
import DefaultMobilePraxisDetail from '../mobileArchetypes/DefaultPraxisDetail'
import SingularityMobilePraxisDetail from '../mobileArchetypes/SingularityPraxisDetail'
import SingularityDesktopPraxisDetail from '../archetypes/SingularityPraxisDetail'

describe('mobile praxis-detail Singularity dispatch', () => {
  it('resolves singularity to the bespoke terminal mobile skin', () => {
    const skin = pickVariant(surfaceMap('mobilePraxisDetail'), 'singularity', DefaultMobilePraxisDetail)
    expect(skin).toBe(SingularityMobilePraxisDetail)
    expect(skin).not.toBe(SingularityDesktopPraxisDetail)
  })

  it('falls through to the Default mobile skin for other slugs', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(surfaceMap('mobilePraxisDetail'), slug, DefaultMobilePraxisDetail)).toBe(DefaultMobilePraxisDetail)
    }
  })
})

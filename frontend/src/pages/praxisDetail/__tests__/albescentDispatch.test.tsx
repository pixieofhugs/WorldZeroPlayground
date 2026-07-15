/**
 * Mobile praxis-detail Albescent dispatch (#528). Asserts the mobile registry
 * resolves an `albescent`-task praxis to the Record's filed-account skin, that
 * other factions fall through to the Default mobile detail, and the desktop
 * archetype is untouched.
 */
import { describe, it, expect } from 'vitest'
import { MOBILE_ARCHETYPE_BY_SLUG, ARCHETYPE_BY_SLUG } from '../../PraxisDetail'
import { pickVariant } from '../../../utils/factionDispatch'
import DefaultMobilePraxisDetail from '../mobileArchetypes/DefaultPraxisDetail'
import AlbescentMobilePraxisDetail from '../mobileArchetypes/AlbescentPraxisDetail'
import AlbescentDesktopPraxisDetail from '../archetypes/AlbescentPraxisDetail'

describe('mobile praxis-detail Albescent dispatch', () => {
  it('mobile + an Albescent praxis resolves to the bespoke Albescent mobile skin', () => {
    expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, 'albescent', DefaultMobilePraxisDetail)).toBe(
      AlbescentMobilePraxisDetail,
    )
  })

  it('mobile + any other slug falls through to the Default mobile skin', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, slug, DefaultMobilePraxisDetail)).toBe(
        DefaultMobilePraxisDetail,
      )
    }
  })

  it('desktop keeps its own Albescent archetype, never the mobile skin', () => {
    const desktop = pickVariant(ARCHETYPE_BY_SLUG, 'albescent', DefaultMobilePraxisDetail)
    expect(desktop).toBe(AlbescentDesktopPraxisDetail)
    expect(desktop).not.toBe(AlbescentMobilePraxisDetail)
  })
})

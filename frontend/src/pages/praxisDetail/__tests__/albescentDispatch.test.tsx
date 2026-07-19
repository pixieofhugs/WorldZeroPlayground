/**
 * Mobile praxis-detail Albescent dispatch (#528). Asserts the mobile registry
 * resolves an `albescent`-task praxis to the Record's filed-account skin, that
 * other factions fall through to the Default mobile detail, and the desktop
 * archetype is untouched.
 */
import { describe, it, expect } from 'vitest'
import { pickVariant } from '../../../utils/factionDispatch'
import { surfaceMap } from '../../../factions'
import DefaultMobilePraxisDetail from '../mobileArchetypes/DefaultPraxisDetail'
import AlbescentMobilePraxisDetail from '../mobileArchetypes/AlbescentPraxisDetail'
import AlbescentDesktopPraxisDetail from '../archetypes/AlbescentPraxisDetail'

describe('mobile praxis-detail Albescent dispatch', () => {
  it('mobile + an Albescent praxis resolves to the bespoke Albescent mobile skin', () => {
    expect(pickVariant(surfaceMap('mobilePraxisDetail'), 'albescent', DefaultMobilePraxisDetail)).toBe(
      AlbescentMobilePraxisDetail,
    )
  })

  it('mobile + any other slug falls through to the Default mobile skin', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(surfaceMap('mobilePraxisDetail'), slug, DefaultMobilePraxisDetail)).toBe(
        DefaultMobilePraxisDetail,
      )
    }
  })

  it('desktop keeps its own Albescent archetype, never the mobile skin', () => {
    const desktop = pickVariant(surfaceMap('praxisDetail'), 'albescent', DefaultMobilePraxisDetail)
    expect(desktop).toBe(AlbescentDesktopPraxisDetail)
    expect(desktop).not.toBe(AlbescentMobilePraxisDetail)
  })
})

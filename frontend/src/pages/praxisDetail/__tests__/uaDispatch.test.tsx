/**
 * Mobile praxis-detail UA dispatch (#525). Asserts the mobile registry resolves a
 * `ua`-task praxis to the bespoke UA skin, that other factions fall
 * through to the Default mobile detail, and the desktop archetype is untouched.
 */
import { describe, it, expect } from 'vitest'
import { pickVariant } from '../../../utils/factionDispatch'
import { surfaceMap } from '../../../factions'
import DefaultMobilePraxisDetail from '../mobileArchetypes/DefaultPraxisDetail'
import UAMobilePraxisDetail from '../mobileArchetypes/UaPraxisDetail'
import UADesktopPraxisDetail from '../archetypes/UaPraxisDetail'

describe('mobile praxis-detail UA dispatch', () => {
  it('mobile + a UA praxis resolves to the bespoke UA mobile skin', () => {
    expect(pickVariant(surfaceMap('mobilePraxisDetail'), 'ua', DefaultMobilePraxisDetail)).toBe(
      UAMobilePraxisDetail,
    )
  })

  it('mobile + any other slug falls through to the Default mobile skin', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(surfaceMap('mobilePraxisDetail'), slug, DefaultMobilePraxisDetail)).toBe(
        DefaultMobilePraxisDetail,
      )
    }
  })

  it('desktop keeps its own UA archetype, never the mobile skin', () => {
    const desktop = pickVariant(surfaceMap('praxisDetail'), 'ua', DefaultMobilePraxisDetail)
    expect(desktop).toBe(UADesktopPraxisDetail)
    expect(desktop).not.toBe(UAMobilePraxisDetail)
  })
})

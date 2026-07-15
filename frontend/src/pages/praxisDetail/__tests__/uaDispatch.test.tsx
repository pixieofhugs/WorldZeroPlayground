/**
 * Mobile praxis-detail UA dispatch (#525). Asserts the mobile registry resolves a
 * `ua`-task praxis to the gilt-salon acquisition skin, that other factions fall
 * through to the Default mobile detail, and the desktop archetype is untouched.
 */
import { describe, it, expect } from 'vitest'
import { MOBILE_ARCHETYPE_BY_SLUG, ARCHETYPE_BY_SLUG } from '../../PraxisDetail'
import { pickVariant } from '../../../utils/factionDispatch'
import DefaultMobilePraxisDetail from '../mobileArchetypes/DefaultPraxisDetail'
import UAMobilePraxisDetail from '../mobileArchetypes/UaPraxisDetail'
import UADesktopPraxisDetail from '../archetypes/UAPraxisDetail'

describe('mobile praxis-detail UA dispatch', () => {
  it('mobile + a UA praxis resolves to the bespoke UA mobile skin', () => {
    expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, 'ua', DefaultMobilePraxisDetail)).toBe(
      UAMobilePraxisDetail,
    )
  })

  it('mobile + any other slug falls through to the Default mobile skin', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, slug, DefaultMobilePraxisDetail)).toBe(
        DefaultMobilePraxisDetail,
      )
    }
  })

  it('desktop keeps its own UA archetype, never the mobile skin', () => {
    const desktop = pickVariant(ARCHETYPE_BY_SLUG, 'ua', DefaultMobilePraxisDetail)
    expect(desktop).toBe(UADesktopPraxisDetail)
    expect(desktop).not.toBe(UAMobilePraxisDetail)
  })
})

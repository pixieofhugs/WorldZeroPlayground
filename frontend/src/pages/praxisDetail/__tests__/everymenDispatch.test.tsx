/**
 * Mobile praxis-detail Everymen dispatch (#529). Asserts the mobile registry
 * resolves an `everymen`-task praxis to the union work-report skin, that other
 * factions fall through to the Default mobile detail, and the desktop archetype
 * is untouched.
 */
import { describe, it, expect } from 'vitest'
import { pickVariant } from '../../../utils/factionDispatch'
import { surfaceMap } from '../../../factions'
import DefaultMobilePraxisDetail from '../mobileArchetypes/DefaultPraxisDetail'
import EverymenMobilePraxisDetail from '../mobileArchetypes/EverymenPraxisDetail'
import EverymenDesktopPraxisDetail from '../archetypes/EverymenPraxisDetail'

describe('mobile praxis-detail Everymen dispatch', () => {
  it('mobile + an Everymen praxis resolves to the bespoke Everymen mobile skin', () => {
    expect(pickVariant(surfaceMap('mobilePraxisDetail'), 'everymen', DefaultMobilePraxisDetail)).toBe(
      EverymenMobilePraxisDetail,
    )
  })

  it('mobile + any other slug falls through to the Default mobile skin', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(surfaceMap('mobilePraxisDetail'), slug, DefaultMobilePraxisDetail)).toBe(
        DefaultMobilePraxisDetail,
      )
    }
  })

  it('desktop keeps its own Everymen archetype, never the mobile skin', () => {
    const desktop = pickVariant(surfaceMap('praxisDetail'), 'everymen', DefaultMobilePraxisDetail)
    expect(desktop).toBe(EverymenDesktopPraxisDetail)
    expect(desktop).not.toBe(EverymenMobilePraxisDetail)
  })
})

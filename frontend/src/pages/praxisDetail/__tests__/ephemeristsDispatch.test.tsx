/**
 * Mobile praxis-detail Ephemerists dispatch (#527). Asserts the parallel mobile
 * registry resolves an `ephemerists` task-faction praxis to the vellum-codex
 * praxis-detail skin, and that every other faction (and null) falls through to
 * the Default mobile praxis-detail skin.
 */
import { describe, it, expect } from 'vitest'
import { pickVariant } from '../../../utils/factionDispatch'
import { surfaceMap } from '../../../factions'
import DefaultMobilePraxisDetail from '../mobileArchetypes/DefaultPraxisDetail'
import EphemeristsMobilePraxisDetail from '../mobileArchetypes/EphemeristsPraxisDetail'

describe('mobile praxis-detail Ephemerists dispatch', () => {
  it('mobile + an Ephemerists praxis resolves to the bespoke codex skin', () => {
    expect(pickVariant(surfaceMap('mobilePraxisDetail'), 'ephemerists', DefaultMobilePraxisDetail)).toBe(
      EphemeristsMobilePraxisDetail,
    )
  })

  it('mobile + any other slug falls through to the Default praxis-detail skin', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(surfaceMap('mobilePraxisDetail'), slug, DefaultMobilePraxisDetail)).not.toBe(
        EphemeristsMobilePraxisDetail,
      )
    }
  })
})

/**
 * Mobile composer Ephemerists dispatch (#527). Asserts the mobile registry
 * resolves an `ephemerists` task to the "Seal & Enter" codex composer, and that
 * every other faction falls through to the Default mobile composer.
 */
import { describe, it, expect } from 'vitest'
import { pickVariant } from '../../../../utils/factionDispatch'
import { surfaceMap } from '../../../../factions'
import DefaultMobileEditPraxis from '../DefaultEditPraxis'
import EphemeristsMobileEditPraxis from '../EphemeristsComposer'

describe('mobile composer Ephemerists dispatch', () => {
  it('mobile + an Ephemerists task resolves to the bespoke codex composer', () => {
    expect(pickVariant(surfaceMap('mobileEditPraxis'), 'ephemerists', DefaultMobileEditPraxis)).toBe(
      EphemeristsMobileEditPraxis,
    )
  })

  it('mobile + any other slug falls through to the Default composer', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(surfaceMap('mobileEditPraxis'), slug, DefaultMobileEditPraxis)).not.toBe(
        EphemeristsMobileEditPraxis,
      )
    }
  })
})

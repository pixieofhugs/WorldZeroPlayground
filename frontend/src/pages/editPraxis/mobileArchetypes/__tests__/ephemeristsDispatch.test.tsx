/**
 * Mobile composer Ephemerists dispatch (#527). Asserts the mobile registry
 * resolves an `ephemerists` task to the "Seal & Enter" codex composer, and that
 * every other faction falls through to the Default mobile composer.
 */
import { describe, it, expect } from 'vitest'
import { MOBILE_ARCHETYPE_BY_SLUG } from '../../../EditPraxis'
import { pickVariant } from '../../../../utils/factionDispatch'
import DefaultMobileEditPraxis from '../DefaultEditPraxis'
import EphemeristsMobileEditPraxis from '../EphemeristsComposer'

describe('mobile composer Ephemerists dispatch', () => {
  it('mobile + an Ephemerists task resolves to the bespoke codex composer', () => {
    expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, 'ephemerists', DefaultMobileEditPraxis)).toBe(
      EphemeristsMobileEditPraxis,
    )
  })

  it('mobile + any other slug falls through to the Default composer', () => {
    for (const slug of ['snide', 'wow', 'na', null]) {
      expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, slug, DefaultMobileEditPraxis)).not.toBe(
        EphemeristsMobileEditPraxis,
      )
    }
  })
})

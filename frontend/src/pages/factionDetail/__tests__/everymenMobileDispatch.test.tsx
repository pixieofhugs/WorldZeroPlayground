/**
 * Mobile faction-page Everymen dispatch (#529). Asserts the mobile registry
 * resolves the `everymen` faction to the union-hall page skin, and that every
 * other faction (and null) falls through to the single-column DefaultFactionPage.
 */
import { describe, it, expect } from 'vitest'
import { MOBILE_ARCHETYPE_BY_SLUG } from '../../FactionDetail'
import { pickVariant } from '../../../utils/factionDispatch'
import DefaultFactionPage from '../mobileArchetypes/DefaultFactionPage'
import EverymenFactionPage from '../mobileArchetypes/EverymenFactionPage'

describe('mobile faction-page Everymen dispatch', () => {
  it('mobile + the Everymen faction resolves to the bespoke Everymen page', () => {
    expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, 'everymen', DefaultFactionPage)).toBe(EverymenFactionPage)
  })

  it('every other faction falls through to the Default mobile page', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, slug, DefaultFactionPage)).toBe(DefaultFactionPage)
    }
  })
})

/**
 * Mobile faction-page UA dispatch (#525). Asserts the #518 mobile registry
 * resolves the `ua` faction to the gilt-salon page skin, and that every other
 * faction (and null) falls through to the single-column DefaultFactionPage.
 * Mirrors the other surfaces' ua-dispatch tests.
 */
import { describe, it, expect } from 'vitest'
import { MOBILE_ARCHETYPE_BY_SLUG } from '../../FactionDetail'
import { pickVariant } from '../../../utils/factionDispatch'
import DefaultFactionPage from '../mobileArchetypes/DefaultFactionPage'
import UaFactionPage from '../mobileArchetypes/UaFactionPage'

describe('mobile faction-page UA dispatch', () => {
  it('mobile + the UA faction resolves to the bespoke UA page', () => {
    expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, 'ua', DefaultFactionPage)).toBe(UaFactionPage)
  })

  it('every other faction falls through to the Default mobile page', () => {
    for (const slug of ['snide', 'singularity', 'everymen', 'na', null]) {
      expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, slug, DefaultFactionPage)).toBe(DefaultFactionPage)
    }
  })
})

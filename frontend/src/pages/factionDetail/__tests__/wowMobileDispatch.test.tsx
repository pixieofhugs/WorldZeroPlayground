/**
 * Mobile faction-page WOW dispatch (#531). Asserts the mobile registry resolves
 * the `wow` faction to the scrapbook coven page skin, and that every other
 * faction (and null) falls through to the single-column DefaultFactionPage.
 * Mirrors the other surfaces' wow-dispatch tests.
 */
import { describe, it, expect } from 'vitest'
import { MOBILE_ARCHETYPE_BY_SLUG } from '../../FactionDetail'
import { pickVariant } from '../../../utils/factionDispatch'
import DefaultFactionPage from '../mobileArchetypes/DefaultFactionPage'
import WowFactionPage from '../mobileArchetypes/WowFactionPage'

describe('mobile faction-page WOW dispatch', () => {
  it('mobile + the WOW faction resolves to the bespoke WOW page', () => {
    expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, 'wow', DefaultFactionPage)).toBe(WowFactionPage)
  })

  it('every other faction falls through to the Default mobile page', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, slug, DefaultFactionPage)).toBe(DefaultFactionPage)
    }
  })
})

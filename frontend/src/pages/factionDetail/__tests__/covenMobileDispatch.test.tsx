/**
 * Mobile faction-page COVEN dispatch (#531). Asserts the mobile registry resolves
 * the `wow` faction to the scrapbook coven page skin, and that every other
 * faction (and null) falls through to the single-column DefaultFactionPage.
 * Mirrors the other surfaces' wow-dispatch tests.
 */
import { describe, it, expect } from 'vitest'
import { pickVariant } from '../../../utils/factionDispatch'
import { surfaceMap } from '../../../factions'
import DefaultFactionPage from '../mobileArchetypes/DefaultFactionPage'
import CovenFactionPage from '../mobileArchetypes/CovenFactionPage'

describe('mobile faction-page COVEN dispatch', () => {
  it('mobile + the COVEN faction resolves to the bespoke COVEN page', () => {
    expect(pickVariant(surfaceMap('mobileFactionPage'), 'wow', DefaultFactionPage)).toBe(CovenFactionPage)
  })

  it('every other faction falls through to the Default mobile page', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(surfaceMap('mobileFactionPage'), slug, DefaultFactionPage)).toBe(DefaultFactionPage)
    }
  })
})

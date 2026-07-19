/**
 * Mobile faction-page Albescent dispatch (#528). Asserts the mobile registry
 * resolves the `albescent` faction to the Record page skin, and that every other
 * faction (and null) falls through to the single-column DefaultFactionPage.
 * Mirrors the other surfaces' albescent-dispatch tests.
 */
import { describe, it, expect } from 'vitest'
import { pickVariant } from '../../../utils/factionDispatch'
import { surfaceMap } from '../../../factions'
import DefaultFactionPage from '../mobileArchetypes/DefaultFactionPage'
import AlbescentFactionPage from '../mobileArchetypes/AlbescentFactionPage'

describe('mobile faction-page Albescent dispatch', () => {
  it('mobile + the Albescent faction resolves to the bespoke Albescent page', () => {
    expect(pickVariant(surfaceMap('mobileFactionPage'), 'albescent', DefaultFactionPage)).toBe(AlbescentFactionPage)
  })

  it('every other faction falls through to the Default mobile page', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(surfaceMap('mobileFactionPage'), slug, DefaultFactionPage)).toBe(DefaultFactionPage)
    }
  })
})

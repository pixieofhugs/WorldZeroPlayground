/**
 * Mobile faction-page Ephemerists dispatch (#527). Asserts FactionDetail's
 * parallel mobile registry resolves the `ephemerists` slug to the vellum-codex
 * faction page, and that every other faction (and null) falls through to the
 * single-column Default mobile faction page.
 */
import { describe, it, expect } from 'vitest'
import { MOBILE_ARCHETYPE_BY_SLUG } from '../../FactionDetail'
import { pickVariant } from '../../../utils/factionDispatch'
import DefaultFactionPage from '../mobileArchetypes/DefaultFactionPage'
import EphemeristsFactionPage from '../mobileArchetypes/EphemeristsFactionPage'

describe('mobile faction-page Ephemerists dispatch', () => {
  it('mobile + the Ephemerists slug resolves to the bespoke codex faction page', () => {
    expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, 'ephemerists', DefaultFactionPage)).toBe(
      EphemeristsFactionPage,
    )
  })

  it('mobile + any other slug falls through to the Default faction page', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, slug, DefaultFactionPage)).toBe(DefaultFactionPage)
    }
  })
})

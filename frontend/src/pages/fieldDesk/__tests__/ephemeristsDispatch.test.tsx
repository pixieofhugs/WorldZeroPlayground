/**
 * Mobile FieldDesk-home Ephemerists dispatch (#527). Asserts the parallel mobile
 * registry resolves an `ephemerists` carried life to the vellum-codex home skin,
 * and that an unregistered faction (and null) still falls through to the Default
 * mobile home. Mirrors the UA dispatch test.
 */
import { describe, it, expect } from 'vitest'
import { pickVariant } from '../../../utils/factionDispatch'
import { surfaceMap } from '../../../factions'
import DefaultFieldDesk from '../mobileArchetypes/DefaultFieldDesk'
import EphemeristsHome from '../mobileArchetypes/EphemeristsHome'

describe('mobile FieldDesk-home Ephemerists dispatch', () => {
  it('mobile + an Ephemerists life resolves to the bespoke codex home skin', () => {
    expect(pickVariant(surfaceMap('mobileFieldDesk'), 'ephemerists', DefaultFieldDesk)).toBe(EphemeristsHome)
  })

  it('mobile + any other slug falls through to the Default home skin', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(surfaceMap('mobileFieldDesk'), slug, DefaultFieldDesk)).toBe(DefaultFieldDesk)
    }
  })
})

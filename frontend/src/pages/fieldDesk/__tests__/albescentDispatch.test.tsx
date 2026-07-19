/**
 * Mobile FieldDesk-home Albescent dispatch (#528). Asserts the parallel mobile
 * registry resolves an `albescent` carried life to the Record's desk skin, and
 * that an unregistered faction (and null) still falls through to the Default
 * mobile home. Mirrors the UA dispatch test.
 */
import { describe, it, expect } from 'vitest'
import { pickVariant } from '../../../utils/factionDispatch'
import { surfaceMap } from '../../../factions'
import DefaultFieldDesk from '../mobileArchetypes/DefaultFieldDesk'
import AlbescentHome from '../mobileArchetypes/AlbescentHome'

describe('mobile FieldDesk-home Albescent dispatch', () => {
  it('mobile + an Albescent life resolves to the bespoke Albescent home skin', () => {
    expect(pickVariant(surfaceMap('mobileFieldDesk'), 'albescent', DefaultFieldDesk)).toBe(AlbescentHome)
  })

  it('mobile + any other slug falls through to the Default home skin', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(surfaceMap('mobileFieldDesk'), slug, DefaultFieldDesk)).toBe(DefaultFieldDesk)
    }
  })
})

/**
 * Mobile FieldDesk-home Everymen dispatch (#529). Asserts the parallel mobile
 * registry resolves an `everymen` carried life to the union-broadsheet home skin,
 * and that an unregistered faction (and null) still falls through to the Default
 * mobile home. Mirrors the UA dispatch test.
 */
import { describe, it, expect } from 'vitest'
import { MOBILE_ARCHETYPE_BY_SLUG } from '../../FieldDesk'
import { pickVariant } from '../../../utils/factionDispatch'
import DefaultFieldDesk from '../mobileArchetypes/DefaultFieldDesk'
import EverymenHome from '../mobileArchetypes/EverymenHome'

describe('mobile FieldDesk-home Everymen dispatch', () => {
  it('mobile + an Everymen life resolves to the bespoke Everymen home skin', () => {
    expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, 'everymen', DefaultFieldDesk)).toBe(EverymenHome)
  })

  it('mobile + any other slug falls through to the Default home skin', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, slug, DefaultFieldDesk)).toBe(DefaultFieldDesk)
    }
  })
})

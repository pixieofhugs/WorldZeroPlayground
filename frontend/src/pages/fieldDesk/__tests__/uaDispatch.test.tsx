/**
 * Mobile FieldDesk-home UA dispatch (#525). Asserts the parallel mobile registry
 * resolves a `ua` carried life to the gilt-salon home skin, and that an
 * unregistered faction (and null) still falls through to the Default mobile home.
 * Mirrors the taskDetail mobileArchetypeDispatch pattern.
 */
import { describe, it, expect } from 'vitest'
import { MOBILE_ARCHETYPE_BY_SLUG } from '../../FieldDesk'
import { pickVariant } from '../../../utils/factionDispatch'
import DefaultFieldDesk from '../mobileArchetypes/DefaultFieldDesk'
import UaHome from '../mobileArchetypes/UaHome'

describe('mobile FieldDesk-home UA dispatch', () => {
  it('mobile + a UA life resolves to the bespoke UA home skin', () => {
    expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, 'ua', DefaultFieldDesk)).toBe(UaHome)
  })

  it('mobile + any other slug falls through to the Default home skin', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, slug, DefaultFieldDesk)).toBe(DefaultFieldDesk)
    }
  })
})

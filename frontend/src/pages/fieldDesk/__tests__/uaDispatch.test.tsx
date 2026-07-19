/**
 * Mobile FieldDesk-home UA dispatch (#525). Asserts the parallel mobile registry
 * resolves a `ua` carried life to the gilt-salon home skin, and that an
 * unregistered faction (and null) still falls through to the Default mobile home.
 * Mirrors the taskDetail mobileArchetypeDispatch pattern.
 */
import { describe, it, expect } from 'vitest'
import { pickVariant } from '../../../utils/factionDispatch'
import { surfaceMap } from '../../../factions'
import DefaultFieldDesk from '../mobileArchetypes/DefaultFieldDesk'
import UaHome from '../mobileArchetypes/UaHome'

describe('mobile FieldDesk-home UA dispatch', () => {
  it('mobile + a UA life resolves to the bespoke UA home skin', () => {
    expect(pickVariant(surfaceMap('mobileFieldDesk'), 'ua', DefaultFieldDesk)).toBe(UaHome)
  })

  it('mobile + any other slug falls through to the Default home skin', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(surfaceMap('mobileFieldDesk'), slug, DefaultFieldDesk)).toBe(DefaultFieldDesk)
    }
  })
})

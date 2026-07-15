/**
 * Mobile task-detail Ephemerists dispatch (#527). Asserts the parallel mobile
 * registry resolves an `ephemerists` task to the vellum-codex task-detail skin,
 * and that every other faction (and null) falls through to the Default mobile
 * task-detail skin.
 */
import { describe, it, expect } from 'vitest'
import { MOBILE_ARCHETYPE_BY_SLUG } from '../../TaskDetail'
import { pickVariant } from '../../../utils/factionDispatch'
import DefaultMobileTaskDetail from '../mobileArchetypes/DefaultTaskDetail'
import EphemeristsMobileTaskDetail from '../mobileArchetypes/EphemeristsTaskDetail'

describe('mobile task-detail Ephemerists dispatch', () => {
  it('mobile + an Ephemerists task resolves to the bespoke codex task-detail skin', () => {
    expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, 'ephemerists', DefaultMobileTaskDetail)).toBe(
      EphemeristsMobileTaskDetail,
    )
  })

  it('mobile + any other slug falls through to the Default task-detail skin', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, slug, DefaultMobileTaskDetail)).not.toBe(
        EphemeristsMobileTaskDetail,
      )
    }
  })
})

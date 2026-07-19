/**
 * Mobile task-detail Ephemerists dispatch (#527). Asserts the parallel mobile
 * registry resolves an `ephemerists` task to the vellum-codex task-detail skin,
 * and that every other faction (and null) falls through to the Default mobile
 * task-detail skin.
 */
import { describe, it, expect } from 'vitest'
import { pickVariant } from '../../../utils/factionDispatch'
import { surfaceMap } from '../../../factions'
import DefaultMobileTaskDetail from '../mobileArchetypes/DefaultTaskDetail'
import EphemeristsMobileTaskDetail from '../mobileArchetypes/EphemeristsTaskDetail'

describe('mobile task-detail Ephemerists dispatch', () => {
  it('mobile + an Ephemerists task resolves to the bespoke codex task-detail skin', () => {
    expect(pickVariant(surfaceMap('mobileTaskDetail'), 'ephemerists', DefaultMobileTaskDetail)).toBe(
      EphemeristsMobileTaskDetail,
    )
  })

  it('mobile + any other slug falls through to the Default task-detail skin', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(surfaceMap('mobileTaskDetail'), slug, DefaultMobileTaskDetail)).not.toBe(
        EphemeristsMobileTaskDetail,
      )
    }
  })
})

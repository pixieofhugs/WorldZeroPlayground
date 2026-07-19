/**
 * Mobile task-detail Albescent dispatch (#528). Asserts the mobile registry
 * resolves an `albescent` task to the Record's correspondence skin, that other
 * factions fall through to the Default mobile detail, and that the desktop
 * archetype is untouched.
 */
import { describe, it, expect } from 'vitest'
import { pickVariant } from '../../../utils/factionDispatch'
import { surfaceMap } from '../../../factions'
import DefaultMobileTaskDetail from '../mobileArchetypes/DefaultTaskDetail'
import AlbescentMobileTaskDetail from '../mobileArchetypes/AlbescentTaskDetail'
import AlbescentDesktopTaskDetail from '../archetypes/AlbescentTaskDetail'

describe('mobile task-detail Albescent dispatch', () => {
  it('mobile + an Albescent task resolves to the bespoke Albescent mobile skin', () => {
    expect(pickVariant(surfaceMap('mobileTaskDetail'), 'albescent', DefaultMobileTaskDetail)).toBe(
      AlbescentMobileTaskDetail,
    )
  })

  it('mobile + any other slug falls through to the Default mobile skin', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(surfaceMap('mobileTaskDetail'), slug, DefaultMobileTaskDetail)).toBe(
        DefaultMobileTaskDetail,
      )
    }
  })

  it('desktop keeps its own Albescent archetype, never the mobile skin', () => {
    const desktop = pickVariant(surfaceMap('taskDetail'), 'albescent', DefaultMobileTaskDetail)
    expect(desktop).toBe(AlbescentDesktopTaskDetail)
    expect(desktop).not.toBe(AlbescentMobileTaskDetail)
  })
})

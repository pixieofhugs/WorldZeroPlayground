/**
 * Mobile task-browse Ephemerists dispatch (#527). The browse page shows every
 * faction's tasks, so — unlike detail — it dispatches on the VIEWING life's
 * faction. This asserts an `ephemerists` viewer resolves to the codex browse skin
 * while every other viewer (and logged-out null) falls through to the Default
 * mobile browse skin.
 */
import { describe, it, expect } from 'vitest'
import { MOBILE_ARCHETYPE_BY_SLUG } from '../../Tasks'
import { pickVariant } from '../../../utils/factionDispatch'
import DefaultTasks from '../mobileArchetypes/DefaultTasks'
import EphemeristsTaskList from '../mobileArchetypes/EphemeristsTaskList'

describe('mobile task-browse Ephemerists dispatch', () => {
  it('mobile + an Ephemerists viewer resolves to the bespoke codex browse skin', () => {
    expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, 'ephemerists', DefaultTasks)).toBe(EphemeristsTaskList)
  })

  it('mobile + any other viewer falls through to the Default browse skin', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, slug, DefaultTasks)).toBe(DefaultTasks)
    }
  })
})

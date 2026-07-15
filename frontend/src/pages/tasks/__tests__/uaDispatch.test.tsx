/**
 * Mobile task-browse UA dispatch (#525). The browse page shows every faction's
 * tasks, so — unlike detail — it dispatches on the VIEWING life's faction. This
 * asserts a `ua` viewer resolves to the gilt-salon browse skin while every other
 * viewer (and logged-out null) falls through to the Default mobile browse skin.
 */
import { describe, it, expect } from 'vitest'
import { MOBILE_ARCHETYPE_BY_SLUG } from '../../Tasks'
import { pickVariant } from '../../../utils/factionDispatch'
import DefaultTasks from '../mobileArchetypes/DefaultTasks'
import UaTaskList from '../mobileArchetypes/UaTaskList'

describe('mobile task-browse UA dispatch', () => {
  it('mobile + a UA viewer resolves to the bespoke UA browse skin', () => {
    expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, 'ua', DefaultTasks)).toBe(UaTaskList)
  })

  it('mobile + any other viewer falls through to the Default browse skin', () => {
    for (const slug of ['snide', 'singularity', 'na', null]) {
      expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, slug, DefaultTasks)).toBe(DefaultTasks)
    }
  })
})

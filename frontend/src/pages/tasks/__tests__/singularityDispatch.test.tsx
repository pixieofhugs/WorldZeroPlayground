/**
 * Mobile task-browse Singularity dispatch (#526) — asserts the registry routes a
 * Singularity node browsing tasks to its bespoke terminal browse skin, and that
 * an unregistered viewer slug still falls through to the Default browse skin.
 */
import { describe, it, expect } from 'vitest'
import { pickVariant } from '../../../utils/factionDispatch'
import { MOBILE_ARCHETYPE_BY_SLUG } from '../../Tasks'
import DefaultTasks from '../mobileArchetypes/DefaultTasks'
import SingularityTaskList from '../mobileArchetypes/SingularityTaskList'

describe('mobile task-browse Singularity dispatch', () => {
  it('resolves singularity to the bespoke terminal browse skin', () => {
    expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, 'singularity', DefaultTasks)).toBe(SingularityTaskList)
  })

  it('falls through to the Default browse skin for other slugs', () => {
    for (const slug of ['na', 'snide', null]) {
      expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, slug, DefaultTasks)).toBe(DefaultTasks)
    }
  })
})

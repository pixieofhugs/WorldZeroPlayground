/**
 * Mobile task-detail Singularity dispatch (#526) — asserts the MOBILE registry
 * routes a Singularity task to its bespoke terminal skin (distinct from the
 * desktop archetype), while other slugs fall through to the Default mobile skin.
 */
import { describe, it, expect } from 'vitest'
import { pickVariant } from '../../../utils/factionDispatch'
import { MOBILE_ARCHETYPE_BY_SLUG } from '../../TaskDetail'
import DefaultMobileTaskDetail from '../mobileArchetypes/DefaultTaskDetail'
import SingularityMobileTaskDetail from '../mobileArchetypes/SingularityTaskDetail'
import SingularityDesktopTaskDetail from '../archetypes/SingularityTaskDetail'

describe('mobile task-detail Singularity dispatch', () => {
  it('resolves singularity to the bespoke terminal mobile skin', () => {
    const skin = pickVariant(MOBILE_ARCHETYPE_BY_SLUG, 'singularity', DefaultMobileTaskDetail)
    expect(skin).toBe(SingularityMobileTaskDetail)
    expect(skin).not.toBe(SingularityDesktopTaskDetail)
  })

  it('falls through to the Default mobile skin for other slugs', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, slug, DefaultMobileTaskDetail)).toBe(DefaultMobileTaskDetail)
    }
  })
})

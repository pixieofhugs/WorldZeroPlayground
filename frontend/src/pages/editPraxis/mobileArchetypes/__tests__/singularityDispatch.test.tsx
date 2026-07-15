/**
 * Mobile composer Singularity dispatch (#526) — asserts the MOBILE registry
 * routes a Singularity task's composer to its bespoke terminal skin (distinct
 * from the desktop archetype), while other slugs fall through to the Default
 * mobile composer.
 */
import { describe, it, expect } from 'vitest'
import { pickVariant } from '../../../../utils/factionDispatch'
import { MOBILE_ARCHETYPE_BY_SLUG } from '../../../EditPraxis'
import DefaultMobileEditPraxis from '../DefaultEditPraxis'
import SingularityMobileEditPraxis from '../SingularityComposer'
import SingularityDesktopEditPraxis from '../../archetypes/SingularityEditPraxis'

describe('mobile composer Singularity dispatch', () => {
  it('resolves singularity to the bespoke terminal mobile composer', () => {
    const skin = pickVariant(MOBILE_ARCHETYPE_BY_SLUG, 'singularity', DefaultMobileEditPraxis)
    expect(skin).toBe(SingularityMobileEditPraxis)
    expect(skin).not.toBe(SingularityDesktopEditPraxis)
  })

  it('falls through to the Default mobile composer for other slugs', () => {
    for (const slug of ['na', 'snide', null]) {
      expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, slug, DefaultMobileEditPraxis)).toBe(DefaultMobileEditPraxis)
    }
  })
})

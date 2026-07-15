/**
 * Mobile composer Albescent dispatch (#528). Asserts the mobile registry resolves
 * an `albescent` task to the Record's "File an Account" composer, and that every
 * other faction falls through to the Default mobile composer.
 */
import { describe, it, expect } from 'vitest'
import { MOBILE_ARCHETYPE_BY_SLUG } from '../../../EditPraxis'
import { pickVariant } from '../../../../utils/factionDispatch'
import DefaultMobileEditPraxis from '../DefaultEditPraxis'
import AlbescentMobileEditPraxis from '../AlbescentComposer'

describe('mobile composer Albescent dispatch', () => {
  it('mobile + an Albescent task resolves to the bespoke Albescent composer', () => {
    expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, 'albescent', DefaultMobileEditPraxis)).toBe(
      AlbescentMobileEditPraxis,
    )
  })

  it('mobile + any other slug falls through to the Default composer', () => {
    for (const slug of ['snide', 'wow', 'na', null]) {
      expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, slug, DefaultMobileEditPraxis)).not.toBe(
        AlbescentMobileEditPraxis,
      )
    }
  })
})

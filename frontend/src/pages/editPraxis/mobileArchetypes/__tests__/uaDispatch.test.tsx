/**
 * Mobile composer UA dispatch (#525). Asserts the mobile registry resolves a `ua`
 * task to the gilt-salon "Submit to the Salon" composer, and that every other
 * faction falls through to the Default mobile composer.
 */
import { describe, it, expect } from 'vitest'
import { MOBILE_ARCHETYPE_BY_SLUG } from '../../../EditPraxis'
import { pickVariant } from '../../../../utils/factionDispatch'
import DefaultMobileEditPraxis from '../DefaultEditPraxis'
import UAMobileEditPraxis from '../UaComposer'
import SnideMobileEditPraxis from '../SnideComposer'

describe('mobile composer UA dispatch', () => {
  it('mobile + a UA task resolves to the bespoke UA composer', () => {
    expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, 'ua', DefaultMobileEditPraxis)).toBe(
      UAMobileEditPraxis,
    )
  })

  it('mobile + a S.N.I.D.E. task resolves to the bespoke SNIDE composer', () => {
    expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, 'snide', DefaultMobileEditPraxis)).toBe(
      SnideMobileEditPraxis,
    )
  })

  it('mobile + any other slug falls through to the Default composer', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, slug, DefaultMobileEditPraxis)).toBe(
        DefaultMobileEditPraxis,
      )
    }
  })
})

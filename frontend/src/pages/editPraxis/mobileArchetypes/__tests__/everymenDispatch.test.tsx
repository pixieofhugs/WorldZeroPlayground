/**
 * Mobile composer Everymen dispatch (#529). Asserts the mobile registry resolves
 * an `everymen` task to the union "Stamp & File" composer, and that every other
 * faction falls through to the Default mobile composer.
 */
import { describe, it, expect } from 'vitest'
import { pickVariant } from '../../../../utils/factionDispatch'
import { surfaceMap } from '../../../../factions'
import DefaultMobileEditPraxis from '../DefaultEditPraxis'
import EverymenMobileEditPraxis from '../EverymenComposer'

describe('mobile composer Everymen dispatch', () => {
  it('mobile + an Everymen task resolves to the bespoke Everymen composer', () => {
    expect(pickVariant(surfaceMap('mobileEditPraxis'), 'everymen', DefaultMobileEditPraxis)).toBe(
      EverymenMobileEditPraxis,
    )
  })

  it('mobile + any other slug falls through to the Default composer', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(surfaceMap('mobileEditPraxis'), slug, DefaultMobileEditPraxis)).not.toBe(
        EverymenMobileEditPraxis,
      )
    }
  })
})

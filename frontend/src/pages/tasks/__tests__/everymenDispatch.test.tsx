/**
 * Mobile task-browse Everymen dispatch (#529). The browse page dispatches on the
 * VIEWING life's faction; this asserts an `everymen` viewer resolves to the union
 * jobs-board skin while every other viewer (and logged-out null) falls through to
 * the Default mobile browse skin.
 */
import { describe, it, expect } from 'vitest'
import { MOBILE_ARCHETYPE_BY_SLUG } from '../../Tasks'
import { pickVariant } from '../../../utils/factionDispatch'
import DefaultTasks from '../mobileArchetypes/DefaultTasks'
import EverymenTaskList from '../mobileArchetypes/EverymenTaskList'

describe('mobile task-browse Everymen dispatch', () => {
  it('mobile + an Everymen viewer resolves to the bespoke Everymen browse skin', () => {
    expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, 'everymen', DefaultTasks)).toBe(EverymenTaskList)
  })

  it('mobile + any other viewer falls through to the Default browse skin', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, slug, DefaultTasks)).toBe(DefaultTasks)
    }
  })
})

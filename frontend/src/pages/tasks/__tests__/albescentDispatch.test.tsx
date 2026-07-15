/**
 * Mobile task-browse Albescent dispatch (#528). The browse page dispatches on the
 * VIEWING life's faction; this asserts an `albescent` viewer resolves to the
 * Record's Ledger browse skin while every other viewer (and logged-out null)
 * falls through to the Default mobile browse skin.
 */
import { describe, it, expect } from 'vitest'
import { MOBILE_ARCHETYPE_BY_SLUG } from '../../Tasks'
import { pickVariant } from '../../../utils/factionDispatch'
import DefaultTasks from '../mobileArchetypes/DefaultTasks'
import AlbescentTaskList from '../mobileArchetypes/AlbescentTaskList'

describe('mobile task-browse Albescent dispatch', () => {
  it('mobile + an Albescent viewer resolves to the bespoke Albescent browse skin', () => {
    expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, 'albescent', DefaultTasks)).toBe(AlbescentTaskList)
  })

  it('mobile + any other viewer falls through to the Default browse skin', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, slug, DefaultTasks)).toBe(DefaultTasks)
    }
  })
})

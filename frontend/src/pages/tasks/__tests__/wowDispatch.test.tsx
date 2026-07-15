/**
 * Mobile task-browse WOW dispatch (#531). The browse page shows every faction's
 * tasks, so — unlike detail — it dispatches on the VIEWING life's faction. This
 * asserts a `wow` viewer resolves to the scrapbook quest-board browse skin while
 * every other viewer (and logged-out null) falls through to the Default mobile
 * browse skin.
 */
import { describe, it, expect } from 'vitest'
import { MOBILE_ARCHETYPE_BY_SLUG } from '../../Tasks'
import { pickVariant } from '../../../utils/factionDispatch'
import DefaultTasks from '../mobileArchetypes/DefaultTasks'
import WowTaskList from '../mobileArchetypes/WowTaskList'

describe('mobile task-browse WOW dispatch', () => {
  it('mobile + a WOW viewer resolves to the bespoke WOW browse skin', () => {
    expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, 'wow', DefaultTasks)).toBe(WowTaskList)
  })

  it('mobile + any other viewer falls through to the Default browse skin', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(pickVariant(MOBILE_ARCHETYPE_BY_SLUG, slug, DefaultTasks)).toBe(DefaultTasks)
    }
  })
})

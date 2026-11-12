/**
 * The hand-off's destination (#1861, SPEC-onboarding § The hand-off), as a pure
 * function. It follows the server-derived `task.start_here`; nothing here may
 * know a level, title or faction.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { aTask } from '../../test/fixtures'

vi.mock('../../api/tasks', () => ({ listTasks: vi.fn() }))

import { listTasks } from '../../api/tasks'
import {
  HANDOFF_PAGE_SIZE,
  handoffDestination,
  resolveHandoffDestination,
  startHereTask,
} from '../onboardingHandoff'

/** The board a brand-new character sees: their marked task among ordinary ones. */
const MARKED = aTask({ id: 42, level_required: 0, start_here: true })
const ORDINARY = aTask({ id: 7 })
const ALSO_ORDINARY = aTask({ id: 9 })

beforeEach(() => {
  vi.mocked(listTasks).mockReset()
})

describe('the hand-off destination', () => {
  it('lands a brand-new character on their marked task, not on the fallback', () => {
    expect(
      handoffDestination([ORDINARY, MARKED, ALSO_ORDINARY], '/characters/3'),
    ).toBe('/tasks/42')
  })

  it('leaves a character with nothing marked exactly where they were going', () => {
    // Every character who already completed the onboarding task.
    expect(handoffDestination([ORDINARY, ALSO_ORDINARY], '/characters/3')).toBe(
      '/characters/3',
    )
  })

  it('never claims — the destination is a task PAGE, not a signup', () => {
    // A claim would use a task-bank slot (`max_task_signups`).
    expect(handoffDestination([MARKED], '/')).toBe(`/tasks/${MARKED.id}`)
  })

  it('reads the mark, not the position — the first row is not the answer', () => {
    expect(startHereTask([ORDINARY, MARKED])).toBe(MARKED)
    expect(startHereTask([ORDINARY, ALSO_ORDINARY])).toBeUndefined()
  })
})

describe('resolving the destination against the server', () => {
  it('asks for the level-sorted page and returns the marked task', async () => {
    vi.mocked(listTasks).mockResolvedValue([ORDINARY, MARKED])

    await expect(resolveHandoffDestination('/characters/3')).resolves.toBe('/tasks/42')
    expect(listTasks).toHaveBeenCalledWith({ sort: 'level', limit: HANDOFF_PAGE_SIZE })
  })

  it('falls back rather than throwing, so a failed read cannot strand anyone', async () => {
    // The swallow is deliberate: a dead form is worse than the fallback.
    vi.mocked(listTasks).mockRejectedValue(new Error('offline'))

    await expect(resolveHandoffDestination('/characters/3')).resolves.toBe(
      '/characters/3',
    )
  })
})

/**
 * The hand-off's destination (#1861, SPEC-onboarding § The hand-off).
 *
 * THE SEAM IS `handoffDestination`, not a rendered redirect. The harness is
 * `renderToStaticMarkup` — no DOM, effects never run — so a destination decided
 * inside `useCreateCharacter`'s submit handler could not be driven by a test at
 * all. Lifting the choice into a pure function is what makes the rule testable,
 * and the hook then has nothing left to get wrong but the call.
 *
 * What is pinned here is the DERIVATION, not a flag: the destination follows
 * `task.start_here`, which the server derives from the character's own praxis
 * history. Nothing in these tests knows a level, a title or a faction, because
 * nothing in the implementation may either.
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
    // The other half, and the one that keeps the change narrow: this is every
    // character who has already completed the onboarding task. Without it the
    // hand-off would be a redirect for everyone.
    expect(handoffDestination([ORDINARY, ALSO_ORDINARY], '/characters/3')).toBe(
      '/characters/3',
    )
  })

  it('never claims — the destination is a task PAGE, not a signup', () => {
    // A claim enters the task bank (`max_task_signups`) and unwinding it means
    // finding the withdraw path on day one, so the flow only ever navigates.
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
    // Stranding someone on a dead form the moment they finish making a
    // character is worse than landing them on the fallback, so the swallow is
    // deliberate and this is what says so.
    vi.mocked(listTasks).mockRejectedValue(new Error('offline'))

    await expect(resolveHandoffDestination('/characters/3')).resolves.toBe(
      '/characters/3',
    )
  })
})

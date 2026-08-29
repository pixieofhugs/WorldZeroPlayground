/**
 * What a collaboration fixture is, checked in a PR (#2888).
 *
 * The task-selection rules below were previously three lines inside
 * `e2e/collaboration.spec.ts` typed `t: any`, reachable only by a nightly that
 * has never been green (#2453). They decide which task every collab test runs
 * against, so getting one wrong re-skins every control the suite presses.
 */
import { describe, it, expect } from 'vitest'
import { aTask } from '../../test/fixtures'
import {
  MULTI_INVITE_LEVEL,
  bothSubmit,
  seedCollabDraft,
  seedPendingInvites,
  selectDistinctTasks,
  selectOpenTask,
} from '../collabScenario'
import { FAKE_API, fakeScenario, ok, routerFor } from './fakeScenario'

describe('selectOpenTask', () => {
  it('takes the first task that gates on no level at all', () => {
    const open = aTask({ id: 2, level_required: 0, title: 'Sweep The Stoop' })
    expect(selectOpenTask([aTask({ id: 1, level_required: 3 }), open, aTask({ id: 3, level_required: 0 })])).toBe(open)
  })

  it('names the seeder when the DB has nothing a new player may attempt', () => {
    // Era 1 declares no tasks (#1398), so an unseeded DB lands here — and this
    // message is the only thing that says so.
    expect(() => selectOpenTask([aTask({ level_required: 1 })])).toThrow(/seed\.py/)
  })
})

describe('selectDistinctTasks', () => {
  it('skips repeated titles, because the assertion downstream is on a title', () => {
    const tasks = [
      aTask({ id: 1, title: 'Sweep The Stoop', level_required: 0 }),
      aTask({ id: 2, title: 'Sweep The Stoop', level_required: 0 }),
      aTask({ id: 3, title: 'Photosynthesis', level_required: 0 }),
    ]
    expect(selectDistinctTasks(tasks, 2).map((task) => task.id)).toEqual([1, 3])
  })

  it('skips tasks the fixture character could not sign up for', () => {
    const tasks = [
      aTask({ id: 1, title: 'Too High', level_required: MULTI_INVITE_LEVEL + 1 }),
      aTask({ id: 2, title: 'Just Right', level_required: MULTI_INVITE_LEVEL }),
    ]
    expect(selectDistinctTasks(tasks, 1).map((task) => task.id)).toEqual([2])
  })

  it('says how many it found when there are not enough', () => {
    expect(() => selectDistinctTasks([aTask({ id: 1, level_required: 0 })], 6)).toThrow(
      /need 6 distinct seeded tasks .* found 1/,
    )
  })
})

describe('seedCollabDraft', () => {
  it('creates, invites and accepts — the accept on the INVITEE cookie jar', async () => {
    const backend = routerFor([aTask({ id: 5, level_required: 0 })])
    // A known invite id, so the accept can be checked against the id the INVITE
    // returned rather than against the praxis id it is nested under.
    const fake = fakeScenario((call) =>
      call.url.endsWith('/invite') ? ok({ id: 77, status: 'pending' }) : backend(call),
    )
    const draft = await seedCollabDraft(fake.scenario, 'life')

    const writes = fake.calls.filter((call) => call.method === 'POST' && !call.url.includes('dev-login'))
    expect(writes.map((call) => call.url.replace(FAKE_API, ''))).toEqual([
      '/praxes',
      `/praxes/${draft.praxisId}/invite`,
      `/praxes/${draft.praxisId}/invite/77/respond`,
    ])
    expect(writes[0].data).toMatchObject({ task_id: 5, type: 'collab', title: 'Collab life' })
    expect(writes[1].data).toEqual({ invitee_id: draft.invitee.characterId })
    expect(writes[2].data).toEqual({ accept: true })
    // The accept must come from the invitee. Accepting on the creator's cookies
    // is a 4xx the old fixture would have reported as "invite failed".
    expect(writes[2].context).toBe(draft.invitee.ctx.index)
    expect(writes[1].context).toBe(draft.creator.ctx.index)
  })

  it('seeds the creator at the collab level and the invitee below it', async () => {
    const fake = fakeScenario(routerFor([aTask({ id: 5, level_required: 0 })]))
    await seedCollabDraft(fake.scenario, 'levels')

    const levels = fake.calls
      .filter((call) => call.url.includes('dev-login'))
      .map((call) => new URL(call.url).searchParams.get('level'))
    // Creation is gated on era.collaboration_level_required; joining is not.
    expect(levels).toEqual(['1', '0'])
  })
})

describe('bothSubmit', () => {
  it('submits as each member and returns the status of the LAST one', async () => {
    // Consensus seals on the last submit, so the first submit's status is
    // still `in_progress` — returning it would assert the wrong beat.
    let submits = 0
    const fake = fakeScenario((call) => {
      if (call.url.endsWith('/submit')) {
        submits += 1
        return ok({ id: 1, status: submits === 1 ? 'in_progress' : 'submitted' })
      }
      return routerFor([aTask({ id: 5, level_required: 0 })])(call)
    })
    const draft = await seedCollabDraft(fake.scenario, 'seal')

    expect(await bothSubmit(draft)).toBe('submitted')
    const posts = fake.calls.filter((call) => call.url.endsWith('/submit'))
    expect(posts.map((call) => call.context)).toEqual([
      draft.creator.ctx.index,
      draft.invitee.ctx.index,
    ])
  })
})

describe('seedPendingInvites', () => {
  it('issues one collab per distinct task, oldest first, all to one invitee', async () => {
    const tasks = Array.from({ length: 8 }, (_, index) =>
      aTask({ id: index + 1, title: `Task ${index}`, level_required: 0 }),
    )
    const fake = fakeScenario(routerFor(tasks))
    const seeded = await seedPendingInvites(fake.scenario, 6)

    expect(seeded.tasks.map((task) => task.id)).toEqual([1, 2, 3, 4, 5, 6])
    const invites = fake.calls.filter((call) => call.url.endsWith('/invite'))
    expect(invites).toHaveLength(6)
    expect(new Set(invites.map((call) => JSON.stringify(call.data))).size).toBe(1)
    const created = fake.calls.filter((call) => call.url.endsWith('/praxes'))
    // One praxis per task: a character may hold only one active praxis per task.
    expect(created.map((call) => (call.data as { task_id: number }).task_id)).toEqual([
      1, 2, 3, 4, 5, 6,
    ])
  })
})

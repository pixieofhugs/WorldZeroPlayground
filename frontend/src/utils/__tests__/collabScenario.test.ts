/** Collab e2e fixture logic, checked in a PR (#2888): it picks every collab test's task. */
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
    // Era 1 declares no tasks (#1398): an unseeded DB lands here.
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
    // Known invite id, distinct from the praxis id.
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
    // Accepting on the creator's cookies would 4xx.
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
    // Consensus seals on the last submit.
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
    // One active praxis per task per character.
    expect(created.map((call) => (call.data as { task_id: number }).task_id)).toEqual([
      1, 2, 3, 4, 5, 6,
    ])
  })
})

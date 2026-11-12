/**
 * Collaboration fixture decisions for `e2e/collaboration.spec.ts` (#2888), here
 * so tsc/eslint/vitest reach them. Never imports `@playwright/test` (see
 * `e2eScenario.ts`). UI clicks stay in the spec, where `e2eAnchors.test.ts`
 * guards their `data-testid`s.
 */
import type { PraxisOut } from '../api/praxis'
import type { TaskOut } from '../api/tasks'
import {
  createPraxis,
  fetchTasks,
  invite,
  loginPlayer,
  respondToInvite,
  submitPraxis,
  type E2EContext,
  type Player,
  type Scenario,
} from './e2eScenario'

/** Collab creation gates on `era.collaboration_level_required` (era_1.py). */
export const COLLAB_CREATOR_LEVEL = 1

/** Joining a collab has no level gate. */
export const COLLAB_INVITEE_LEVEL = 0

/** The multi-invite inviter's level, and the ceiling on the tasks it picks. */
export const MULTI_INVITE_LEVEL = 8

/** The first task, in API order, that a level-0 character may attempt. */
export function selectOpenTask(tasks: readonly TaskOut[]): TaskOut {
  const task = tasks.find((candidate) => candidate.level_required === 0)
  if (!task) {
    throw new Error('no level-0 task in the seeded DB — run backend/seed.py')
  }
  return task
}

/**
 * The first `count` tasks a `MULTI_INVITE_LEVEL` character may attempt, with
 * distinct TITLES: the spec asserts titles, and the seed repeats some.
 */
export function selectDistinctTasks(tasks: readonly TaskOut[], count: number): TaskOut[] {
  const seen = new Set<string>()
  const usable: TaskOut[] = []
  for (const task of tasks) {
    if (task.level_required > MULTI_INVITE_LEVEL) continue
    if (seen.has(task.title)) continue
    seen.add(task.title)
    usable.push(task)
    if (usable.length === count) break
  }
  if (usable.length < count) {
    throw new Error(
      `need ${count} distinct seeded tasks at level <= ${MULTI_INVITE_LEVEL}, found ` +
        `${usable.length} — run backend/seed.py`,
    )
  }
  return usable
}

/** A collab draft two characters have both joined, still `in_progress`. */
export interface CollabDraft<Ctx extends E2EContext> {
  readonly creator: Player<Ctx>
  readonly invitee: Player<Ctx>
  readonly task: TaskOut
  readonly praxisId: number
}

/**
 * Seed a collab draft: create on the first open task, invite, accept. The body
 * is set at create time: otherwise it is written over a WebSocket CRDT
 * (`PUT /praxes/{id}` is gone, #1743).
 */
export async function seedCollabDraft<Ctx extends E2EContext>(
  scenario: Scenario<Ctx>,
  suffix: string,
): Promise<CollabDraft<Ctx>> {
  const creator = await loginPlayer(scenario, 'a', COLLAB_CREATOR_LEVEL)
  const invitee = await loginPlayer(scenario, 'b', COLLAB_INVITEE_LEVEL)
  const task = selectOpenTask(await fetchTasks(creator))

  const praxis = await createPraxis(creator, {
    task_id: task.id,
    type: 'collab',
    title: `Collab ${suffix}`,
    body_text: 'draft',
  })
  const pending = await invite(creator, praxis.id, invitee.characterId)
  await respondToInvite(invitee, praxis.id, pending.id, true)

  return { creator, invitee, task, praxisId: praxis.id }
}

/** Both members submit; returns the status after the last (sealing) submit. */
export async function bothSubmit<Ctx extends E2EContext>(
  draft: CollabDraft<Ctx>,
): Promise<PraxisOut['status']> {
  await submitPraxis(draft.creator, draft.praxisId)
  const last = await submitPraxis(draft.invitee, draft.praxisId)
  return last.status
}

/** One character holding `count` pending collab invites, oldest first. */
export interface PendingInvites<Ctx extends E2EContext> {
  readonly inviter: Player<Ctx>
  readonly invitee: Player<Ctx>
  /** The tasks invited on, in the order the invites were issued. */
  readonly tasks: readonly TaskOut[]
}

/**
 * Seed `count` pending invites to one character, one task each (one active
 * praxis per task). Oldest first: the inbox's limit-5 assertion depends on it.
 */
export async function seedPendingInvites<Ctx extends E2EContext>(
  scenario: Scenario<Ctx>,
  count: number,
): Promise<PendingInvites<Ctx>> {
  const inviter = await loginPlayer(scenario, 'ci', MULTI_INVITE_LEVEL)
  const invitee = await loginPlayer(scenario, 'cb', COLLAB_INVITEE_LEVEL)
  const tasks = selectDistinctTasks(await fetchTasks(inviter), count)

  for (const task of tasks) {
    const praxis = await createPraxis(inviter, {
      task_id: task.id,
      type: 'collab',
      title: `Invites ${task.id}`,
      body_text: 'draft',
    })
    await invite(inviter, praxis.id, invitee.characterId)
  }

  return { inviter, invitee, tasks }
}

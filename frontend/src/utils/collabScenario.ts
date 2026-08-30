/**
 * What a collaboration fixture IS (#2888, finishing #1780 for the lifecycle
 * specs). `e2e/collaboration.spec.ts` acquires pages and asserts; every
 * decision it used to embed — which task qualifies, who is seeded at what
 * level, what sequence of calls constitutes "a collab draft two people have
 * joined" — lives here, where `tsc --noEmit`, `eslint src` and vitest reach it
 * in a PR rather than a browser reaching it at 3am.
 *
 * NOTHING HERE IMPORTS `@playwright/test`, and nothing here may — see
 * `e2eScenario.ts` for the port that makes that possible, and for why every
 * response is read as the app's own generated contract instead of `any`.
 *
 * The UI actions stay in the spec: a clicked button is acquisition, and the
 * `data-testid` slots those clicks name are guarded from `frontend/e2e/` by
 * `src/__tests__/e2eAnchors.test.ts`. Moving them here would take them out of
 * that guard's sight.
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

/**
 * Collab CREATION is gated on `era.collaboration_level_required` (1 in Era 1,
 * `backend/eras/era_1.py`), so the creator is seeded at that level and the
 * invitee — who only joins — needs none.
 */
export const COLLAB_CREATOR_LEVEL = 1

/** The invitee level: joining a collab has no level gate at all. */
export const COLLAB_INVITEE_LEVEL = 0

/**
 * The level the multi-invite fixture's inviter is seeded at, and the ceiling on
 * the tasks it may pick. One number for both: an inviter must be able to sign
 * up for every task the fixture hands them.
 */
export const MULTI_INVITE_LEVEL = 8

/**
 * The first task any level-0 character may attempt.
 *
 * `level_required` is a plain number on `TaskOut` (never null), so this is the
 * whole rule: the first task the API lists that gates on nothing. It takes the
 * API's own order rather than searching, because "the first open task" is what
 * a new player meets and what the specs' sign-up steps drive.
 */
export function selectOpenTask(tasks: readonly TaskOut[]): TaskOut {
  const task = tasks.find((candidate) => candidate.level_required === 0)
  if (!task) {
    throw new Error('no level-0 task in the seeded DB — run backend/seed.py')
  }
  return task
}

/**
 * The first `count` tasks with DISTINCT titles that a `MULTI_INVITE_LEVEL`
 * character may attempt.
 *
 * Distinct titles, not distinct ids: the test that needs this asserts a task
 * TITLE is on screen, and the seed carries repeated titles across factions —
 * two tasks named alike would make that assertion pass on the wrong one.
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
 * Seed a collab draft: the creator makes a collab praxis on the first open
 * task, invites the second player, and that player accepts.
 *
 * `suffix` keeps one test's praxis title distinct from another's. The body is
 * written at CREATE time on purpose: a praxis body is otherwise written in its
 * room over a WebSocket CRDT, which this scaffolding has no way to drive
 * (`PUT /praxes/{id}` is gone — #1743).
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

/**
 * Both members submit; consensus seals the praxis on the LAST submit, so the
 * status this returns is the one the caller asserts on.
 */
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
 * Seed `count` pending invites to ONE character, one per distinct task.
 *
 * One collab per task, because a character may hold only one active praxis on
 * a task — six invites therefore need six tasks. Issued oldest first, which is
 * what the assertion about the requests inbox's limit-5 fetch turns on.
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

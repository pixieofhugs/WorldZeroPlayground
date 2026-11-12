/**
 * Duel fixture decisions (#2888), kept PR-reachable; never import
 * `@playwright/test` (see `e2eScenario.ts`). UI actions stay in
 * `e2e/duel.helpers.ts`, their testids guarded by `src/__tests__/e2eAnchors.test.ts`.
 */
import type { TaskOut } from '../api/tasks'
import {
  createPraxis,
  fetchTasks,
  loginPlayer,
  type E2EContext,
  type Player,
  type Scenario,
} from './e2eScenario'

/** `era.duel_level_required` in `backend/eras/era_1.py`; below it the duel chip does not render. */
export const DUEL_LEVEL = 2

/**
 * Cross-faction sentinel (`faction_slugs.py`), the only slug every era must
 * carry. Tasks wearing it render Default archetypes, so duel fixtures skip them.
 */
const CROSS_FACTION_SLUG = 'na'

/**
 * First duel-level task that drives a REAL faction skin. Selects on
 * properties, never a slug (#2710). Dev-seeded by
 * `seed.py::ensure_duel_fixture_task` (Era 1 declares no tasks).
 */
export function selectDuelTask(tasks: readonly TaskOut[]): TaskOut {
  const task = tasks.find(
    (candidate) =>
      candidate.level_required <= DUEL_LEVEL &&
      candidate.primary_faction_slug !== '' &&
      candidate.primary_faction_slug !== CROSS_FACTION_SLUG,
  )
  if (!task) {
    throw new Error(
      `no faction-skinned task at level <= ${DUEL_LEVEL} in the seeded DB — run ` +
        'backend/seed.py, which creates one for whichever faction the live era carries ' +
        '(seed.py::ensure_duel_fixture_task)',
    )
  }
  return task
}

/** Two duel-level characters, a faction task, and the challenger's draft. */
export interface DuelChallenge<Ctx extends E2EContext> {
  readonly challenger: Player<Ctx>
  readonly opponent: Player<Ctx>
  readonly task: TaskOut
  /** The solo draft the duel attaches to. */
  readonly challengerPraxisId: number
}

/**
 * Seed up to where the UI takes over; every duel action is a real click in the
 * spec (#953). `roles` must be distinct per spec file: they keep fixtures apart
 * if two workers' run ids agree.
 */
export async function seedDuelChallenge<Ctx extends E2EContext>(
  scenario: Scenario<Ctx>,
  roles: readonly [string, string],
  title: string,
): Promise<DuelChallenge<Ctx>> {
  const challenger = await loginPlayer(scenario, roles[0], DUEL_LEVEL)
  const opponent = await loginPlayer(scenario, roles[1], DUEL_LEVEL)
  const task = selectDuelTask(await fetchTasks(challenger))
  const draft = await createPraxis(challenger, {
    task_id: task.id,
    type: 'solo',
    title,
    body_text: 'draft',
  })
  return { challenger, opponent, task, challengerPraxisId: draft.id }
}

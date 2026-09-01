/**
 * What a duel fixture IS (#2888, finishing #1780 for the lifecycle specs).
 * `e2e/duel.spec.ts` and `e2e/duel-zzz-resolved.spec.ts` acquire pages and
 * assert; the decisions they used to embed in `duel.helpers.ts` — which task
 * drives a real faction skin, what level a challenger needs, what a seeded
 * challenge consists of — live here, where `tsc --noEmit`, `eslint src` and
 * vitest reach them in a PR.
 *
 * NOTHING HERE IMPORTS `@playwright/test`, and nothing here may — see
 * `e2eScenario.ts`. What stays in `duel.helpers.ts` is the UI actions
 * (challenge / accept / seal), which are clicks on real buttons: acquisition,
 * and the `data-testid` slots they name are guarded from `frontend/e2e/` by
 * `src/__tests__/e2eAnchors.test.ts`.
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

/**
 * Duels are gated on `era.duel_level_required` (2 in Era 1,
 * `backend/eras/era_1.py`), so both sides are seeded at that level — below it
 * the composer's duel mode chip does not render at all.
 */
export const DUEL_LEVEL = 2

/**
 * The cross-faction sentinel: a task belonging to no faction
 * (`faction_slugs.py`). The only slug this module may rely on existing,
 * because it is the one an era is structurally required to carry — it is the
 * FK target for cross-faction tasks. The onboarding task and every
 * collaboration fixture task wear it, and they are exactly the tasks a duel
 * fixture must skip: they render the Default archetypes.
 */
const CROSS_FACTION_SLUG = 'na'

/**
 * The first task a duel-level challenger may attempt that drives a REAL
 * faction skin.
 *
 * Selects on properties, never on a slug (#2710): at or below the duel level,
 * so the challenger can sign up, and belonging to some faction, so the
 * composer, the seal dialog and the duel rail each dispatch to a real
 * archetype rather than the Default fall-through. Every faction's seal
 * dialog — WOW included — takes its heading and confirm label from the
 * shared `useDuelSealCopy` (#1909 deleted the last per-faction override), so
 * there is no faction this selector needs to steer around for copy reasons.
 *
 * The task itself is dev-seeded — `seed.py::ensure_duel_fixture_task`. Era 1
 * declares no tasks (#1398), so without that seeder this matches nothing and
 * the whole duel suite fails here.
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
  /** The challenger's solo draft — the praxis the duel gets attached to. */
  readonly challengerPraxisId: number
}

/**
 * Seed both sides of a duel up to the point the UI takes over: two accounts at
 * the duel level, a faction-skinned task, and the challenger's solo draft.
 *
 * The draft is API scaffolding, exactly as the collab fixture's praxis is —
 * every DUEL action (challenge, accept, seal) goes through a real clicked
 * button in the spec, so a missing control fails a test instead of passing
 * silently (#953/#954).
 *
 * `roles` are distinct per calling spec: Playwright runs each spec file in its
 * own worker, so the run id and the login sequence are per-file, and the role
 * code is what keeps two files' fixtures apart if their run ids ever agree.
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

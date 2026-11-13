/**
 * The #2077 surfaces paint no bare faction spine hue as TEXT, at the emitted
 * `color` seam (shared definition in `utils/__tests__/inkSeam.ts`).
 *
 * The lint rule `local/no-faction-hue-as-ink` can't see these: the hue arrives
 * via `surfaceMap` dispatch off `metatask_faction_slug`, across module boundaries.
 * Both halves are asserted — no hue ink, but the hue stays on fills — so
 * "strip the colour" can't pass.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import '../i18n'
import type { TaskOut } from '../api/tasks'
import type { TaskDetailState } from '../pages/taskDetail/useTaskDetail'
import { fillUses, inkOffenders } from '../utils/__tests__/inkSeam'
import { aTask } from '../test/fixtures'

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ user: null, character: null }),
}))
vi.mock('../auth/AdminModeContext', () => ({
  useAdminMode: () => ({ adminMode: false }),
}))

// Imported after the mocks are registered.
import TaskCard from '../components/taskCard/TaskCard'
import { surfaceMap } from '../factions'
import DefaultTaskDetail from '../pages/taskDetail/archetypes/DefaultTaskDetail'

function render(element: ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
}

/** Every slug with a card, a task-card skin or a detail archetype of its own. */
const SLUGS = [
  'ua',
  'everymen',
  'wow',
  'snide',
  'ephemerists',
  'singularity',
  'coven',
  'albescent',
  'na',
] as const

/** The hue that fails hardest today (2.19:1 in light) — a fixture, not the subject. */
const META_SLUG = 'ephemerists'

// ── The task card's metatask chip ──────────────────────────────────────────

describe("the task card's metatask byline paints no spine hue as text (#2077)", () => {
  for (const slug of SLUGS) {
    it(`${slug} card, ephemerists metatask: the chip's ink is not the hue`, () => {
      const task: TaskOut = aTask({
        task_type: 'metatask',
        primary_faction_slug: slug,
        metatask_faction_slug: META_SLUG,
        created_by_display_name: '',
      })
      const html = render(<TaskCard task={task} basePoints={task.point_value} />)
      expect(inkOffenders(html)).toEqual([])
      // The fill half lives on the dispatcher, not any skin.
      expect(fillUses(html).length).toBeGreaterThan(0)
    })
  }
})

// ── The eight task-detail bylines ──────────────────────────────────────────

const DETAIL_TASK = aTask({
  title: 'Reforestation',
  description: 'Mangrove',
  task_type: 'metatask',
  metatask_faction_slug: META_SLUG,
  created_by_display_name: '',
})

/** Every flag off; the byline is unconditional on `task_type === 'metatask'`. */
function detailState(task: TaskOut): TaskDetailState {
  return {
    loading: false,
    task,
    fetchError: null,
    submissions: [],
    comments: null,
    friends: new Set(),
    foes: new Set(),
    mySubmission: undefined,
    isInProgress: false,
    inProgressPraxisId: null,
    canSignUp: true,
    levelJumpSignup: false,
    slotsOpen: 13,
    maxTaskSlots: 17,
    basePoints: 30,
    factionMultiplier: 1.0,
    modifiedPoints: 30,
    inProgressCount: 0,
    topScore: 0,
    voteCount: 0,
    submissionSort: 'score',
    setSubmissionSort: () => {},
    sortedSubmissions: [],
    signupError: null,
    handleSignup: async () => {},
    handleDrop: async () => {},
    dropConfirm: null,
  }
}

// Registry plus the Default (`na`, ADR-0030), as `archetypeSlots.test.tsx` walks.
const DETAILS = { ...surfaceMap('taskDetail'), __default__: DefaultTaskDetail }

describe('every task-detail metatask byline reads its own surface (#2077)', () => {
  for (const [slug, Archetype] of Object.entries(DETAILS)) {
    it(`${slug}: the byline is not painted in the metatask faction's hue`, () => {
      const task: TaskOut = { ...DETAIL_TASK, primary_faction_slug: slug }
      const html = render(<Archetype state={detailState(task)} />)
      expect(inkOffenders(html)).toEqual([])
      // The META pill keeps the hue as an opaque fill with `-on-fill` ink.
      expect(html, 'the META pill is still there').toContain('style=')
    })
  }

  it('walks all eight archetypes plus the na fallback, not the three the report named', () => {
    expect(Object.keys(DETAILS).length).toBeGreaterThanOrEqual(9)
  })
})

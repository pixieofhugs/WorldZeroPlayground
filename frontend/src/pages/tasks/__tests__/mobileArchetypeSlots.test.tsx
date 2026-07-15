/**
 * Mobile task-browse slot invariant — the browse twin of the task-detail
 * mobileArchetypeSlots test. Walks MOBILE_ARCHETYPE_BY_SLUG plus the Default
 * mobile browse skin and asserts each emits the invariant browse slots
 * (scannable task cards with title, points and a /tasks/:id link, plus the
 * touch-native status/faction/level filter chip rows). Also proves the rendered
 * set is driven by the shared hook's `tasks` — swapping the filtered array
 * swaps the cards. The registry is empty today, so this mainly guards the
 * Default fallback and any bespoke browse skin added later.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so shared copy keys resolve to English text.
import '../../../i18n'
import { MOBILE_ARCHETYPE_BY_SLUG } from '../../Tasks'
import DefaultTasks from '../mobileArchetypes/DefaultTasks'
import type { TasksState } from '../useTasks'
import type { TaskOut } from '../../../api/tasks'

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

function task(overrides: Partial<TaskOut>): TaskOut {
  return {
    id: 11,
    title: 'Plant a tree',
    description: 'Dig a hole and plant a native sapling.',
    point_value: 20,
    level_required: 2,
    status: 'active',
    task_type: 'standard',
    created_by: 1,
    primary_faction_slug: 'everymen',
    metatask_faction_slug: null,
    is_task_vision_eligible: false,
    created_at: '2026-01-01T00:00:00Z',
    can_submit_praxis: true,
    allowed_modes: ['solo'],
    eligible_for_current_user: true,
    ...overrides,
  }
}

const TASK_A = task({ id: 11, title: 'Plant a tree', primary_faction_slug: 'everymen' })
const TASK_B = task({ id: 22, title: 'Map a hidden gap', primary_faction_slug: 'snide', point_value: 40 })

function baseState(overrides: Partial<TasksState>): TasksState {
  return {
    user: null,
    tasks: [TASK_A, TASK_B],
    loading: false,
    error: null,
    factions: [{ slug: 'everymen' }, { slug: 'snide' }, { slug: 'wow' }],
    factionConfigs: [],
    levelFilters: [0, 1, 2, 3, 4, 5],
    statusFilters: ['All', 'active'],
    status: 'All',
    setStatus: () => {},
    faction: '',
    setFaction: () => {},
    level: '',
    setLevel: () => {},
    signupMsg: null,
    handleSignup: async () => {},
    displayPointsFor: (t) => t.point_value,
    ...overrides,
  }
}

const archetypes = { ...MOBILE_ARCHETYPE_BY_SLUG, __default__: DefaultTasks }

describe('mobile task-browse content-slot invariant', () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} renders scannable cards with title, points + detail link`, () => {
      const { html, text } = render(<Archetype state={baseState({})} />)
      expect(text, 'title slot').toContain('Plant a tree')
      expect(text, 'points slot').toContain('+20 pts')
      expect(html, 'detail-link slot').toContain('href="/tasks/11"')
    })

    it(`${slug} renders the touch-native status/faction/level filter chips`, () => {
      const { text } = render(<Archetype state={baseState({})} />)
      const lower = text.toLowerCase()
      expect(lower, 'status filter').toContain('status:')
      expect(lower, 'faction filter').toContain('faction:')
      expect(lower, 'level filter').toContain('level:')
    })

    it(`${slug} renders the empty state when no tasks match`, () => {
      const { text } = render(<Archetype state={baseState({ tasks: [] })} />)
      expect(text).toContain('No tasks match your filters.')
    })

    it(`${slug} renders exactly the task set the hook provides (filter → set)`, () => {
      // A filter change narrows the shared `tasks` array; the skin renders it verbatim.
      const narrowed = render(<Archetype state={baseState({ tasks: [TASK_A] })} />)
      expect(narrowed.text, 'kept card').toContain('Plant a tree')
      expect(narrowed.text, 'filtered-out card').not.toContain('Map a hidden gap')

      const widened = render(<Archetype state={baseState({ tasks: [TASK_A, TASK_B] })} />)
      expect(widened.text).toContain('Plant a tree')
      expect(widened.text).toContain('Map a hidden gap')
    })
  }
})

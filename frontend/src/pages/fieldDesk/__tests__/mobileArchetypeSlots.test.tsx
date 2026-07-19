/**
 * Mobile FieldDesk-home slot invariant — the home twin of the taskDetail
 * mobileArchetypeSlots test. Walks surfaceMap('mobileFieldDesk') plus the Default
 * mobile home and asserts each skin emits the invariant content slots from the
 * (hand-built) FieldDeskHomeState: character header (name + faction + level +
 * points), the Points/Votes/Era stat tiles, the active-tasks list, the empty
 * state, and the primary actions. Presentation-only — the skins take state, so
 * no hooks or network are involved.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { surfaceMap } from '../../../factions'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so shared copy keys resolve to English text.
import '../../../i18n'
import DefaultFieldDesk from '../mobileArchetypes/DefaultFieldDesk'
import type { FieldDeskHomeState } from '../useFieldDeskHome'
import type { CharacterOut } from '../../../api/auth'
import type { PraxisCardOut } from '../../../api/praxis'
import { factionName } from '../../../utils/factions'

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

const CHARACTER: CharacterOut = {
  id: 42,
  username: 'molly',
  display_name: 'Mollusk',
  bio: null,
  avatar_url: null,
  location: null,
  level: 4,
  score: 340,
  all_time_score: 900,
  faction_slug: 'wow',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
}

const ACTIVE_TASK: PraxisCardOut = {
  id: 55,
  task_id: 7,
  task_title: 'Sunday Soup',
  task_point_value: 30,
  task_level_required: 1,
  type: 'solo',
  status: 'in_progress',
  title: null,
  moderation_status: 'visible',
  created_by_id: 42,
  created_by_display_name: 'Mollusk',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  submitted_at: null,
  member_count: 1,
  score: 0,
  voter_count: 0,
  is_top_for_task: false,
  task_faction_slug: 'wow',
}

function baseState(overrides: Partial<FieldDeskHomeState> = {}): FieldDeskHomeState {
  return {
    character: CHARACTER,
    eraName: 'Era 3',
    votesReceived: 12,
    activeTasks: [ACTIVE_TASK],
    pendingCount: 2,
    loadingTasks: false,
    canProposeTask: true,
    ...overrides,
  }
}

const archetypes = { ...surfaceMap('mobileFieldDesk'), __default__: DefaultFieldDesk }

describe('mobile FieldDesk-home content-slot invariant', () => {
  for (const [slug, Skin] of Object.entries(archetypes)) {
    it(`${slug} renders the character header + stat tiles`, () => {
      const { html, text } = render(<Skin state={baseState()} />)
      expect(text, 'character name slot').toContain('Mollusk')
      expect(text, 'faction slot').toContain(factionName('wow'))
      expect(text, 'points/score slot').toContain('340')
      expect(text, 'votes slot').toContain('12')
      expect(text, 'era slot').toContain('Era 3')
      expect(html, 'profile link slot').toContain('href="/characters/42"')
      expect(html, 'edit link slot').toContain('href="/characters/42/edit"')
    })

    it(`${slug} renders the active-tasks list (continue link)`, () => {
      const { html, text } = render(<Skin state={baseState()} />)
      expect(text, 'active task title slot').toContain('Sunday Soup')
      expect(html, 'continue-in-progress slot').toContain('href="/praxes/55/edit"')
    })

    it(`${slug} renders the empty state when no active tasks`, () => {
      const { text } = render(<Skin state={baseState({ activeTasks: [] })} />)
      expect(text.toLowerCase(), 'empty-tasks slot').toContain('nothing in progress')
    })

    it(`${slug} renders the primary Browse Tasks action`, () => {
      const { html, text } = render(<Skin state={baseState()} />)
      expect(text.toLowerCase(), 'browse-tasks slot').toContain('browse tasks')
      expect(html, 'tasks link slot').toContain('href="/tasks"')
    })

    it(`${slug} shows the propose action only when permitted`, () => {
      const permitted = render(<Skin state={baseState({ canProposeTask: true })} />)
      expect(permitted.html, 'propose shown when permitted').toContain('href="/propose-task"')
      const denied = render(<Skin state={baseState({ canProposeTask: false })} />)
      expect(denied.html, 'propose hidden when not permitted').not.toContain('href="/propose-task"')
    })
  }
})

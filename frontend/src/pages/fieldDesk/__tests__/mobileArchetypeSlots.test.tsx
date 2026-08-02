/**
 * Mobile FieldDesk-home slot invariant — the home twin of the taskDetail
 * mobileArchetypeSlots test. Walks surfaceMap('mobileFieldDesk') plus the Default
 * mobile home and asserts each skin emits the invariant content slots from the
 * (hand-built) FieldDeskHomeState: the identity block (name + level + era
 * points + the level track + all-time), the active-tasks list, the empty state,
 * and the primary actions. Presentation-only — the skins take state, so no
 * hooks or network are involved.
 *
 * THE FACTION WORD AND THE VOTE COUNT ARE NOT SLOTS ANY MORE (#1553). The
 * identity block dropped "Unaffiliated · Level 4" down to "Level 4" (the art
 * already says the faction) and dropped the votes tile outright — a vote count
 * is an input, not an achievement. A faction assertion here would also have
 * passed for the wrong reason: every skin still names the faction on its
 * active-task rows.
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
  metatask_points: 0,
  display_multiplier: 1.0,
  points_from_votes: 0,
  is_top_for_task: false,
  task_faction_slug: 'wow',
}

function baseState(overrides: Partial<FieldDeskHomeState> = {}): FieldDeskHomeState {
  return {
    character: CHARACTER,
    eraName: 'Era 3',
    levelTrack: { nextLevel: 5, pointsToNext: 160, nextThreshold: 500, fillPercent: 68 },
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
    it(`${slug} renders the identity block`, () => {
      const { html, text } = render(<Skin state={baseState()} />)
      expect(text, 'character name slot').toContain('Mollusk')
      expect(text, 'level slot').toContain('Level 4')
      expect(text, 'points/score slot').toContain('340')
      expect(text, 'era slot').toContain('Era 3')
      expect(text, 'all-time slot').toContain('900')
      expect(html, 'profile link slot').toContain('href="/characters/42"')
      expect(html, 'edit link slot').toContain('href="/characters/42/edit"')
    })

    it(`${slug} renders the level track`, () => {
      const { html, text } = render(<Skin state={baseState()} />)
      expect(html, 'progress track slot').toContain('role="progressbar"')
      expect(html, 'fill width slot').toContain('width:68%')
      expect(text, 'to-next-level slot').toContain('160 to Level 5')
    })

    it(`${slug} holds the track back until the era curve lands`, () => {
      const { html, text } = render(<Skin state={baseState({ levelTrack: null })} />)
      expect(html, 'no progressbar without a target').not.toContain('role="progressbar"')
      expect(text, 'points figure still reads').toContain('340')
    })

    it(`${slug} renders the active-tasks list (continue link)`, () => {
      const { html, text } = render(<Skin state={baseState()} />)
      expect(text, 'active task title slot').toContain('Sunday Soup')
      expect(html, 'continue-in-progress slot').toContain('href="/praxis/55/edit"')
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

/**
 * Mobile FieldDesk-home UA dispatch + rendered identity (#525, #852).
 *
 * The registry half asserts the parallel mobile map resolves a `ua` carried life
 * to the UA home skin and that everything else falls through to Default. The
 * rendered half asserts the MARKUP the practice's home emits now the salon is
 * dead (#788): the ensō beside the day's line, the mandala at `texture` behind
 * the masthead only, and no gold anywhere.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so copy keys resolve to English text.
import '../../../i18n'
import { pickVariant } from '../../../utils/factionDispatch'
import { resolvedArchetype } from '../../../factions/lazyArchetype'
import { surfaceMap } from '../../../factions'
import DefaultFieldDesk from '../mobileArchetypes/DefaultFieldDesk'
import UaHome from '../mobileArchetypes/UaHome'
import type { FieldDeskHomeState } from '../useFieldDeskHome'
import type { CharacterOut } from '../../../api/auth'
import type { PraxisCardOut } from '../../../api/praxis'

const CHARACTER: CharacterOut = {
  id: 42,
  username: 'ada',
  display_name: 'Ada Reed',
  bio: null,
  avatar_url: null,
  location: null,
  level: 2,
  score: 340,
  all_time_score: 900,
  faction_slug: 'ua',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
}

const ACTIVE_TASK: PraxisCardOut = {
  id: 55,
  task_id: 7,
  task_title: 'Ten thumbnails before breakfast',
  task_point_value: 15,
  task_level_required: 1,
  type: 'solo',
  status: 'in_progress',
  title: null,
  moderation_status: 'visible',
  created_by_id: 42,
  created_by_display_name: 'Ada Reed',
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
  task_faction_slug: 'ua',
}

function baseState(overrides: Partial<FieldDeskHomeState> = {}): FieldDeskHomeState {
  return {
    character: CHARACTER,
    eraName: 'Era 1',
    votesReceived: 12,
    activeTasks: [ACTIVE_TASK],
    pendingCount: 0,
    loadingTasks: false,
    canProposeTask: true,
    ...overrides,
  }
}

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

describe('mobile FieldDesk-home UA dispatch', () => {
  it('mobile + a UA life resolves to the bespoke UA home skin', () => {
    expect(resolvedArchetype(pickVariant(surfaceMap('mobileFieldDesk'), 'ua', DefaultFieldDesk))).toBe(UaHome)
  })

  it('mobile + any other slug falls through to the Default home skin', () => {
    for (const slug of ['__unregistered__', 'na', null]) {
      expect(resolvedArchetype(pickVariant(surfaceMap('mobileFieldDesk'), slug, DefaultFieldDesk))).toBe(DefaultFieldDesk)
    }
  })
})

describe('UA mobile home — what it draws', () => {
  it('heads the screen with the ensō', () => {
    const { html } = render(<UaHome state={baseState()} />)
    // The one ensō (#908): the vendored brush drawing, painted through a mask.
    expect(html).toContain('/factionMarks/enso.webp')
    expect(html).toContain('var(--faction-ua-glow)')
  })

  it('runs the mandala behind the masthead only', () => {
    const { html } = render(<UaHome state={baseState()} />)
    // The mandala's outer guide circle; the ensō draws no such hairline stroke.
    expect(html.match(/stroke-width="0\.6"/g)).toHaveLength(1)
    expect(html).toContain('opacity:0.14')
  })

  it('keeps its slots: name, points, stat tiles, active work and both actions', () => {
    const { html, text } = render(<UaHome state={baseState()} />)
    expect(text).toContain('Ada Reed')
    expect(text).toContain('340')
    expect(text.toLowerCase()).toContain('era 1')
    expect(text).toContain('Ten thumbnails before breakfast')
    expect(html).toContain('href="/tasks"')
    expect(html).toContain('href="/propose-task"')
  })

  it('carries no gold: the legacy --ua-* palette and Cinzel are gone here', () => {
    const { html } = render(<UaHome state={baseState()} />)
    expect(html).not.toMatch(/--ua-(gold|gilt|paper|wall|line|ink|sub|muted|orange)/)
    expect(html).not.toMatch(/--font-faction-engraved/)
  })
})
